# FrenPet Mobile - Tamagotchi Game on RISE Blockchain

A mobile tamagotchi-style pet game with **TRULY GASLESS** transactions via Porto relay - users need 0 ETH!

## 🚀 Quick Start

```bash
# Install dependencies
cd mobile
npm install

# Run on iOS/Android
npx expo run:ios
# or
npx expo run:android
```

## 🎉 ZERO ETH REQUIRED!

**Porto relay provides truly gasless transactions - users need 0 ETH, not even for initial setup!**

✅ No wallet funding needed  
✅ No faucets required  
✅ Instant onboarding  
✅ True Web2 UX  

## 📋 Key Information

- **Contract**: `0x3FDE139A94eEf14C4eBa229FDC80A54f7F5Fbf25` (FrenPetSimple - no payable functions)
- **Network**: RISE Testnet (Chain ID: 11155931)
- **RPC**: https://testnet.riselabs.xyz
- **Porto Relay**: https://rise-testnet-porto.fly.dev

## 📁 Project Structure

```
mobile-demo/
├── mobile/               # React Native app
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── hooks/       # React hooks (useFrenPet, usePorto)
│   │   ├── lib/         # Core libraries
│   │   └── screens/     # App screens
├── contracts/           # Smart contracts
├── tests/              # Integration tests
└── external/porto-relay/ # Porto relay implementation
```

## 🎮 Features

- Create and name your pet - **FREE!**
- Feed your pet - **FREE!**
- Play with your pet - **FREE!**
- Level up and gain experience
- All powered by gasless transactions via Porto

## 📚 Documentation

- [GASLESS_TRULY_FREE.md](./GASLESS_TRULY_FREE.md) - Proof that users need 0 ETH
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Technical architecture and Porto integration
- [PORTO_INTEGRATION.md](./PORTO_INTEGRATION.md) - Porto relay setup and API reference
- [TESTING_GUIDE.md](./TESTING_GUIDE.md) - How to test gasless functionality

## 🧪 Testing Gasless Transactions

```bash
# Prove users need 0 ETH
cd tests
node test-zero-eth-gasless.js

# Test mobile flow
node test-mobile-gasless.js

# Run mobile app tests
cd mobile
npm test
```

## 📱 Mobile Development

### Running on Android

```bash
cd mobile

# Make scripts executable
chmod +x start-with-logs.sh debug-android.sh

# Start with enhanced logging
./start-with-logs.sh

# Or for Android specific debugging
./debug-android.sh
```

### Running on iOS

```bash
cd mobile
npx expo run:ios
```

### Prerequisites

- Node.js 18+ or 20+
- Android Studio (for Android development)
- Xcode (for iOS development)
- Expo CLI (`npm install -g expo-cli`)
- ~~ETH for gas~~ **NOTHING! Porto pays for everything!**

## 🔧 Development

See [ARCHITECTURE.md](./ARCHITECTURE.md) for technical details and development setup.

## ✨ Key Achievement

This app demonstrates truly gasless Web3 gaming:
- Users download the app
- Create a wallet instantly (no funding)
- Start playing immediately
- Never worry about gas fees
- Porto relay handles everything!