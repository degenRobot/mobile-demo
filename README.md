# RISE FrenPet Mobile App

A tamagotchi-style virtual pet game built on RISE blockchain using React Native.

## Features

- 🐾 Create and name your virtual pet
- 🍎 Feed your pet to keep it healthy
- 🎮 Play with your pet to keep it happy
- ⚔️ Battle other pets for rewards
- 📈 Level up system with experience points
- 💰 Embedded wallet for easy blockchain interaction

## Project Structure

```
rise-frenpet-mobile/
├── contracts/          # Smart contracts (Solidity)
│   ├── src/           # Contract source files
│   └── script/        # Deployment scripts
├── mobile/            # React Native app
│   ├── src/          # App source code
│   │   ├── screens/  # App screens
│   │   ├── hooks/    # Custom React hooks
│   │   ├── lib/      # Utility libraries
│   │   └── config/   # Configuration files
│   └── assets/       # Images and assets
└── scripts/          # Deployment and sync scripts
```

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- Foundry (for smart contract development)
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Emulator

### 1. Install Dependencies

```bash
# Install mobile app dependencies
cd mobile
npm install
```

### 2. Deploy Smart Contract

```bash
# Set your private key
export PRIVATE_KEY=0x...

# Deploy to RISE testnet
./scripts/deploy.sh

# Sync contract address to mobile app
node scripts/sync-contract.js
```

### 3. Run the Mobile App

```bash
cd mobile

# For iOS
npm run ios

# For Android
npm run android

# For Expo Go
npm start
```

## How to Play

1. **Create Your Pet**: Launch the app and create your virtual pet with a unique name
2. **Keep It Alive**: Monitor happiness and hunger levels
3. **Feed Your Pet**: Costs 0.001 RISE - reduces hunger to 0
4. **Play With Pet**: Costs 0.0005 RISE - maximizes happiness
5. **Battle Others**: Challenge other pets for 0.002 RISE
6. **Level Up**: Gain experience from actions and battles

## Game Mechanics

- **Happiness**: Decreases by 10 points per hour
- **Hunger**: Increases by 10 points every 2 hours
- **Death**: Pet dies if happiness reaches 0 or hunger reaches 100
- **Battle Power**: Calculated from level, stats, and win streak
- **Experience**: Gain XP from feeding (10), playing (5), winning battles (50)

## Technical Stack

- **Mobile**: React Native, Expo, TypeScript
- **Blockchain**: RISE testnet, Viem, Wagmi
- **Smart Contracts**: Solidity 0.8.23, Foundry
- **Wallet**: Embedded wallet with secure key storage

## Contract Interaction

The app uses an embedded wallet that automatically generates and securely stores a private key. All transactions are signed locally and sent directly to the RISE testnet RPC.

### Key Functions

- `createPet(name)`: Create a new pet
- `feedPet()`: Feed your pet (0.001 RISE)
- `playWithPet()`: Play with your pet (0.0005 RISE)
- `initiateBattle(opponent)`: Challenge another pet (0.002 RISE)
- `getPetStats(address)`: View any pet's current stats

## Development

### Build for Production

```bash
cd mobile

# iOS
expo build:ios

# Android
expo build:android
```

### Testing

```bash
# Test contracts
cd contracts
forge test

# Run mobile app in development
cd mobile
npm start
```

## Troubleshooting

### No Balance
The embedded wallet needs RISE tokens. Get testnet tokens from the RISE faucet.

### Contract Not Found
Make sure to run `./scripts/deploy.sh` and `node scripts/sync-contract.js` after deployment.

### Build Errors
Clear cache and reinstall dependencies:
```bash
cd mobile
rm -rf node_modules
npm install
npx expo start -c
```

## License

MIT