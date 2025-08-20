# CLAUDE.md - AI Assistant Guide

## Project Overview

Rise FrenPet Mobile Demo - A mobile application demonstrating gasless transactions on RISE testnet using Porto Protocol.

## Goal

Enable users to interact with the FrenPet smart contract without paying gas fees, using Porto's meta-transaction relay system.

## Key Resources

### External Dependencies
- `external/porto-relay` - Porto relay server implementation
- `external/porto-rise` - Porto SDK and examples for RISE network
- `external/rise-wallet-sdk` - RISE wallet SDK

### Documentation
- Porto RPC Server docs: https://porto.sh/rpc-server
- Implementation details: `PORTO_IMPLEMENTATION.md`
- Test suite: `tests/PORTO_GASLESS_SUMMARY.md`

## Network Configuration

### RISE Testnet
- **Chain ID**: 11155931
- **RPC URL**: https://testnet.riselabs.xyz
- **Porto Relay**: https://rise-testnet-porto.fly.dev

### Key Contracts
- **FrenPetSimple**: `0x3FDE139A94eEf14C4eBa229FDC80A54f7F5Fbf25`
- **Porto Orchestrator**: `0x046832405512D508b873E65174E51613291083bC`

## Resolved Issues

### ✅ Gasless Transaction Configuration
All Porto RPC calls require `capabilities.meta` object with `feeToken`:

```javascript
capabilities: {
  meta: {
    feeToken: "0x0000000000000000000000000000000000000000"  // ETH
  }
}
```

Without this configuration, transactions fail with "Invalid params (missing field `meta`)" or gas shortfall errors.

### ✅ Two-Phase Delegation Flow
1. **Off-chain setup**: `wallet_prepareUpgradeAccount` → `wallet_upgradeAccount`
2. **On-chain deployment**: First transaction with preCalls deploys delegation

### ⚠️ Known Issue
Porto relay has a gas calculation bug with preCalls (hardcoded values in `wallet.rs`). 
**Workaround**: Fund account with 0.001 ETH for delegation deployment only.

## Testing

Run gasless transaction tests:
```bash
cd tests
node test-porto-gasless.js
```

## Mobile Integration

The mobile app (`/mobile`) integrates Porto through:
- Session key generation and secure storage
- Porto delegation setup during user signup
- Gasless execution for all pet operations