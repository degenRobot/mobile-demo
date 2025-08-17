# Porto Relayer Integration Plan for Mobile App

## Current State
- ✅ Porto relayer tested and working in TypeScript tests
- ✅ Mobile app structure created with React Native
- ✅ Contract deployed to RISE testnet
- ⏳ Need to integrate proven Porto logic into mobile app

## Integration Plan

### Phase 1: Core Porto Client for React Native
**Goal**: Adapt the working Porto client from tests to React Native environment

#### 1.1 Create Native Porto Client (`mobile/src/lib/portoClient.native.ts`)
```typescript
// Key changes from test version:
- Use expo-secure-store instead of process.env
- Handle React Native fetch quirks
- Add retry logic for network failures
- Implement proper error boundaries
```

#### 1.2 Key Methods to Implement
- `prepareCalls()` - Prepare transaction intent
- `signIntent()` - EIP-712 signing with account
- `sendPreparedCalls()` - Send to relayer
- `getCallsStatus()` - Check transaction status
- `executeGaslessTransaction()` - High-level wrapper

### Phase 2: Update Wallet Management
**Goal**: Integrate Porto with existing wallet system

#### 2.1 Update SessionWallet (`mobile/src/lib/sessionWallet.ts`)
```typescript
class SessionWallet {
  // Add Porto client instance
  private portoClient: PortoClient;
  
  // Keep existing main/session account logic
  // Add method to execute via Porto
  async executePortoTransaction(to, data, value)
}
```

#### 2.2 Wallet Hook Updates (`mobile/src/hooks/useWallet.ts`)
- Add Porto client initialization
- Expose gasless transaction method
- Handle transaction status tracking

### Phase 3: Update FrenPet Integration
**Goal**: Use Porto for all FrenPet transactions

#### 3.1 Update useFrenPet Hook (`mobile/src/hooks/useFrenPet.ts`)
```typescript
// Change sendTransaction to use Porto
const sendTransaction = async (functionName, args, value?) => {
  if (usePorto) {
    return await portoClient.executeGaslessTransaction(...)
  } else {
    // Fallback to direct RPC
  }
}
```

#### 3.2 Transaction Status Tracking
- Add pending transaction state
- Poll for status updates
- Show success/failure UI

### Phase 4: UI Updates
**Goal**: Show gasless benefits to users

#### 4.1 Transaction Status Component
```typescript
<TransactionStatus
  bundleId={currentTxId}
  onSuccess={() => refreshPetData()}
  onError={(error) => showError(error)}
/>
```

#### 4.2 Gasless Badge
- Show "Gas Free" badge on buttons
- Indicate Porto relayer usage
- Display saved gas costs

### Phase 5: Error Handling & Recovery
**Goal**: Robust error handling for production

#### 5.1 Network Failures
- Retry logic with exponential backoff
- Offline queue for transactions
- Sync when connection restored

#### 5.2 Transaction Failures
- Clear error messages
- Fallback to direct RPC option
- Debug mode for developers

## Implementation Steps

### Step 1: Porto Client Core (Day 1)
1. Copy `tests/src/portoClient.ts` to `mobile/src/lib/portoClient.native.ts`
2. Replace Node.js dependencies with React Native equivalents
3. Add React Native specific error handling
4. Test basic connectivity

### Step 2: Wallet Integration (Day 1)
1. Update SessionWallet to include Porto client
2. Add executeGaslessTransaction method
3. Update useWallet hook
4. Test wallet initialization

### Step 3: FrenPet Integration (Day 2)
1. Update useFrenPet to use Porto
2. Add transaction status tracking
3. Update UI components
4. Test all FrenPet actions

### Step 4: UI Polish (Day 2)
1. Add transaction status indicators
2. Create gasless badges
3. Improve error messages
4. Add loading states

### Step 5: Testing & Refinement (Day 3)
1. Test on Android emulator
2. Test on iOS simulator
3. Handle edge cases
4. Performance optimization

## File Structure

```
mobile/
├── src/
│   ├── lib/
│   │   ├── portoClient.native.ts    # NEW: Porto client for RN
│   │   ├── sessionWallet.ts         # UPDATE: Add Porto integration
│   │   └── wallet.ts                # Keep as-is
│   ├── hooks/
│   │   ├── usePorto.ts              # NEW: Porto-specific hook
│   │   ├── useWallet.ts             # UPDATE: Add Porto support
│   │   └── useFrenPet.ts            # UPDATE: Use Porto for txs
│   ├── components/
│   │   ├── TransactionStatus.tsx    # NEW: Tx status tracking
│   │   └── GaslessBadge.tsx        # NEW: UI indicator
│   └── config/
│       └── porto.ts                 # NEW: Porto configuration
```

## Success Metrics

1. **Functionality**
   - [ ] All FrenPet actions work via Porto
   - [ ] Transaction status tracking works
   - [ ] Error handling is robust

2. **Performance**
   - [ ] Transactions complete in <5 seconds
   - [ ] No UI freezing during operations
   - [ ] Smooth status updates

3. **User Experience**
   - [ ] Clear gasless messaging
   - [ ] Intuitive error messages
   - [ ] Visual transaction progress

## Testing Checklist

### Unit Tests
- [ ] Porto client methods
- [ ] Signing logic
- [ ] Error handling

### Integration Tests
- [ ] Wallet + Porto
- [ ] FrenPet + Porto
- [ ] Status tracking

### E2E Tests
- [ ] Create pet flow
- [ ] Feed pet flow
- [ ] Battle flow
- [ ] Error recovery

## Configuration

### Porto Relayer
```typescript
const PORTO_CONFIG = {
  url: 'https://rise-testnet-porto.fly.dev',
  chainId: 11155931,
  retryAttempts: 3,
  timeout: 30000,
};
```

### Contract
```typescript
const FRENPET_ADDRESS = '0xfaf41c4e338d5f712e4aa221c654f764036f168a';
```

## Next Steps

1. **Start with Porto Client** - Port the working TypeScript client to React Native
2. **Test Basic Flow** - Ensure prepare/sign/send works in RN environment
3. **Integrate with Hooks** - Update existing hooks to use Porto
4. **Add UI Features** - Status tracking, badges, error handling
5. **Polish & Test** - Comprehensive testing on devices

## Notes

- Porto relayer is proven to work (tx: 0x050312a9cd6fdefc324c7fbf99f58648d1aeb3c6a8182a1a4da706ca5c758f9d)
- Use exact same flow as tests (prepare → sign → send → status)
- Keep direct RPC as fallback option
- Focus on gasless UX benefits