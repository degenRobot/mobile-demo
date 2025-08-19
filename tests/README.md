# Porto Relay Tests

Simple, organized tests for Porto gasless transactions.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run main flow test
node test-porto-flow.js

# Check relay wallet balances
node check-relay-wallets.js

# Test with 0 ETH account
node test-zero-eth.js
```

## 📁 Project Structure

```
tests/
├── lib/
│   └── porto-utils.js      # Shared utilities and configuration
├── test-porto-flow.js      # Main Porto flow test
├── test-zero-eth.js         # Zero ETH gasless test
├── check-relay-wallets.js   # Check relay wallet balances
└── README.md                # This file
```

## 🧪 Available Tests

### 1. Main Porto Flow Test
```bash
node test-porto-flow.js
```
Tests the complete Porto delegation and transaction flow:
- Account registration with Porto
- Gasless transaction sending
- Transaction status checking
- Pet creation verification

### 2. Zero ETH Test
```bash
node test-zero-eth.js
```
Proves users need 0 ETH for all operations:
- Creates fresh account with 0 balance
- Registers with Porto (off-chain)
- Sends gasless transaction
- Verifies user spent 0 ETH

### 3. Check Relay Wallets
```bash
node check-relay-wallets.js
```
Checks balance of all Porto relay signer wallets:
- Shows each signer address
- Displays balance and status
- Provides funding instructions if needed

## 🔧 Shared Utilities (lib/porto-utils.js)

All tests use shared utilities for consistency:

### Porto Functions
- `makeRelayCall(method, params)` - Make Porto RPC calls
- `registerWithPorto(account)` - One-time account registration
- `sendGaslessTransaction(account, calls)` - Send gasless tx
- `checkTransactionStatus(bundleId)` - Check tx status

### Blockchain Functions
- `createClient()` - Create Viem public client
- `hasPet(address)` - Check if account has pet
- `getPetStats(address)` - Get pet statistics
- `getBalance(address)` - Get ETH balance

### Encoding Helpers
- `encodeFrenPetCall(functionName, args)` - Encode FrenPet calls

## ⚙️ Configuration

All configuration is centralized in `lib/porto-utils.js`:

```javascript
{
  PORTO_URL: 'https://rise-testnet-porto.fly.dev',
  CHAIN_ID: 11155931,
  RPC_URL: 'https://testnet.riselabs.xyz',
  FRENPET_ADDRESS: '0x3FDE139A94eEf14C4eBa229FDC80A54f7F5Fbf25'
}
```

## 🐛 Common Issues & Solutions

### "Insufficient funds for gas * price + value"

**Problem**: Porto relay wallets don't have enough ETH.

**Solution**:
1. Run `node check-relay-wallets.js`
2. Fund the wallets shown as insufficient
3. Each wallet needs at least 0.001 ETH per transaction

### Transaction shows success but state doesn't change

**Problem**: Transaction only executed delegation, not the actual call.

**Solution**: Porto may execute transactions in two phases:
1. First tx: Sets up delegation
2. Second tx: Executes actual call

### Rate limiting errors

**Problem**: Too many requests too quickly.

**Solution**: Wait 10-15 seconds between tests.

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