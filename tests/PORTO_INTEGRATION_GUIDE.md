# Porto Relayer Integration Guide

## ✅ Successfully Tested Flow

We've successfully tested the complete Porto relayer flow and sent gasless transactions!

### Transaction Receipt
```json
{
  "transactionHash": "0x050312a9cd6fdefc324c7fbf99f58648d1aeb3c6a8182a1a4da706ca5c758f9d",
  "blockNumber": "0x1363717",
  "status": "0x1", // Success!
  "from": "0x584b5274765a7f7c78fdc960248f38e5ad6b1edb", // Porto executor
  "to": "0x046832405512d508b873e65174e51613291083bc", // Orchestrator contract
}
```

## Complete Working Flow

### 1. Prepare Transaction
```typescript
const call = {
  to: targetAddress,
  data: calldata,
  value: valueInHex
};

const request = {
  calls: [call],
  capabilities: {
    meta: {
      accounts: [userAddress]
    }
  },
  chainId: 11155931,
  from: userAddress,
  key: {
    type: 'secp256k1',
    publicKey: userAddress,
    prehash: false
  }
};

// Send to Porto
const response = await fetch('https://rise-testnet-porto.fly.dev', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    method: 'wallet_prepareCalls',
    params: [request],
    id: 1
  })
});
```

### 2. Sign Intent (EIP-712)
```typescript
// Extract from prepare response
const { typedData, digest, context, key } = prepareResult;

// Fix domain chainId if hex
const domain = {
  ...typedData.domain,
  chainId: parseInt(typedData.domain.chainId, 16)
};

// Sign with private key
const signature = await account.signTypedData({
  domain,
  types: typedData.types,
  primaryType: typedData.primaryType,
  message: typedData.message
});
```

### 3. Send to Relayer
```typescript
const sendRequest = {
  context,
  key,
  signature
};

const sendResponse = await fetch('https://rise-testnet-porto.fly.dev', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    method: 'wallet_sendPreparedCalls',
    params: [sendRequest],
    id: 2
  })
});

// Returns bundle ID
const { id: bundleId } = sendResponse.result;
```

### 4. Check Status
```typescript
const statusResponse = await fetch('https://rise-testnet-porto.fly.dev', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    method: 'wallet_getCallsStatus',
    params: [bundleId],
    id: 3
  })
});
```

## React Native Implementation

### Key Differences from Web
1. **No Wagmi** - Use direct viem for account management
2. **No window object** - Use React Native crypto APIs
3. **Storage** - Use expo-secure-store instead of localStorage
4. **Networking** - fetch works the same

### Session Key Architecture
```typescript
class SessionWallet {
  mainAccount: PrivateKeyAccount;    // Stored securely, rarely used
  sessionAccount: PrivateKeyAccount; // Temporary, for daily use
  
  async createSession() {
    // 1. Generate session key
    const sessionKey = generatePrivateKey();
    
    // 2. Sign authorization with main account
    const authorization = {
      sessionKey: sessionAddress,
      expiry: Date.now() + 24*60*60*1000,
      permissions: ['frenpet']
    };
    
    // 3. Register with Porto (future feature)
    // Currently: Just use main account for signing
  }
}
```

### React Native Porto Client
```typescript
// src/lib/portoClient.native.ts
import * as SecureStore from 'expo-secure-store';
import { privateKeyToAccount } from 'viem/accounts';

export class PortoClient {
  private account: PrivateKeyAccount;
  
  async init() {
    // Get or create private key
    let pk = await SecureStore.getItemAsync('MAIN_KEY');
    if (!pk) {
      pk = generatePrivateKey();
      await SecureStore.setItemAsync('MAIN_KEY', pk);
    }
    this.account = privateKeyToAccount(pk);
  }
  
  async sendGaslessTransaction(to: string, data: string, value = '0x0') {
    // 1. Prepare
    const prepared = await this.prepareCalls([{ to, data, value }]);
    
    // 2. Sign
    const signature = await this.signIntent(prepared.typedData);
    
    // 3. Send
    const result = await this.sendPreparedCalls(
      prepared.context,
      prepared.key,
      signature
    );
    
    return result.id; // Bundle ID
  }
}
```

## Key Learnings

### ✅ What Works
1. **Porto accepts transactions** - Relayer is live and functional
2. **EIP-712 signing** - Standard typed data signing works
3. **Gasless execution** - Transactions go through without user paying gas
4. **Status tracking** - Can check transaction status with bundle ID

### ⚠️ Important Notes
1. **Chain ID**: Use 11155931 (Sepolia fork)
2. **Domain chainId**: Convert from hex to decimal for signing
3. **Public key**: Can use address as simplified public key
4. **Error handling**: "failed to send transaction" usually means contract revert

### 🚀 Production Considerations
1. **Retry logic** - Network failures need retries
2. **Nonce management** - Porto handles this
3. **Gas sponsorship** - Currently working without setup
4. **Session keys** - Future enhancement for better UX

## Testing Commands
```bash
# Run tests
cd tests
npm run test:complete  # Full flow with signing
npm run test:correct   # Basic connectivity
npm run test:basic     # Simple health check
```

## Next Steps for Mobile App

1. **Port PortoClient to React Native**
   - Remove browser-specific code
   - Use expo-secure-store for keys
   - Handle network errors gracefully

2. **Update useFrenPet hook**
   - Add Porto client option
   - Fallback to direct RPC if needed
   - Show gasless badge in UI

3. **Test on device**
   - Android emulator first
   - Then iOS simulator
   - Finally real devices

## Success Metrics
- ✅ Transaction sent through Porto: **DONE**
- ✅ EIP-712 signing working: **DONE**
- ✅ Gasless execution: **DONE**
- ⏳ React Native integration: **NEXT**
- ⏳ Session key management: **FUTURE**