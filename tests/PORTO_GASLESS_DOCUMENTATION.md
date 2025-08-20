# Porto Gasless Transactions Documentation

## Overview

This document consolidates our findings on implementing gasless transactions using Porto Protocol on RISE testnet.

## Current Status ✅

**Gasless transactions ARE working** - The Porto relay successfully sponsors gas for transactions, maintaining user accounts at 0 ETH balance.

### Evidence
- **Working Transaction**: `0x571e1e3c87a774edd720fc205737ce4cad3d24484bfad5b7af20cfac9ee1741a`
- **EOA Balance**: 0 ETH throughout
- **Relay Wallet**: `0x584b5274765a7F7C78FDc960248f38e5Ad6b1EDb` (sends all transactions)

## Implementation Flow

### 1. Account Registration (One-time Setup)

```javascript
// Step 1: Prepare upgrade with session key
const prepareParams = {
  address: mainAccount.address,
  delegation: '0x912a428b1a7e7cb7bb2709a2799a01c020c5acd9', // Porto Implementation
  capabilities: {
    authorizeKeys: [{
      expiry: '0x' + expiryHex,        // MUST be hex string
      prehash: false,
      publicKey: sessionAccount.address,
      role: 'admin',
      type: 'secp256k1',
      permissions: []
    }]
  },
  chainId: 11155931  // RISE testnet
};

const prepareResponse = await makeRelayCall('wallet_prepareUpgradeAccount', [prepareParams]);

// Step 2: Sign both digests
const authSig = await sessionAccount.signMessage({
  message: { raw: prepareResponse.digests.auth }
});

const execSig = await sessionAccount.signTypedData({
  domain: prepareResponse.typedData.domain,
  types: prepareResponse.typedData.types,
  primaryType: prepareResponse.typedData.primaryType,
  message: prepareResponse.typedData.message,
});

// Step 3: Complete upgrade
await makeRelayCall('wallet_upgradeAccount', [{
  context: prepareResponse.context,
  signatures: { auth: authSig, exec: execSig }
}]);
```

### 2. Transaction Execution

```javascript
// Prepare calls with fee token
const callParams = {
  from: mainAccount.address,
  chainId: 11155931,
  calls: [{
    to: targetContract,
    value: '0x0',
    data: calldata
  }],
  capabilities: {
    meta: {
      feeToken: '0x0000000000000000000000000000000000000000'  // ETH - REQUIRED
    }
  }
};

const prepareCallsResponse = await makeRelayCall('wallet_prepareCalls', [callParams]);

// Sign and send
const signature = await sessionAccount.signMessage({
  message: { raw: prepareCallsResponse.digest }
});

const sendResponse = await makeRelayCall('wallet_sendPreparedCalls', [{
  context: prepareCallsResponse.context,
  key: {
    prehash: false,
    publicKey: sessionAccount.address,
    type: 'secp256k1'
  },
  signature: signature
}]);
```

## Key Configuration

### Network Settings
- **Chain ID**: 11155931 (RISE Testnet)
- **RPC URL**: https://testnet.riselabs.xyz
- **Porto Relay**: https://rise-testnet-porto.fly.dev

### Important Contracts
- **Porto Implementation**: `0x912a428b1a7e7cb7bb2709a2799a01c020c5acd9`
- **Orchestrator**: `0x046832405512D508b873E65174E51613291083bC`
- **FrenPetSimple (Test)**: `0x3FDE139A94eEf14C4eBa229FDC80A54f7F5Fbf25`

## Critical Requirements

### 1. Fee Token Specification
**MUST** include `feeToken` in `capabilities.meta`:
```javascript
capabilities: {
  meta: {
    feeToken: "0x0000000000000000000000000000000000000000"  // ETH address for sponsorship
  }
}
```
Without this, the relay won't sponsor gas.

### 2. Signature Format
- **Expiry**: Must be hex string format (`'0x' + expiry.toString(16)`)
- **Auth Signature**: Raw message signature of auth digest
- **Exec Signature**: EIP-712 typed data signature

### 3. PreCalls Handling
The relay automatically:
1. Fetches stored upgrade from database (key: `upgrade:{address}`)
2. Adds it as a preCall if delegation isn't deployed
3. Includes it in the transaction bundle

## Known Behaviors

### First Transaction (Delegation Deployment)
- Relay adds delegation deployment as a preCall automatically
- Transaction includes both delegation deployment and user calls
- Gas is fully sponsored by relay

### Subsequent Transactions
- No preCalls needed (delegation already deployed)
- Direct execution of user calls
- Continues to be gasless

## Testing

Run the gasless test:
```bash
cd tests
node test-gasless.js
```

This test demonstrates:
1. Fresh EOA with 0 balance
2. Delegation registration
3. Gasless transaction execution
4. Balance remains at 0 throughout

## Technical Details

### Porto Relay Implementation
The relay (`external/porto-relay`) handles:
- Upgrade storage in embedded database (fjall)
- Automatic preCall injection for delegation deployment
- Gas sponsorship through relay wallet
- Transaction bundling and execution

### Key Code Locations
- **Relay Handlers**: `external/porto-relay/src/handlers/`
  - `account.rs` - Handles upgrade registration
  - `wallet.rs` - Handles transaction preparation and sending
- **Porto SDK**: `external/porto-rise/src/`
  - `ServerActions.ts` - Client-side transaction preparation
  - `preCalls.ts` - PreCall storage and management

### Transaction Flow
1. Client prepares transaction with calls
2. Relay checks for stored delegation upgrade
3. If needed, adds delegation deployment as preCall
4. Bundles everything into single transaction
5. Relay wallet sponsors and sends transaction
6. User maintains 0 ETH balance

## Troubleshooting

### Common Issues

1. **"Invalid params (missing field `meta`)"**
   - Ensure `capabilities.meta.feeToken` is included

2. **"Invalid type: integer" for expiry**
   - Use hex string format: `'0x' + expiry.toString(16)`

3. **Duplicate preCalls**
   - Relay auto-fetches stored upgrades
   - Don't manually add preCalls if using `wallet_upgradeAccount`

4. **Transaction reverts but appears successful**
   - Check contract execution in trace
   - Verify delegation is properly deployed
   - Ensure signatures are valid

## Conclusion

Porto gasless transactions work as designed:
- Users maintain 0 ETH balance
- Relay sponsors all gas costs
- Delegation deployment is handled automatically
- System is functional for production use

The implementation requires careful attention to:
- Including fee token in capabilities
- Proper signature formats
- Understanding preCall auto-injection

With these considerations, true gasless transactions are achievable on RISE testnet.