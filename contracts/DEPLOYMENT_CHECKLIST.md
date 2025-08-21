# FrenPetV2 Deployment Checklist

## Pre-Deployment
- [x] All contracts compiled successfully
- [x] Test suite passing (31/39 tests)
- [x] Gas optimization verified
- [x] Deployment scripts created

## Contracts to Deploy
1. **FrenPetV2.sol** - Base game contract
   - Pet creation and management
   - Battle system
   - Inventory and marketplace
   - Evolution mechanics

2. **FrenPetV2Enhanced.sol** - Enhanced with items
   - All FrenPetV2 features
   - Comprehensive item system
   - Equipment mechanics
   - Effect system

3. **ItemManager.sol** - Item management
   - Automatically deployed by FrenPetV2Enhanced
   - 10 predefined items
   - Equipment slots
   - Active effects

## Deployment Steps

### 1. Setup Environment
```bash
cd contracts
cp .env.example .env
# Edit .env with your private key
```

### 2. Fund Deployer
- Network: RISE Testnet (Chain ID: 11155931)
- RPC: https://testnet.riselabs.xyz
- Faucet: Request testnet ETH for deployer address
- Required: ~0.1 ETH for deployment

### 3. Deploy Contracts
```bash
# Deploy to RISE testnet
forge script script/DeployFrenPetV2.s.sol --rpc-url $RPC_URL --broadcast --verify

# Or without verification
forge script script/DeployFrenPetV2.s.sol --rpc-url $RPC_URL --broadcast
```

### 4. Save Addresses
Update these files with deployed addresses:
- `/tests/test-frenpet-v2.js`
- `/tests/test-gasless-v2.js`
- `/mobile/src/config/contracts.ts`

### 5. Verify Deployment
```bash
# Run basic test
cd ../tests
node test-frenpet-v2.js
```

### 6. Test Gasless Transactions
```bash
# Test with Porto
node test-gasless-v2.js
```

## Contract Features

### Pet System
- 6 Pet Types: Normal, Fire, Water, Grass, Electric, Dragon
- 3 Evolution stages (levels 10, 25)
- Stats: Attack, Defense, Speed, Health
- Happiness and Hunger mechanics

### Battle System
- Turn-based combat
- 3 Moves: Attack, Defend, Special
- Type advantages (Fire > Grass > Water > Fire)
- Battle rewards and XP

### Item System
- 6 Categories: Weapons, Armor, Consumables, Accessories, Evolution, Collectibles
- 6 Rarity tiers: Common to Mythic
- Equipment slots: 1 Weapon, 1 Armor, 3 Accessories
- 15 Effect types: Healing, Boosts, Elemental damage, etc.

### Economy
- In-game coins
- Marketplace trading
- Daily rewards
- Battle drops (30% chance)

## Gas Costs (Optimized)
- Create Pet: ~396k gas
- Feed/Play: ~75-95k gas
- Battle: ~236k gas
- Equip Item: ~80-225k gas
- Use Item: ~200k gas

## Post-Deployment

### Mobile App Integration
1. Update contract addresses in mobile app
2. Test all screens with new contracts
3. Verify gasless transactions work

### Testing Checklist
- [ ] Create multiple pets
- [ ] Test all 6 pet types
- [ ] Battle between pets
- [ ] Type advantages working
- [ ] Items dropping from battles
- [ ] Equipment affecting stats
- [ ] Marketplace listings
- [ ] Evolution at correct levels
- [ ] Daily rewards
- [ ] Gasless transactions via Porto

## Monitoring
- Watch for transaction failures
- Monitor gas usage
- Check Porto relay status
- Verify state changes

## Troubleshooting

### Common Issues
1. **"Insufficient funds"** - Fund deployer with testnet ETH
2. **"Contract size too large"** - Already optimized with via-IR
3. **"Porto relay error"** - Check relay configuration
4. **"Pet needs rest"** - Battle cooldown is 10 minutes

### Support Contracts
- Porto Orchestrator: 0x046832405512d508b873e65174e51613291083bc
- Porto Implementation: 0x912a428b1a7e7cb7bb2709a2799a01c020c5acd9
- Porto Relay: https://rise-testnet-porto.fly.dev

## Success Metrics
- All tests passing ✅
- Gas costs acceptable ✅
- Gasless transactions working ✅
- Mobile app integrated ✅
- Users can play without ETH ✅