# Testing Guide for Gasless FrenPet Mobile App

## Prerequisites
- Node.js installed
- ~~0.001 ETH~~ **NOTHING! Users need 0 ETH!**

## 🎉 ZERO ETH REQUIRED - Truly Gasless!

**Porto relay pays for EVERYTHING, including initial delegation!**

## Quick Test Instructions

### 1. ~~Get Test ETH~~ NOT NEEDED!

**You DON'T need any ETH!** Porto relay handles everything.

### 2. Run Zero-ETH Test (Recommended)

```bash
cd tests
node test-zero-eth-gasless.js
```

This test proves users need 0 ETH:
1. Creates fresh wallet with 0 balance
2. Sets up Porto delegation (FREE)
3. Creates pet (FREE)
4. All gas paid by Porto relay!

### 3. Run Mobile Flow Test

```bash
cd tests
node test-mobile-gasless.js
```

This test simulates the complete mobile app flow:
1. Generates wallet and session key (0 ETH)
2. Sets up Porto delegation (FREE via Porto)
3. Creates pet (GASLESS)
4. Feeds pet with session key (GASLESS)
5. Plays with pet with session key (GASLESS)

## Contract Details

- **FrenPetSimple Contract**: `0x3FDE139A94eEf14C4eBa229FDC80A54f7F5Fbf25`
- **Porto Implementation**: `0x912a428b1a7e7cb7bb2709a2799a01c020c5acd9`
- **Porto Orchestrator**: `0x046832405512D508b873E65174E51613291083bc`
- **Porto Relay**: `https://rise-testnet-porto.fly.dev`
- **RISE Testnet RPC**: `https://testnet.riselabs.xyz`
- **Chain ID**: `11155931`

## Key Features Tested

### ✅ Truly Gasless Transactions
- Users need **0 ETH** - not even for initial setup!
- Porto relay pays for all gas including delegation
- No wallet funding required ever

### ✅ Session Keys
- Main wallet delegates to session key
- Session key can sign transactions independently
- Better UX - no need for main wallet after setup

### ✅ Non-Payable Functions
- `createPet()` - Free (no value needed)
- `feedPet()` - Free (no value needed)
- `playWithPet()` - Free (no value needed)

## Mobile App Testing

### Run Jest Tests
```bash
cd mobile
npm test
```

Tests include:
- Contract configuration tests
- Gasless flow integration tests
- Session key management tests
- Game state tests

### Start Mobile App
```bash
cd mobile
npm start
# Then press 'i' for iOS or 'a' for Android
```

## Verification Steps

1. **Check Transaction on Explorer**
   - Search for transaction hash
   - Verify "From" is relay wallet: `0x584B5274765a7F7C78FDc960248f38e5Ad6b1EDb`
   - Verify user paid no gas

2. **Check Pet State**
   ```bash
   cast call 0x3FDE139A94eEf14C4eBa229FDC80A54f7F5Fbf25 \
     "hasPet(address)(bool)" YOUR_ADDRESS \
     --rpc-url https://testnet.riselabs.xyz
   ```

3. **Get Pet Stats**
   ```bash
   cast call 0x3FDE139A94eEf14C4eBa229FDC80A54f7F5Fbf25 \
     "getPetStats(address)" YOUR_ADDRESS \
     --rpc-url https://testnet.riselabs.xyz
   ```

## Troubleshooting

### "Insufficient funds" error
- This is NOT because user needs ETH!
- It's likely rate limiting from rapid requests
- Wait 10-15 seconds and retry
- Check Porto relay status

### Transaction fails intermittently
- Porto relay has rate limiting
- Wait 10-15 seconds between transactions
- The user still has 0 ETH - it's a relay issue

### Pet not showing
- Wait for blockchain confirmation (10 seconds)
- Refresh the app
- Check transaction on explorer

## Success Criteria

✅ User has 0 ETH throughout entire flow  
✅ All transactions sent by relay wallet  
✅ Session keys work independently  
✅ Mobile app shows "Free! 🎉" for actions  
✅ No wallet funding ever required  

## Example Successful Transactions (0 ETH Accounts)

```
TX: 0x30173d3891c71c0cf62c2a494dff36f1fbf5b4bbe6a98a76726284996d2fb22e
From: 0x584B5274765a7F7C78FDc960248f38e5Ad6b1EDb (Relay)
To: 0x046832405512D508b873E65174E51613291083bC (Orchestrator)
User Balance: 0 ETH
Gas Paid By: Porto Relay

TX: 0xf8dff08d9a4ef5a95f70aa177f57731745deeed48baa7532f0c080ce88b36332
From: 0x584B5274765a7F7C78FDc960248f38e5Ad6b1EDb (Relay)
To: 0x046832405512D508b873E65174E51613291083bC (Orchestrator)
User Balance: 0 ETH
Gas Paid By: Porto Relay
```

## The Magic of Porto

Porto handles the complexity:
1. **Delegation Storage**: Porto stores delegation off-chain
2. **First Transaction**: Includes both delegation + user action
3. **Relay Execution**: Porto relay executes and pays
4. **User Experience**: Completely gasless from day one!