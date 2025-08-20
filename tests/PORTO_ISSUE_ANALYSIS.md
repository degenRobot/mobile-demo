# Porto Gasless Transaction Issue Analysis

## Executive Summary
Gasless transactions are being processed but the actual contract calls (createPet) are not being executed. The root cause is that keys registered off-chain are not being properly authorized on-chain after delegation deployment.

## Current Status

### ✅ What's Working
- Off-chain delegation registration with Porto relay
- Gasless delegation deployment (EIP-7702)
- Transaction submission and orchestrator processing
- Gas sponsorship by relay

### ❌ What's Failing
- Actual execution of contract calls (createPet)
- On-chain key authorization persistence
- Keys disappear after delegation deployment

## Technical Analysis

### Transaction Flow
1. **Off-chain Registration**: Keys registered with Porto relay ✅
2. **Delegation Deployment**: EIP-7702 delegation deployed via preCall ✅
3. **Orchestrator Processing**: Transaction accepted and processed ✅
4. **Call Execution**: Fails due to unauthorized key ❌

### Evidence
```
Transaction: 0xd7fda8a0dc2a583059ae30c6d7c340071b3443fe987f0621687ccee07a7fa12f
- Status: 200 (Success)
- Receipt Status: 0x1 (Success)
- From: 0x0c2fbefdbb76363c56573b37fe7c343ffb831c40 (Relay)
- To: 0x046832405512d508b873e65174e51613291083bc (Orchestrator)
- Gas Used: 0x9a74 (39540)
- Logs: 1 (from Orchestrator only, not FrenPet)
```

### Root Cause
The orchestrator requires a wrapped signature containing:
```rust
wrapped_signature = (signature_bytes, key_hash, prehash).abi_encode_packed()
```

Where `key_hash = keccak256((key_type, keccak256(public_key)).abi_encode())`

The key hash in the signature must match an authorized key on-chain, but:
1. `wallet_getKeys` returns 0 keys after delegation deployment
2. Keys registered off-chain don't persist on-chain
3. The orchestrator can't verify the key is authorized

## Code Analysis

### Call Structure ✅
```javascript
calls: [{
  to: FRENPET_SIMPLE_ADDRESS,
  data: createPetCalldata,  // Has 0x prefix
  value: '0x0'
}]
```

### Key Authorization ✅
```javascript
authorizeKeys: [{
  expiry: '0x0',
  prehash: false,
  publicKey: mainAccount.address,
  role: 'admin',
  type: 'secp256k1',
  permissions: []
}]
```

### Signature ✅
Using raw `sign()` instead of `signMessage()` to avoid EIP-191 prefixing

## Identified Issues

### 1. Key Authorization Not Persisting
- **Problem**: Keys registered off-chain aren't set on-chain during delegation deployment
- **Impact**: Orchestrator can't verify key authorization for execution
- **Evidence**: `wallet_getKeys` returns empty array after delegation

### 2. PreCall Key Authorization
- **Problem**: Key authorization might not be included in preCalls during delegation deployment
- **Expected**: Delegation deployment should include `authorize(key)` calls
- **Actual**: Only delegation is deployed, no key authorization calls

### 3. Implementation Mismatch
- **Relay expects**: Keys to be authorized via preCalls
- **Account expects**: Keys to be set during delegation setup
- **Result**: Keys aren't properly authorized for execution

## Potential Solutions

### Option 1: Fix PreCall Authorization
Ensure key authorization calls are included in preCalls during delegation deployment

### Option 2: Manual Key Authorization
After delegation deployment, make a separate transaction to authorize keys on-chain

### Option 3: Use Pre-Deployed Delegations
Test with accounts that already have delegations and keys authorized

## Next Steps

1. **Verify PreCalls**: Check if key authorization is actually included in the delegation deployment transaction
2. **Inspect On-chain State**: Query the account contract directly to see key status
3. **Test with Pre-authorized Account**: Use an account with existing delegation and keys
4. **Review Relay Implementation**: Check if relay properly includes key authorization in preCalls

## Conclusion

The issue is not with our call data or signatures, but with the key authorization flow. Keys registered off-chain are not being properly authorized on-chain during delegation deployment, preventing the orchestrator from executing the actual contract calls.