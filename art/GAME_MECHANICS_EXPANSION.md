# 🎮 FrenPet Game Mechanics - Pokemon × Digimon Inspired

## Core Philosophy
Combine the collection and battle mechanics of Pokemon with the deep bonding and evolution branching of Digimon, all powered by gasless Web3 technology.

## 🧬 Evolution System

### Digimon-Style Branching Evolution
```
                    Ultimate Forms
                    /      |      \
              FireLord  Inferno  PhoenixKing
                 /         |         \
            Adult: Dragonite / Salamander
                      /    |    \
              Teen: Drake / Lizard / Wyrm
                        |
                   Child: Flamey
                        |
                    Baby: Sparky
                        |
                    Egg: Fire Egg
```

### Evolution Triggers
1. **Level-based** - Reach specific level thresholds
2. **Stat-based** - Different stats lead to different forms
   - High Attack → Aggressive evolution
   - High Defense → Tank evolution
   - High Speed → Agile evolution
3. **Care-based** - How you raise your pet matters
   - Happiness > 90% for 3 days → Angel evolution
   - Neglect for 2 days → Dark evolution
4. **Battle-based** - Combat experience shapes evolution
   - Win streak > 10 → Champion evolution
   - Many losses → Underdog evolution
5. **Item-based** - Special items trigger unique evolutions
   - Fire Stone → Pure Fire evolution
   - Moon Stone → Mystic evolution
6. **Time-based** - Evolve at specific times
   - Midnight evolution → Shadow form
   - Dawn evolution → Light form

## ⚔️ Battle System

### Type Chart (Pokemon-inspired)
```
         ATK →
    DEF ↓  FIR  WAT  NAT  ELE  SPI  NOR
    FIRE   0.5  0.5  2.0  1.0  1.0  1.0
    WATER  2.0  0.5  0.5  0.5  1.0  1.0
    NATURE 0.5  2.0  0.5  1.0  1.0  1.0
    ELEC   1.0  2.0  0.5  0.5  1.0  1.0
    SPIRIT 1.0  1.0  1.0  1.0  2.0  0.0
    NORMAL 1.0  1.0  1.0  1.0  0.5  1.0
```

### Combat Mechanics
```javascript
interface BattleSystem {
  // Base stats
  stats: {
    HP: number;      // Health Points
    ATK: number;     // Physical Attack
    DEF: number;     // Physical Defense
    SATK: number;    // Special Attack
    SDEF: number;    // Special Defense
    SPD: number;     // Speed (determines turn order)
  };
  
  // Move system
  moves: Move[];     // Max 4 moves
  energy: number;    // For special moves (0-100)
  
  // Battle modifiers
  statusEffects: StatusEffect[];
  weatherEffect?: Weather;
  terrain?: Terrain;
}

interface Move {
  name: string;
  type: ElementType;
  category: 'physical' | 'special' | 'status';
  power: number;
  accuracy: number;
  energyCost: number;
  effects?: {
    statusChance?: number;
    statusType?: StatusEffect;
    selfBuff?: StatModifier;
    enemyDebuff?: StatModifier;
  };
}
```

### Status Effects
- **Burn** 🔥 - Lose 5% HP per turn, -50% ATK
- **Freeze** ❄️ - Skip turn (20% thaw chance)
- **Poison** ☠️ - Lose 10% HP per turn
- **Paralysis** ⚡ - 25% chance to skip turn, -50% SPD
- **Sleep** 😴 - Skip 1-3 turns
- **Confusion** 💫 - 33% chance to hurt self

## 🏆 Progression Systems

### Trainer Level (Account-wide)
```
Level 1-10:   Novice Trainer    (1 active pet)
Level 11-20:  Pet Trainer       (2 active pets)
Level 21-30:  Expert Trainer    (3 active pets)
Level 31-40:  Master Trainer    (4 active pets)
Level 41-50:  Champion Trainer  (5 active pets)
Level 51+:    Legendary Trainer (6 active pets)
```

### Pet Bonding System
```javascript
interface BondingSystem {
  bondLevel: number; // 0-100
  bondPerks: {
    level10: "Stat boost +5%",
    level25: "Unlock special move",
    level50: "Evolution option unlocked",
    level75: "Battle sync (combo attacks)",
    level100: "Mega evolution available"
  };
  
  bondActivities: {
    feeding: +2,
    playing: +3,
    battling: +1,
    winning: +5,
    miniGames: +2,
    dailyLogin: +1
  };
}
```

## 🎯 Daily Activities & Quests

### Daily Quests
```
□ Feed your pet 3 times         [🍖 +50]
□ Play with your pet 2 times    [⚡ +30]
□ Win 1 battle                  [🏆 +100]
□ Complete 1 training session   [💪 +40]
□ Visit a friend's pet          [👥 +20]
```

### Weekly Challenges
```
□ Win 10 battles                [💎 +500]
□ Reach bond level 50           [🌟 Evolution Stone]
□ Complete all daily quests     [📦 Mystery Box]
□ Train all stats to 50+        [🎖️ Champion Badge]
```

## 🎲 Mini-Games

### 1. Pet Racing (Speed Training)
- Side-scrolling runner
- Collect items, avoid obstacles
- Rewards: Speed EXP, Coins

### 2. Battle Puzzle (Intelligence Training)
- Match-3 puzzle with battle elements
- Chain combos for damage multipliers
- Rewards: Special Attack EXP, Energy

### 3. Defense Challenge (Defense Training)
- Tower defense with your pet
- Block waves of enemies
- Rewards: Defense EXP, Shield items

### 4. Rhythm Battle (Attack Training)
- DDR-style rhythm game
- Hit notes to attack enemies
- Rewards: Attack EXP, Battle items

### 5. Memory Training (Special Defense Training)
- Simon Says with battle moves
- Remember and repeat sequences
- Rewards: Special Defense EXP, Rare items

## 🌍 World & Exploration

### Zones (Unlock as you progress)
1. **Starter Town** - Tutorial area, basic shops
2. **Forest Path** - Nature type pets, berries
3. **Volcano Ridge** - Fire type pets, fire stones
4. **Crystal Lake** - Water type pets, water stones
5. **Thunder Peak** - Electric type pets, thunder stones
6. **Spirit Grove** - Spirit type pets, rare evolutions
7. **Champion Arena** - PvP battles, tournaments

### Exploration Rewards
```javascript
interface ExplorationRewards {
  common: [
    "Berries", "Potions", "Pet Food"
  ],
  uncommon: [
    "Stat Boosters", "Evolution Hints", "Rare Food"
  ],
  rare: [
    "Evolution Stones", "Special Moves", "Cosmetics"
  ],
  legendary: [
    "Legendary Eggs", "Mega Stones", "Unique Evolutions"
  ]
}
```

## 💰 Economy System

### Currency Types
1. **Coins** 🪙 - Basic currency (earn from battles, quests)
2. **Gems** 💎 - Premium currency (rare rewards, achievements)
3. **Energy** ⚡ - Action points (regenerates over time)
4. **Battle Points** 🏆 - PvP currency (win battles)

### Earning Methods
```
Battle Victory:        50-100 🪙
Daily Quest:          20-50 🪙
Weekly Challenge:     200-500 🪙
Perfect Mini-game:    100 🪙 + 10 💎
Tournament Win:       1000 🪙 + 100 💎
Friend Referral:      50 💎
```

## 🤝 Social Features

### Friend System
- Add friends via QR code or username
- Visit friend's pets (energy gift)
- Trade items (not pets initially)
- Friend battles (practice mode)
- Co-op raids (future feature)

### Guild System (Future)
- Join guilds (max 50 members)
- Guild wars (large scale battles)
- Guild shop (exclusive items)
- Guild raids (boss battles)

## 🎭 Pet Personalities

### Personality Types (Affect stat growth)
```javascript
const personalities = {
  brave: { ATK: 1.1, DEF: 0.9 },
  timid: { SPD: 1.1, ATK: 0.9 },
  calm: { SDEF: 1.1, ATK: 0.9 },
  hardy: { DEF: 1.1, SATK: 0.9 },
  jolly: { SPD: 1.1, SATK: 0.9 },
  quirky: { /* No changes */ }
};
```

### Mood System
```
Happy 😊: +10% all stats
Normal 😐: No changes
Sad 😢: -10% speed, -5% attack
Angry 😠: +20% attack, -10% defense
Sleepy 😴: -20% speed, +10% defense
Excited 🤩: +15% speed, +5% all stats
```

## 🏅 Achievement System

### Categories
1. **Collector** - Own X different pets
2. **Battler** - Win X battles
3. **Caretaker** - Reach max happiness X times
4. **Explorer** - Discover all zones
5. **Evolutionist** - Unlock X evolutions
6. **Social** - Make X friends
7. **Champion** - Win tournaments

### Rewards
```
Bronze Achievement:   Title + 100 🪙
Silver Achievement:   Title + 50 💎
Gold Achievement:     Title + Exclusive Pet
Platinum Achievement: Title + Legendary Item
```

## 📱 Gasless Web3 Integration

### On-Chain Elements
- Pet NFTs (optional minting)
- Achievement NFTs
- Tournament records
- Trade history

### Off-Chain Elements (Gasless)
- All gameplay
- Pet stats and progression
- Battle results
- Daily activities

### Hybrid Approach
```javascript
// Gasless gameplay
async function playGame() {
  // All free, no gas needed
  await feedPet();
  await battle();
  await evolve();
}

// Optional on-chain
async function mintPetNFT() {
  // User choice, requires gas
  if (userWantsNFT) {
    await mintToBlockchain();
  }
}
```

## 🎯 Engagement Loops

### Short Term (Minutes)
- Feed pet
- Quick battle
- Mini-game session
- Check stats

### Medium Term (Hours)
- Complete daily quests
- Training sessions
- Exploration
- Friend visits

### Long Term (Days/Weeks)
- Evolution goals
- Tournament participation
- Collection completion
- Guild activities

## 📈 Monetization (Optional)

### Ethical Free-to-Play
- **NO Pay-to-Win** - All gameplay free
- **Cosmetics Only** - Skins, accessories
- **Time Savers** - Speed up evolutions
- **Expansion Packs** - New zones/pets

### Battle Pass System
```
Free Track:
- Basic rewards
- Coins, items
- 1 special pet

Premium Track:
- Exclusive cosmetics
- Bonus resources
- 3 special pets
- Early access features
```

---

*This expanded game design creates depth while maintaining the simple, nostalgic charm of pixel pets. The gasless Web3 integration ensures accessibility while optional NFT features provide ownership for interested players.*