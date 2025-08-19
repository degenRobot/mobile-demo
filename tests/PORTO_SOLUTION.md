# Porto Integration Solution

## Problem Summary

Porto's current relay implementation has a critical issue: **when a transaction includes both delegation setup (preCalls) and actual calls (executionData), it only executes the delegation and ignores the actual calls**.

## Evidence from Testing

### Test 1: Fresh Account
```
Transaction includes:
- encodedPreCalls: [delegation setup]  ✅ Executed
- executionData: [pet creation]        ❌ Ignored
Result: Delegation executed, pet NOT created
```

### Test 2: Previously Used Account  
```
Transaction STILL includes:
- encodedPreCalls: [delegation setup]  ✅ Re-executed
- executionData: [pet creation]        ❌ Ignored  
Result: Delegation re-executed, pet NOT created
```

## Root Cause

In `porto-relay/src/handlers/wallet.rs`, the orchestrator contract is called with the intent, but when preCalls exist, only those are executed. The executionData is present but not processed.

## Solutions

### Solution 1: Two-Transaction Flow (Current Workaround)
```javascript
// Transaction 1: Delegation only
const delegationTx = await sendEmptyTransaction(account);
await waitForConfirmation(delegationTx);

// Transaction 2: Actual operation  
const petTx = await createPet(account, petName);
// This SHOULD work but Porto still includes preCalls
```

**Issue**: Porto continues to include preCalls even after delegation, causing the same problem.

### Solution 2: Fix Porto Relay (Recommended)

The Porto relay needs to be modified to:
1. Execute preCalls (delegation) if present
2. THEN execute executionData (actual calls) in the same transaction

This would require changes to the orchestrator contract or relay logic.

### Solution 3: Force No PreCalls Mode

Modify the Porto client/relay to have a mode where preCalls are explicitly disabled after initial delegation:

```javascript
const preparePetParams = {
  from: account.address,
  chainId: CONFIG.CHAIN_ID,
  calls: petCalls,
  capabilities: {
    meta: {
      skipDelegation: true  // New flag
    }
  }
};
```

### Solution 4: Direct Contract Interaction

For accounts that are already delegated, bypass Porto for actual operations:
1. Use Porto for initial delegation setup
2. Interact directly with contracts for subsequent operations

## Immediate Recommendations

1. **For Mobile App**:
   - Implement retry logic: If pet creation fails, try again
   - Check delegation status and retry without preCalls
   - Consider direct contract calls for delegated accounts

2. **For Porto Team**:
   - Fix orchestrator to execute both preCalls AND executionData
   - Add option to disable delegation re-execution
   - Reduce gas limit from 100M to reasonable amount (500k)

3. **For Testing**:
   - Continue investigating if there's a nonce or parameter that prevents preCalls inclusion
   - Test with different account states and delegation expiry times

## Test Commands

```bash
# Test delegation flow
node tests/test-delegation-flow.js

# Test with existing account  
node tests/test-pet-creation-only.js

# Check gas usage (not the issue)
node tests/test-gas-usage.js
```

## Conclusion

The issue is not gas usage (23k is excellent) or funding. **Porto's relay only executes delegation (preCalls) and ignores the actual intended calls (executionData)** when both are present. This needs to be fixed in the Porto relay or orchestrator contract.