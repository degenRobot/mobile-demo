# FrenPet Game Features Plan

## Core Game Loop
Transform FrenPet into a full Pokemon × Digimon inspired game with gasless Web3 mechanics.

## New Features

### 1. Battle System (Lobby)
- **Challenge System**: Players can create/accept battle challenges
- **Battle Mechanics**:
  - Turn-based combat
  - 4 moves per pet
  - Type advantages (Fire > Grass > Water > Fire)
  - XP rewards for winning
  - Item drops from battles

### 2. Inventory System
- **Collectible Items**:
  - Food items (restore hunger)
  - Toys (increase happiness)  
  - Battle items (boost stats)
  - Evolution stones
  - Rare cosmetics
- **Item Rarity**: Common, Rare, Epic, Legendary
- **Storage Limit**: Start with 20 slots, expandable

### 3. Marketplace
- **Trading Features**:
  - List items for sale
  - Buy items from other players
  - Auction system for rare items
  - Trade requests between players
- **Currency**: In-game coins earned from battles/daily tasks

### 4. Leaderboard
- **Rankings**:
  - Battle wins
  - Pet level
  - Items collected
  - Win streaks
- **Seasons**: Monthly resets with rewards
- **Rewards**: Top players get exclusive items

### 5. Additional Fun Actions
- **Mini-games**:
  - Pet racing
  - Treasure hunting
  - Memory games
  - Rhythm games (increase happiness)
  
- **Social Features**:
  - Friend system
  - Pet visits
  - Gift sending
  - Team battles
  
- **Daily Tasks**:
  - Feed pet 3 times
  - Win 2 battles
  - Collect daily reward
  - Play mini-game
  
- **Pet Evolution**:
  - Level 10: First evolution
  - Level 25: Second evolution
  - Special evolutions with items

## Technical Implementation

### Smart Contract Updates Needed
```solidity
// New functions needed
- createBattleChallenge()
- acceptBattle()
- executeMove()
- mintItem()
- transferItem()
- listItemForSale()
- purchaseItem()
- getLeaderboard()
- claimDailyReward()
```

### Navigation Structure
```
Bottom Tabs:
- Home (Pet Screen)
- Battle (Lobby)
- Inventory
- Market
- Profile (Stats/Leaderboard)
```

### Pixel Art Assets Needed
- Battle backgrounds
- Item sprites (32x32)
- UI icons (24x24)
- Pet evolution sprites
- Effect animations

## Implementation Priority
1. Navigation system
2. Toast notifications (replace processing screen)
3. Battle lobby + basic combat
4. Inventory system
5. Marketplace
6. Leaderboard
7. Mini-games & social features

## Gasless UX Improvements
- Instant feedback with optimistic updates
- Background transaction processing
- Success/failure toasts
- No interruption to gameplay