# Porto Gasless Tests

Tests for Porto gasless transactions on RISE Testnet.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run main gasless test
node test-porto-gasless.js

# Test different capability configurations
node test-capabilities-exploration.js
```

## 🔑 Key Solution

**Porto gasless requires `feeToken` in capabilities:**

```javascript
capabilities: {
  meta: {
    feeToken: "0x0000000000000000000000000000000000000000"  // ETH
  }
}
```

## 📁 Project Structure

```
tests/
├── lib/
│   ├── porto-utils-enhanced.js  # Enhanced utilities with debugging
│   └── porto-utils.js           # Basic utilities
├── test-porto-gasless.js        # Main gasless flow test
├── test-capabilities-exploration.js  # Capability testing
├── PORTO_GASLESS_SUMMARY.md     # Complete documentation
├── archive/                      # Previous test iterations
│   ├── exploration/              # Debugging tests
│   └── README.md                 # Archive documentation
└── README.md                     # This file
```

## 🧪 Main Tests

### 1. Complete Gasless Flow
```bash
node test-porto-gasless.js
```
Tests the complete gasless flow:
- Setup delegation (off-chain)
- Deploy delegation (on-chain - has known issue)
- Execute gasless transactions
- Verify 0 ETH spent

### 2. Capability Exploration
```bash
node test-capabilities-exploration.js
```
Tests different capability configurations to find what works:
- Various `meta` configurations
- With/without `feeToken`
- Different fee payer settings
- Success rate analysis

## 🔧 Utilities

### Enhanced Utils (lib/porto-utils-enhanced.js)
- `makeRelayCall(method, params)` - Porto RPC with debug output
- `createClient()` - Viem client for Base Sepolia
- Debug logging of all requests/responses
- Automatic output directory creation

### Basic Utils (lib/porto-utils.js)
- Original utilities for backward compatibility
- Simple Porto relay interactions

## ⚙️ Configuration

Configuration in `lib/porto-utils-enhanced.js`:

```javascript
{
  PORTO_URL: 'https://rise-testnet-porto.fly.dev',
  CHAIN_ID: 11155931,  // RISE Testnet
  RPC_URL: 'https://testnet.riselabs.xyz',
  FRENPET_ADDRESS: '0x3FDE139A94eEf14C4eBa229FDC80A54f7F5Fbf25'
}
```

## 🐛 Known Issues

### Porto Relay Gas Bug

**Problem**: Transactions with preCalls (delegation deployment) fail with insufficient gas.

**Root Cause**: Porto relay hardcodes gas values instead of calculating them:
- `combinedGas`: 50,000,000 (hardcoded)
- `gas_limit`: 100,000,000 (hardcoded)

**Workaround**: Fund account with 0.001 ETH for delegation deployment only.

**Long-term Fix**: Porto team needs to implement proper gas simulation.

### Missing Capabilities Error

**Problem**: "Invalid params (missing field `meta`)"

**Solution**: Always include `capabilities.meta` in requests:
```javascript
capabilities: {
  meta: {
    feeToken: "0x0000000000000000000000000000000000000000"
  }
}
```

## 📊 Expected Behavior

When everything works correctly:

1. **User Balance**: Always 0 ETH (truly gasless)
2. **Gas Payment**: Porto relay pays all gas
3. **Transaction Flow**:
   - Registration: Off-chain (instant, no gas)
   - First tx: May set up delegation
   - Subsequent txs: Execute contract calls
4. **Pet Creation**: Should succeed if relay has funds

## 🔑 Test Accounts

Default test accounts (from lib/porto-utils.js):
- **MAIN**: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- **SESSION**: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
- **THIRD**: `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`

## 📝 Contract Details

### FrenPetSimple (NON-PAYABLE)
- Address: `0x3FDE139A94eEf14C4eBa229FDC80A54f7F5Fbf25`
- Functions: `createPet()`, `feedPet()`, `playWithPet()`
- All functions are non-payable (require 0 ETH)

### Porto Contracts
- Orchestrator: `0x046832405512D508b873E65174E51613291083bc`
- Implementation: `0x912a428b1a7e7cb7bb2709a2799a01c020c5acd9`
- Relay Wallet: `0x584B5274765a7F7C78FDc960248f38e5Ad6b1EDb`

## 🌐 Network

- **Network**: RISE Testnet
- **Chain ID**: 11155931
- **RPC**: https://testnet.riselabs.xyz
- **Porto Relay**: https://rise-testnet-porto.fly.dev

## 💡 Key Insights

1. **Porto uses rotating signers**: Multiple wallets from a mnemonic
2. **Each signer needs funds**: Not just the main relay wallet
3. **Transactions are meta-transactions**: Go through orchestrator
4. **Delegation is off-chain**: Stored in Porto's database
5. **First tx may only delegate**: Subsequent txs execute calls