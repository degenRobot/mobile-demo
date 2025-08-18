# FrenPet Gasless Tests

This directory contains tests for the gasless transaction functionality using Porto relay.

## 🚀 Quick Start

```bash
# Run quick sanity check
./run-tests.sh quick

# Run all core tests
./run-tests.sh core

# Run mobile-specific tests
./run-tests.sh mobile

# Run everything
./run-tests.sh all
```

## 📋 Test Organization

### Core Gasless Tests
These tests verify the fundamental gasless functionality:

- **test-zero-eth-gasless.js** - Proves users need 0 ETH for everything
- **test-basic-gasless.js** - Basic gasless transaction flow
- **test-delegation-simple.js** - Account delegation to Porto
- **test-simple-gasless.js** - Simplified gasless flow test

### Mobile Flow Tests
Tests that simulate the mobile app's transaction flow:

- **test-mobile-gasless.js** - Complete mobile app flow simulation
- **test-session-key-signing.js** - Session key signing functionality
- **test-session-keys.js** - Comprehensive session key tests
- **test-porto-app-flow.js** - Porto integration app flow

### Utility Tests
Supporting tests and debugging tools:

- **test-eoa-signing.js** - Direct EOA signing (fallback mechanism)
- **check-relay-wallets.js** - Check Porto relay wallet balances
- **trace-tx.js** - Transaction tracing for debugging

## 🧪 Running Individual Tests

Each test can be run individually:

```bash
# Prove zero ETH requirement
node test-zero-eth-gasless.js

# Test mobile flow
node test-mobile-gasless.js

# Check relay status
node check-relay-wallets.js
```

## ✅ Test Requirements

- Node.js 18+ or 20+
- Network connection to RISE testnet
- Porto relay must be accessible

## 🔑 Key Test Accounts

Tests generate fresh accounts with 0 ETH to prove gasless functionality.
No test accounts need funding - Porto pays for everything!

## 📊 Expected Results

All tests should pass with:
- User balance: 0 ETH throughout
- Gas paid by: Porto relay wallets
- Transactions executed successfully

## 🐛 Debugging

If tests fail:

1. **Check Porto relay status**:
   ```bash
   node check-relay-wallets.js
   ```

2. **Trace a transaction**:
   ```bash
   node trace-tx.js
   ```

3. **Common issues**:
   - Rate limiting: Wait 10-15 seconds between tests
   - Network issues: Check RISE testnet status
   - Porto down: Check https://rise-testnet-porto.fly.dev

## 📝 Contract Addresses

- **FrenPetSimple**: `0x3FDE139A94eEf14C4eBa229FDC80A54f7F5Fbf25`
- **Porto Implementation**: `0x912a428b1a7e7cb7bb2709a2799a01c020c5acd9`
- **Porto Orchestrator**: `0x046832405512D508b873E65174E51613291083bc`

## 🌐 Network Configuration

- **Network**: RISE Testnet
- **Chain ID**: 11155931
- **RPC**: https://testnet.riselabs.xyz
- **Porto Relay**: https://rise-testnet-porto.fly.dev