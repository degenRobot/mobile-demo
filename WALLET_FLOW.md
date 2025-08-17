# Porto Session Key Wallet Flow

## Overview
Instead of using Wagmi (web-only), we'll implement a direct RPC + Porto relayer approach with session keys for gasless transactions.

## Wallet Architecture

### 1. Main EOA (Externally Owned Account)
- Generated once and stored securely in device
- Used only for authorizing session keys
- Never exposed to relayer directly

### 2. Session Keys
- Temporary keys generated per session
- Approved by main EOA
- Used for all transaction signing via relayer
- Expire after set time period

## Implementation Flow

### Step 1: Initialize Wallet
```typescript
// On first app launch
1. Generate main EOA private key
2. Store securely in expo-secure-store
3. Display wallet address to user
```

### Step 2: Create Session
```typescript
// On each app session
1. Generate new session key (temporary private key)
2. Create session authorization from main EOA
3. Register session with Porto relayer
4. Store session key temporarily (expires on app close)
```

### Step 3: Execute Transactions
```typescript
// For each transaction
1. Prepare intent/call data
2. Sign with session key (not main EOA)
3. Send to Porto relayer
4. Relayer sponsors gas and executes
```

## Key Benefits
- **Security**: Main wallet key never leaves device
- **UX**: No gas fees for users (sponsored by relayer)
- **Performance**: Fast transaction execution
- **Session Management**: Auto-revoke on logout

## Porto Relayer Integration Points

### 1. Session Registration
```
POST /wallet_prepareCalls
- Register session key
- Get approval context
- Sign with main EOA
```

### 2. Transaction Execution
```
POST /wallet_sendCalls
- Send intent signed by session key
- Relayer validates session
- Executes with gas sponsorship
```

### 3. Status Checking
```
POST /wallet_getCallsStatus
- Check transaction status
- Handle success/failure
```

## Security Considerations

1. **Session Key Rotation**: Generate new key each session
2. **Time Limits**: Session keys expire after 24 hours
3. **Permission Scoping**: Limit what session keys can do
4. **Secure Storage**: Use expo-secure-store for keys
5. **Never Expose Main Key**: Only use for session approval

## Implementation Steps

1. Remove all Wagmi dependencies
2. Implement direct Viem RPC client
3. Create Porto relayer client with session management
4. Update UI to not depend on wagmi hooks
5. Test with gasless transactions

## References
- Porto Docs: https://porto.sh/rpc-server
- Session Keys: ERC-4337 compliant
- Base Mobile Integration: https://docs.base.org/base-account/quickstart/mobile-integration