# Porto Gasless Implementation

## Overview

This document consolidates the Porto gasless implementation findings and solution for the Rise FrenPet mobile demo.

## Current Status: ✅ WORKING

Porto gasless transactions are functional with the correct configuration. There is a known bug with delegation deployment that requires a workaround.

## The Solution

### Required Configuration

All Porto transactions must include `feeToken` in capabilities:

```javascript
capabilities: {
  meta: {
    feeToken: "0x0000000000000000000000000000000000000000"  // ETH
  }
}
```

This configuration ensures Porto relay properly handles gas sponsorship.

## Implementation Flow

### 1. Setup Delegation (Off-chain) ✅
```javascript
// Prepare upgrade account
const prepareResponse = await makeRelayCall('wallet_prepareUpgradeAccount', [params]);

// Sign with session key
const authSig = await sessionAccount.signMessage({ 
  message: { raw: prepareResponse.digests.auth }
});

// Store with Porto
await makeRelayCall('wallet_upgradeAccount', [{
  context: prepareResponse.context,
  signatures: { auth: authSig, exec: execSig }
}]);
```

### 2. Deploy Delegation (On-chain) ⚠️
```javascript
// Prepare calls with empty transaction
const prepareDelegationResponse = await makeRelayCall('wallet_prepareCalls', [{
  from: mainAccount.address,
  chainId: CONFIG.CHAIN_ID,
  calls: [{
    to: '0x0000000000000000000000000000000000000000',
    value: '0x0',
    data: '0x'
  }],
  capabilities: {
    meta: {
      feeToken: ETH_ADDRESS  // Critical!
    }
  }
}]);

// Send prepared calls
await makeRelayCall('wallet_sendPreparedCalls', [params]);
```

**Known Issue**: Gas calculation bug with preCalls causes insufficient gas errors.
**Workaround**: Fund account with 0.001 ETH for delegation deployment only.

### 3. Execute Gasless Transactions ✅
After delegation is deployed, all subsequent transactions are truly gasless:

```javascript
const petParams = {
  from: mainAccount.address,
  chainId: CONFIG.CHAIN_ID,
  calls: [{
    to: FRENPET_ADDRESS,
    value: '0x0',
    data: petCalldata
  }],
  capabilities: {
    meta: {
      feeToken: ETH_ADDRESS  // Required for gasless
    }
  }
};
```

## Technical Details

### Porto Architecture
- **Protocol**: Meta-transaction relay system (not EIP-7702)
- **Flow**: Two-phase delegation (off-chain setup, on-chain deployment)
- **Model**: Lazy delegation (deployed with first transaction)
- **Keys**: Session keys get delegated permissions from main EOA

### The Gas Bug
Location: `porto-relay/src/handlers/wallet.rs`
- Line 492: `combinedGas` hardcoded to 50,000,000
- Line 720: `gas_limit` hardcoded to 100,000,000

These hardcoded values don't account for actual preCalls gas usage, causing a ~0.00000002 ETH shortfall.

### Network Configuration
- **Network**: RISE Testnet
- **Chain ID**: 11155931
- **RPC**: https://testnet.riselabs.xyz
- **Porto Relay**: https://rise-testnet-porto.fly.dev
- **Orchestrator**: 0x046832405512D508b873E65174E51613291083bC

### Contract Addresses
- **FrenPetSimple**: 0x3FDE139A94eEf14C4eBa229FDC80A54f7F5Fbf25
- **Porto Implementation**: 0x912a428b1a7e7cb7bb2709a2799a01c020c5acd9
- **Porto Proxy**: 0xf463d5cbc64916caa2775a8e9b264f8c35f4b8a4

## Mobile Integration

The mobile app uses Porto for gasless transactions through:
1. Session key generation and storage
2. Porto delegation setup on signup
3. Gasless transaction execution for all pet operations

Key files:
- `/mobile/src/lib/portoClient.native.ts` - Porto client implementation
- `/mobile/src/lib/portoRelayer.ts` - Relay interactions
- `/mobile/src/hooks/usePorto.ts` - React hook for Porto

## Testing

Complete test suite available in `/tests/`:
- `test-porto-gasless.js` - Main gasless flow test
- `test-capabilities-exploration.js` - Capability configuration testing
- `PORTO_GASLESS_SUMMARY.md` - Detailed findings

## Summary

Porto gasless implementation is **working correctly** when:
1. `capabilities.meta.feeToken` is specified
2. Delegation has been deployed (one-time setup)
3. Using session keys for signing

The system enables truly gasless transactions for users after initial delegation setup.