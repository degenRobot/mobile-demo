# RISE FrenPet Mobile App - Architecture Review

## ✅ Deployment Status
- **Contract Address**: `0xfaf41c4e338d5f712e4aa221c654f764036f168a`
- **Network**: RISE Testnet (Chain ID: 1123)
- **RPC URL**: https://testnet.riselabs.xyz
- **Relayer URL**: https://rise-testnet-porto.fly.dev

## 🏗️ Architecture Overview

### 1. Smart Contract Layer
- **FrenPet.sol**: Tamagotchi-style pet game contract
  - Pet lifecycle management (hunger, happiness, death)
  - Battle system with VRF randomness
  - Experience and leveling system
  - Deployed successfully to RISE testnet

### 2. Mobile App Layer

#### Core Components:
1. **Embedded Wallet** (`src/lib/wallet.ts`)
   - Auto-generates private key on first launch
   - Stores securely using Expo SecureStore
   - Signs transactions locally

2. **Porto Relayer Integration** (`src/lib/portoRelayer.ts`)
   - Direct connection to Porto relayer at `https://rise-testnet-porto.fly.dev`
   - Supports gasless transactions through intents
   - Session key management for enhanced UX
   - Methods:
     - `prepareCalls()`: Prepares intents for execution
     - `sendCalls()`: Sends signed intents to relayer
     - `getCallsStatus()`: Checks transaction status
     - `executeGaslessTransaction()`: High-level gasless tx interface

3. **Direct RPC Integration**
   - Uses Viem client for direct blockchain reads
   - Fallback for when relayer is unavailable
   - Contract reads (getPetStats, hasPet)

#### Screens:
- **HomeScreen**: Wallet info, balance display, navigation
- **PetScreen**: Game interface, pet stats, actions, battles

## 🔄 Transaction Flow

### Current Implementation (Direct RPC):
```
User Action → Embedded Wallet → Sign Transaction → RPC → Blockchain
```

### Porto Relayer Integration (Gasless):
```
User Action → Prepare Intent → Porto Relayer → Gas Sponsorship → Blockchain
```

## 🎮 How Relayer Integration Works

1. **Intent Preparation**:
   - User initiates action (feed pet, play, battle)
   - App creates a `Call` object with target, data, value
   - Sends to relayer's `wallet_prepareCalls` endpoint

2. **Gas Sponsorship**:
   - Relayer checks eligibility for sponsorship
   - Returns context for signing
   - No ETH needed in user wallet

3. **Session Keys**:
   - Generated locally and stored securely
   - Allows signing without main wallet key
   - 24-hour expiry for security

4. **Transaction Execution**:
   - Signed intent sent to relayer
   - Relayer submits to blockchain with gas
   - Returns transaction ID for tracking

## 📱 Mobile-Specific Features

1. **Polyfills**: Proper crypto support for React Native
2. **Navigation**: Tab-based with emoji icons
3. **Haptic Feedback**: Physical feedback on actions
4. **Secure Storage**: Private keys in Expo SecureStore
5. **Offline Support**: Cached pet data, optimistic updates

## 🔐 Security Considerations

1. **Private Key Management**:
   - Never exposed to relayer
   - Stored encrypted on device
   - Session keys for reduced risk

2. **Transaction Validation**:
   - All transactions signed locally
   - Relayer cannot modify intents
   - User approval for each action

## 🚀 Next Steps for Full Relayer Integration

1. **Passkey Integration**:
   - Implement passkey authentication
   - Link passkeys to session keys
   - Enhanced security and UX

2. **Bundle Operations**:
   - Batch multiple actions (feed + play)
   - Reduced gas costs
   - Better user experience

3. **Smart Session Keys**:
   - Time-bound permissions
   - Action-specific limits
   - Automatic renewal

## 📊 Testing Status

### ✅ Completed:
- Contract deployment to RISE testnet
- Basic mobile app structure
- Embedded wallet generation
- Direct RPC transactions
- Porto relayer client setup

### 🔄 In Progress:
- Android emulator testing
- Gasless transaction testing
- Session key validation

### ⏳ Pending:
- Passkey authentication
- Full relayer integration testing
- Production deployment

## 🐛 Known Issues & Solutions

1. **Issue**: Expo dependencies version mismatch
   - **Solution**: Update packages to match Expo SDK version

2. **Issue**: Relayer signature validation
   - **Solution**: Implement proper EIP-712 signing

3. **Issue**: Session key persistence
   - **Solution**: Secure storage with expiry checks

## 📝 How to Test

1. **Start the app**:
   ```bash
   cd mobile && npm start
   ```

2. **Android Testing**:
   - Press 'a' in Expo CLI for Android emulator
   - Or scan QR code with Expo Go app

3. **Test Transactions**:
   - App auto-generates wallet
   - Fund wallet with testnet RISE
   - Create pet and test game actions

## 🔗 Important URLs

- **Contract**: https://explorer.testnet.riselabs.xyz/address/0xfaf41c4e338d5f712e4aa221c654f764036f168a
- **Faucet**: https://faucet.testnet.riselabs.xyz
- **Porto Docs**: https://porto.sh/rpc-server
- **RISE Docs**: https://docs.risechain.com

## 💡 Key Insights

The app is designed to work in two modes:
1. **Direct Mode**: Uses embedded wallet for standard transactions
2. **Relayer Mode**: Uses Porto for gasless, intent-based transactions

Currently, Direct Mode is fully implemented and tested. Relayer Mode infrastructure is in place but needs:
- Proper session key signing
- Passkey authentication setup
- Intent bundling implementation

The architecture is solid and follows best practices for mobile Web3 apps, with proper separation of concerns and security considerations.