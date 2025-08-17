# FrenPet - Mobile Game on RISE

A tamagotchi-style pet game built with React Native for RISE blockchain.

## Quick Start

```bash
# Install dependencies
cd mobile
npm install

# Run on iOS
npm run ios

# Run on Android  
npm run android

# Run with Expo
npm start
```

## Features

- 🐾 Virtual pet with hunger & happiness mechanics
- 🚀 Gasless transactions via Porto relayer
- 💰 Built-in wallet (no external wallet needed)
- ⚔️ Battle system with other pets
- 📈 Experience & leveling system

## Project Structure

```
mobile/              # React Native app
├── src/
│   ├── screens/    # UI screens
│   ├── hooks/      # React hooks  
│   ├── lib/        # Core libraries
│   └── config/     # Configuration
contracts/          # Smart contracts
tests/             # Integration tests
```

## Smart Contract

**Deployed on RISE Testnet:**
- Address: `0xfaf41c4e338d5f712e4aa221c654f764036f168a`
- Network: RISE Testnet (Chain ID: 1123)
- RPC: https://testnet.riselabs.xyz

## Porto Integration

The app uses Porto relayer for gasless transactions:
- No gas fees required for users
- Transactions sponsored by relayer
- Automatic fallback to direct RPC if needed

## Game Mechanics

- **Feed Pet**: 0.001 RISE - Reduces hunger
- **Play**: 0.0005 RISE - Increases happiness  
- **Battle**: 0.002 RISE - Challenge other pets
- **Death**: Occurs if happiness = 0 or hunger = 100

## Development

```bash
# Deploy contract
export PRIVATE_KEY=0x...
./scripts/deploy.sh

# Sync contract address
node scripts/sync-contract.js

# Run tests
cd contracts && forge test
```

## License

MIT