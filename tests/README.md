# FrenPet Tests

This directory contains the core integration tests for the FrenPet mobile app with Porto relay integration.

## Prerequisites

```bash
npm install
```

## Core Tests

### 1. Porto App Flow Test
**File:** `test-porto-app-flow.js`

Complete end-to-end flow as the mobile app uses it:
- Creates new EOA (main wallet) and session key
- Delegates EOA to Porto with hex expiry format
- Creates a pet using gasless transaction
- Interacts with pet (feed/play)
- Verifies state changes

```bash
node test-porto-app-flow.js
```

**Key Features:**
- ✅ Correct hex expiry format for delegation
- ✅ Both auth and exec signature handling
- ✅ Complete pet lifecycle testing
- ✅ Transaction status verification

### 2. RPC State Test
**File:** `test-rpc-state.js`

Tests reading contract state via RPC calls:
- Reads pet data from blockchain
- Monitors state changes
- Batch RPC call testing
- Contract metadata queries

```bash
node test-rpc-state.js
```

**Key Features:**
- ✅ Pet state reading and formatting
- ✅ Real-time state monitoring
- ✅ Batch operations
- ✅ Network statistics

### 3. Session Key Management Test
**File:** `test-session-keys.js`

Tests session key lifecycle and management:
- Session key generation and rotation
- Multiple session management
- Expiry handling
- Transaction signing with session keys

```bash
node test-session-keys.js
```

**Key Features:**
- ✅ Session key lifecycle
- ✅ Automatic expiry and cleanup
- ✅ Multi-user session management
- ✅ Security best practices

### 4. Delegation Format Test
**File:** `test-delegation-simple.js`

Tests the critical delegation format requirements:
- Verifies hex expiry format requirement
- Tests different parameter formats
- Validates Porto API responses
- Confirms delegation with test transaction

```bash
node test-delegation-simple.js
```

**Key Features:**
- ✅ Hex expiry format validation
- ✅ API format documentation
- ✅ Error case testing
- ✅ Delegation verification

## Important Notes

### Critical: Hex Expiry Format
⚠️ The `expiry` field in Porto delegation MUST be a hex string (e.g., `"0x68ca3815"`), not an integer!

```javascript
// ✅ CORRECT
const expiry = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
const expiryHex = '0x' + expiry.toString(16);

// ❌ WRONG - Will fail with "invalid type" error
const expiry = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
```

### Network Configuration
- **RPC URL:** https://testnet.riselabs.xyz
- **Porto Relay:** https://rise-testnet-porto.fly.dev
- **Chain ID:** 11155931 (RISE Testnet)
- **FrenPet Contract:** 0xfaf41c4e338d5f712e4aa221c654f764036f168a
- **Porto Implementation:** 0x6b0f89e0627364a3348277353e3776dc8612853f

### Important: Test Account Funding
⚠️ **Test accounts need a small amount of ETH** to execute transactions through Porto.
While Porto provides gasless transactions for the main operations, accounts still need
minimal ETH balance (around 0.001 ETH) for the initial delegation transaction.

### Running All Tests

```bash
# Run all core tests sequentially
npm test

# Or run individually
node test-porto-app-flow.js    # Main app flow
node test-rpc-state.js         # RPC state reading
node test-session-keys.js      # Session management
node test-delegation-simple.js # Delegation format
```

## Test Development

When adding new tests:
1. Follow the existing test structure
2. Always use hex format for expiry fields
3. Include proper error handling
4. Add clear console output for debugging
5. Test both success and failure cases

## Troubleshooting

### Common Issues

1. **"Invalid params" error**
   - Check that expiry is hex string
   - Verify all required fields are present
   - Ensure proper nesting of capabilities

2. **Error 0xfbcb0b34**
   - Account not delegated to Porto
   - Run delegation flow first
   - Check account bytecode

3. **"No quote found" error**
   - Pass complete context from prepareCalls
   - Don't modify context object

## Dependencies

See `package.json` for required dependencies:
- `viem` - Ethereum client library
- `crypto` - Node.js crypto module

## Contributing

When modifying tests:
1. Ensure hex expiry format is used everywhere
2. Update this README if adding new tests
3. Keep tests focused and clean
4. Add descriptive console output