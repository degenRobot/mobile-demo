# Porto Gasless Transaction Findings

## Executive Summary

After extensive testing and analysis, we've identified that Porto uses a **lazy delegation model** where account delegation happens during the first transaction, not during account setup. This explains why our pet creation transactions were failing - the first transaction only executes delegation setup, not the actual intended call.

## Key Findings

### 1. Porto's Two-Phase Delegation Model

Porto implements account abstraction through a two-phase process:

1. **Off-chain Setup Phase** (Gas-free)
   - `wallet_prepareUpgradeAccount`: Prepares delegation data
   - `wallet_upgradeAccount`: Stores delegation data off-chain (returns null)
   - No on-chain changes occur during this phase

2. **On-chain Execution Phase** (First transaction)
   - First transaction includes `encodedPreCalls` containing delegation setup
   - This transaction executes the delegation but NOT the intended call
   - Subsequent transactions can then execute actual calls

### 2. Transaction Flow Analysis

#### First Transaction (With Fresh Account)
```json
{
  "encodedPreCalls": ["0x..."], // Contains delegation setup
  "executionData": "0x...",      // Contains intended call (not executed)
  "nonce": "0x20000000000000000"
}
```
**Result**: Only delegation is executed, actual call is ignored

#### Second Transaction (After Delegation)
```json
{
  "encodedPreCalls": [],         // Empty - delegation already active
  "executionData": "0x...",      // Contains intended call (should execute)
  "nonce": "0x10000000000000000"
}
```
**Result**: Should execute the actual call

### 3. Why Our Pet Creation Was Failing

The mobile app was attempting to create a pet in the first transaction after account setup. However:
- The first transaction only sets up delegation
- The `executionData` (containing pet creation) is not executed
- The transaction shows "success" because delegation succeeded
- But no pet is created because the actual call wasn't executed

### 4. Porto Relay Implementation Details

- **Rotating Signers**: Porto uses multiple signer wallets from a mnemonic
- **Orchestrator Contract**: All transactions go through `0x046832405512d508b873e65174e51613291083bc`
- **Meta-transactions**: User EOAs never receive delegated code directly
- **Gas Management**: Each signer needs ~0.001 ETH per transaction

## Solution Recommendations

### Option 1: Two-Transaction Approach
After account setup, execute two transactions:
1. First transaction: Simple no-op to trigger delegation
2. Second transaction: Actual intended operation (pet creation)

### Option 2: Check Delegation Status
Before sending a transaction, check if the account already has delegation active:
- If `encodedPreCalls` is empty, delegation is active
- If `encodedPreCalls` has data, this will be a delegation-only transaction

### Option 3: Backend Optimization
Modify the relay to handle the delegation + execution in a single transaction bundle, though this may require Porto protocol changes.

## Test Results

Our test suite confirmed:
1. ✅ Account setup is completely off-chain (gas-free)
2. ✅ First transaction executes delegation setup
3. ✅ Second transaction has no preCalls (delegation active)
4. ⚠️ Second transaction execution blocked by minor gas estimation issues

## Code Locations

- **Test Suite**: `/tests/test-two-transactions.js`
- **Enhanced Utils**: `/tests/lib/porto-utils-enhanced.js`
- **Account Upgrade Test**: `/tests/test-account-upgrade-only.js`
- **Porto Relay**: `/external/porto-relay/src/handlers/wallet.rs`

## Next Steps

1. Implement two-transaction flow in mobile app
2. Add delegation status checking before transactions
3. Consider funding relay signers with more buffer for gas estimation
4. Monitor Porto protocol updates for single-transaction solutions

## Technical Details

### Porto Intent Structure
```
Intent {
  encodedPreCalls: bytes[]  // Delegation setup (if needed)
  executionData: bytes       // Actual calls to execute
  nonce: uint256            // Different ranges for different states
  eoa: address              // User's EOA address
  ...
}
```

### Nonce Patterns
- `0x20000000000000000`: First transaction (with delegation)
- `0x10000000000000000`: Subsequent transactions (no delegation)

This pattern suggests Porto tracks delegation state through nonce ranges.