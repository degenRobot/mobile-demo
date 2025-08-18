# Porto Relay Integration Guide

## Overview

Porto is a gasless transaction relay for RISE blockchain that enables users to interact with smart contracts without paying gas fees.

## Key Endpoints

- **Production**: `https://rise-testnet-porto.fly.dev`
- **Chain ID**: 11155931 (RISE Testnet)
- **Account Implementation**: `0x912a428b1a7e7cb7bb2709a2799a01c020c5acd9` (delegation_implementation)
- **Orchestrator**: `0x046832405512d508b873e65174e51613291083bc`
- **Delegation Proxy**: `0xf463d5cbc64916caa2775a8e9b264f8c35f4b8a4`
- **Simulator**: `0x257573c74ff3579c0b1170b0c675aae88357f9e5`

⚠️ **Important**: These addresses MUST match the values in `external/porto-relay/relay.toml`

## API Methods

### 1. wallet_prepareUpgradeAccount

Prepares an EOA for delegation to Porto smart contract wallet.

**⚠️ CRITICAL: The `expiry` field MUST be a hex string (e.g., "0x68ca3815"), not an integer!**

#### Request Format

```javascript
{
  "jsonrpc": "2.0",
  "method": "wallet_prepareUpgradeAccount",
  "params": [{
    "address": "0x...",  // EOA address to upgrade
    "delegation": "0x912a428b1a7e7cb7bb2709a2799a01c020c5acd9",  // Porto implementation
    "capabilities": {
      "authorizeKeys": [{
        "expiry": "0x68ca3815",  // ⚠️ MUST be hex string!
        "prehash": false,
        "publicKey": "0x...",  // EOA address for secp256k1
        "role": "admin",  // "admin" or "normal"
        "type": "secp256k1",
        "permissions": []  // Empty for admin role
      }]
    },
    "chainId": 11155931  // Can be number or hex string
  }],
  "id": 1
}
```

#### Response

```javascript
{
  "result": {
    "capabilities": { /* echoed back */ },
    "chainId": "0xaa39db",
    "context": {
      "address": "0x...",
      "authorization": {
        "address": "0x6b0f89e0627364a3348277353e3776dc8612853f",
        "chainId": "0xaa39db",
        "nonce": "0x0"
      },
      "preCall": {
        "eoa": "0x...",
        "executionData": "0x...",
        "nonce": "0x0",
        "signature": "0x0"
      }
    },
    "digests": {
      "auth": "0x...",  // Sign this for authorization
      "exec": "0x..."   // Sign this for execution
    },
    "typedData": { /* EIP-712 data for exec signature */ }
  }
}
```

### 2. wallet_upgradeAccount

Executes the account upgrade after signing.

#### Request Format

```javascript
{
  "jsonrpc": "2.0",
  "method": "wallet_upgradeAccount",
  "params": [{
    "context": { /* from prepareUpgradeAccount */ },
    "signatures": {
      "auth": "0x...",  // Signature of auth digest
      "exec": "0x..."   // Signature of exec digest (or typedData)
    }
  }],
  "id": 2
}
```

### 3. wallet_prepareCalls

Prepares transaction calls for execution.

#### Request Format

```javascript
{
  "jsonrpc": "2.0",
  "method": "wallet_prepareCalls",
  "params": [{
    "calls": [{
      "to": "0x...",
      "data": "0x...",  // Encoded function call
      "value": "0x0"    // Value in hex
    }],
    "capabilities": {
      "meta": {
        "accounts": ["0x..."]  // Account addresses
      }
    },
    "chainId": 11155931,
    "from": "0x...",
    "key": {
      "type": "secp256k1",
      "publicKey": "0x...",  // EOA address
      "prehash": false
    }
  }],
  "id": 3
}
```

#### Response

```javascript
{
  "result": {
    "digest": "0x...",  // Sign this digest
    "context": {
      "quote": { /* gas estimation and pricing */ }
    },
    "typedData": { /* EIP-712 structured data */ },
    "key": { /* echoed back */ }
  }
}
```

### 4. wallet_sendPreparedCalls

Sends signed transaction to the relay.

#### Request Format

```javascript
{
  "jsonrpc": "2.0",
  "method": "wallet_sendPreparedCalls",
  "params": [{
    "context": { /* from prepareCalls */ },
    "key": { /* from prepareCalls */ },
    "signature": "0x..."  // Signed digest or typedData
  }],
  "id": 4
}
```

#### Response

```javascript
{
  "result": {
    "id": "0x..."  // Bundle/transaction ID
  }
}
```

### 5. wallet_getCallsStatus

Checks transaction status.

#### Request Format

```javascript
{
  "jsonrpc": "2.0",
  "method": "wallet_getCallsStatus",
  "params": ["0x..."],  // Bundle ID
  "id": 5
}
```

#### Response

```javascript
{
  "result": {
    "id": "0x...",
    "status": 200,  // 200 = success
    "receipts": [{
      "transactionHash": "0x...",
      "status": "0x1",  // 0x1 = success
      "blockNumber": "0x...",
      "gasUsed": "0x...",
      "logs": [...]
    }]
  }
}
```

## Complete Delegation Flow

### Step 1: Prepare Upgrade

```javascript
const prepareUpgrade = async (account) => {
  const expiry = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
  const expiryHex = '0x' + expiry.toString(16);  // ⚠️ MUST be hex!
  
  const params = {
    address: account.address,
    delegation: '0x912a428b1a7e7cb7bb2709a2799a01c020c5acd9',
    capabilities: {
      authorizeKeys: [{
        expiry: expiryHex,
        prehash: false,
        publicKey: account.address,
        role: 'admin',
        type: 'secp256k1',
        permissions: []
      }]
    },
    chainId: 11155931
  };
  
  const response = await fetch(PORTO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'wallet_prepareUpgradeAccount',
      params: [params],
      id: 1
    })
  });
  
  return (await response.json()).result;
};
```

### Step 2: Sign Digests

```javascript
const signUpgrade = async (account, prepareResult) => {
  // Sign auth digest directly
  const authSig = await account.signMessage({
    message: { raw: prepareResult.digests.auth }
  });
  
  // Sign exec using typed data
  const execSig = await account.signTypedData({
    domain: prepareResult.typedData.domain,
    types: prepareResult.typedData.types,
    primaryType: prepareResult.typedData.primaryType,
    message: prepareResult.typedData.message
  });
  
  return { auth: authSig, exec: execSig };
};
```

### Step 3: Execute Upgrade

```javascript
const executeUpgrade = async (context, signatures) => {
  const response = await fetch(PORTO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'wallet_upgradeAccount',
      params: [{
        context,
        signatures
      }],
      id: 2
    })
  });
  
  return (await response.json()).result;
};
```

## Transaction Flow (After Delegation)

### Step 1: Prepare Transaction

```javascript
const prepareTx = async (account, to, data, value = '0x0') => {
  const params = {
    calls: [{ to, data, value }],
    capabilities: {
      meta: { accounts: [account.address] }
    },
    chainId: 11155931,
    from: account.address,
    key: {
      type: 'secp256k1',
      publicKey: account.address,
      prehash: false
    }
  };
  
  const response = await fetch(PORTO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'wallet_prepareCalls',
      params: [params],
      id: 1
    })
  });
  
  return (await response.json()).result;
};
```

### Step 2: Sign and Send

```javascript
const sendTx = async (account, prepareResult) => {
  // Sign the typed data
  const signature = await account.signTypedData({
    domain: prepareResult.typedData.domain,
    types: prepareResult.typedData.types,
    primaryType: prepareResult.typedData.primaryType,
    message: prepareResult.typedData.message
  });
  
  const response = await fetch(PORTO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'wallet_sendPreparedCalls',
      params: [{
        context: prepareResult.context,
        key: prepareResult.key,
        signature
      }],
      id: 2
    })
  });
  
  return (await response.json()).result;
};
```

## Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| `0xfbcb0b34` | Account not delegated | Run delegation flow first |
| `-32602` | Invalid params | Check request format, ensure expiry is hex |
| `-32603` | Internal error | Check logs, retry request |

## Important Notes

1. **Expiry Format**: The `expiry` field in `authorizeKeys` MUST be a hex string (e.g., `"0x68ca3815"`), not a number
2. **Chain ID**: Can be either number (`11155931`) or hex string (`"0xaa39db"`)
3. **Public Key**: For secp256k1, use the EOA address as the public key
4. **Delegation**: Only needed once per account, then transactions are gasless
5. **Nonce**: Porto tracks nonces automatically, no need to manage manually

## Testing

Run the test scripts to verify integration:

```bash
# Test delegation flow
node tests/test-delegation-simple.js

# Test automatic delegation
node tests/test-auto-delegation.js
```

## Troubleshooting

### "Invalid params" error
- Check that `expiry` is a hex string
- Verify all required fields are present
- Ensure proper nesting of `authorizeKeys`

### Transaction fails with 0xfbcb0b34
- Account needs delegation
- Run the delegation flow first
- Check account bytecode to verify delegation

### "No quote found" error
- Ensure `context` from prepareCalls is passed correctly
- Don't modify the context object before sending