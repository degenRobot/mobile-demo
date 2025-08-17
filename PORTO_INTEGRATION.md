# Porto Integration Guide

## What is Porto?

Porto is a relayer that enables gasless transactions on RISE. Users don't need ETH/RISE for gas - Porto sponsors it.

## How It Works

1. **Prepare**: Create transaction intent
2. **Sign**: Sign with EIP-712 (typed data)
3. **Send**: Submit to Porto relayer
4. **Monitor**: Check transaction status

## Implementation

### Initialize Porto
```typescript
import { portoClient } from './lib/portoClient.native';

// Initialize with private key
await portoClient.init(privateKey);
```

### Send Gasless Transaction
```typescript
const result = await portoClient.executeGaslessTransaction(
  to,        // Contract address
  data,      // Encoded function call
  value      // ETH value (optional)
);

// Returns: { bundleId, status }
```

### Check Status
```typescript
const status = await portoClient.getCallsStatus(bundleId);
// status.status: 200 = success, 400+ = failed
```

## Configuration

Porto uses Sepolia fork chain ID (11155931) while RISE uses 1123.
This is handled automatically by the Porto client.

## Testing

Successfully tested transaction:
`0x050312a9cd6fdefc324c7fbf99f58648d1aeb3c6a8182a1a4da706ca5c758f9d`

## Fallback

If Porto is unavailable, the app automatically falls back to direct RPC transactions (requires gas).