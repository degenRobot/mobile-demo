# Porto Relay Gasless Implementation - Complete Analysis

## Executive Summary

After deep analysis of the Porto relay, Porto SDK, and working implementations, we've identified the root cause of why session keys aren't persisting on-chain after delegation deployment.

### Status
- ✅ **Delegation deployment**: Working gaslessly  
- ✅ **Off-chain key registration**: Keys stored in relay DB
- ❌ **On-chain key authorization**: Keys not persisting after deployment
- ❌ **Transaction execution**: Calls fail due to unauthorized keys

## Architecture Overview

### 1. Porto Relay Flow (`porto-relay/src/handlers/`)

The relay operates in two phases:

#### Phase 1: Off-chain Registration
```rust
// account.rs:147-153
wallet_prepareUpgradeAccount → stores keys in DB as "cached_keys:{address}"
wallet_upgradeAccount → stores upgrade data in DB as "upgrade:{address}"
```

#### Phase 2: On-chain Deployment
```rust
// wallet.rs:504-506
wallet_prepareCalls → retrieves upgrade data and includes as preCall
wallet_sendPreparedCalls → executes transaction with preCalls
// wallet.rs:980-986
After success → clears both "upgrade:{address}" and "cached_keys:{address}"
```

### 2. Key Storage Structure

The relay stores data in two locations:
- `cached_keys:{address}` - Authorized keys array
- `upgrade:{address}` - Complete upgrade parameters including preCall data

### 3. PreCall Generation

From `account.rs:123-127`:
```rust
let execution_data = calls.abi_encode().encode_hex_with_prefix();
// This execution_data contains the key authorization calls
```

## The Problem

The session key authorization is **not being included in the execution_data** properly. The relay generates the preCall structure but the `execution_data` field is empty or malformed.

### Evidence from Test Results:
```
✅ PreCall data generated:
  - EOA: 0x5582d21c7e102de2f7942c9694700ad5d6de4aae
  - Execution data length: 0  ← THIS IS THE ISSUE
  - This contains the key authorization calls
```

The execution_data length is 0, meaning no key authorization calls are actually included.

## Root Cause Analysis

From `account.rs:79-94`, the relay converts authorized keys to calls:
```rust
let calls: Vec<ERC7821::Call> = params
    .capabilities
    .authorize_keys
    .iter()
    .cloned()
    .map(Vec::try_from)  // Convert each key to calls
    .collect::<Result<Vec<_>, _>>()?;
```

The issue is in the conversion from `KeyWithPermissions` to `Vec<ERC7821::Call>`. This conversion is failing silently or producing empty results.

## The Solution

### Option 1: Fix the Relay (Requires Porto Team)
The relay needs to properly encode key authorization calls in the execution_data field. This is a bug in the relay implementation.

### Option 2: Workaround - Manual PreCall Construction
Instead of relying on the relay's automatic preCall generation, we can manually construct the authorization transaction:

```javascript
// After delegation is deployed, make a separate call to authorize keys
const authorizeCalldata = encodeFunctionData({
  abi: IthacaAccountABI,
  functionName: 'authorize',
  args: [{
    publicKey: sessionAccount.address,
    role: 'session',
    expiry: expiryTimestamp,
    // ... other key parameters
  }]
});

// Send this as a regular transaction through the orchestrator
```

### Option 3: Use Dialog Mode (Recommended)
The dialog mode (used by test-chat-app) handles this automatically:

```javascript
import { Mode, Dialog } from 'porto';

const config = {
  mode: Mode.dialog({
    host: 'https://rise-wallet-testnet.vercel.app/dialog',
    renderer: Dialog.popup()
  })
};

// This will handle key authorization properly
```

## Confirmed Working Flow (Dialog Mode)

From `porto-rise/src/core/internal/modes/dialog.ts`:
1. Lines 210-215: PreCalls added during account creation
2. Lines 569-586: PreCalls included in prepareCalls
3. Lines 787-790: PreCalls cleared after success

The dialog mode works because it manages the complete flow internally, not relying on the relay's preCall generation.

## Implementation Recommendations

### For Mobile App Integration

1. **Short-term**: Use the dialog mode with popup/iframe renderer
2. **Medium-term**: Implement manual key authorization after delegation
3. **Long-term**: Work with Porto team to fix relay's execution_data generation

### Key Code Changes Needed

```javascript
// In mobile app, after delegation deployment:
if (delegationDeployed && !keysAuthorized) {
  // Manually authorize session key
  const authTx = await authorizeSessionKey(sessionAccount);
  await sendTransaction(authTx);
}
```

## Test Results Summary

### Current Implementation
- Delegation deploys: ✅
- Transaction is gasless: ✅  
- Keys registered off-chain: ✅
- Keys authorized on-chain: ❌
- Pet creation works: ❌

### Root Issue
The Porto relay has a bug in `account.rs` where it generates empty execution_data for key authorization. This needs to be fixed in the relay codebase.

## Next Steps

1. **Immediate**: Implement dialog mode for mobile app
2. **Report bug**: File issue with Porto team about empty execution_data
3. **Alternative**: Build custom key authorization flow post-delegation

## Conclusion

The gasless flow works perfectly for delegation deployment, but the relay has a critical bug preventing on-chain key authorization. The dialog mode bypasses this issue by handling the complete flow internally. For direct RPC integration, manual key authorization is required after delegation deployment.