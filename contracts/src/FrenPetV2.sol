// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/**
 * @title FrenPetV2
 * @notice Complete FrenPet game with battle, inventory, marketplace, items, and evolution
 * @dev All features consolidated into a single contract
 */
contract FrenPetV2 {
    // ============ Types ============
    
    enum PetType {
        None,
        Normal,
        Fire,
        Water,
        Grass,
        Electric,
        Dragon
    }
    
    enum BattleMove {
        None,
        Attack,
        Defend,
        Special
    }
    
    enum ItemCategory {
        None,
        Weapon,
        Armor,
        Consumable,
        Accessory,
        Evolution,
        Collectible
    }
    
    enum ItemRarity {
        Common,
        Uncommon,
        Rare,
        Epic,
        Legendary,
        Mythic
    }
    
    enum EffectType {
        None,
        HealInstant,
        HealOverTime,
        BoostAttack,
        BoostDefense,
        BoostSpeed,
        BoostExperience,
        BoostHappiness,
        ReduceHunger,
        ElementalDamage,
        CriticalChance,
        DamageReduction,
        LifeSteal,
        Immunity,
        Resurrection
    }
    
    // ============ Structures ============
    
    struct Pet {
        string name;
        PetType petType;
        uint8 evolutionStage;
        uint256 level;
        uint256 experience;
        uint256 lastHappiness;
        uint256 lastHunger;
        uint256 lastFed;
        uint256 lastPlayed;
        uint256 lastTrained;
        uint256 lastBattle;
        bool isAlive;
        uint256 attack;
        uint256 defense;
        uint256 speed;
        uint256 health;
        uint256 maxHealth;
    }
    
    struct PetStats {
        uint256 attack;
        uint256 defense;
        uint256 speed;
        uint256 health;
    }
    
    struct Inventory {
        uint256 basicFood;
        uint256 coins;
        uint256 healthPotions;
        uint256 reviveTokens;
        uint256 experienceBoosts;
    }
    
    struct Battle {
        address challenger;
        address opponent;
        BattleMove challengerMove;
        BattleMove opponentMove;
        address winner;
        bool isActive;
        uint256 startTime;
    }
    
    struct MarketListing {
        address seller;
        uint256 itemId;
        uint256 quantity;
        uint256 price;
        bool active;
    }
    
    struct Item {
        string name;
        ItemCategory category;
        ItemRarity rarity;
        uint256 attackBonus;
        uint256 defenseBonus;
        uint256 speedBonus;
        uint256 healthBonus;
        EffectType effect;
        uint256 effectValue;
        uint256 effectDuration;
        bool tradeable;
        uint256 requiredLevel;
        string description;
    }
    
    struct Equipment {
        uint256 weapon;
        uint256 armor;
        uint256 accessory1;
        uint256 accessory2;
        uint256 accessory3;
    }
    
    struct ActiveEffect {
        EffectType effectType;
        uint256 value;
        uint256 endTime;
        uint256 itemId;
    }
    
    // ============ State Variables ============
    
    mapping(address => Pet) public pets;
    mapping(address => bool) public hasPet;
    mapping(address => Inventory) public inventories;
    mapping(uint256 => Battle) public battles;
    mapping(address => uint256) public activeBattles;
    mapping(uint256 => MarketListing) public marketplaceListings;
    mapping(address => uint256) public lastDailyReward;
    
    // Item system
    mapping(uint256 => Item) public items;
    mapping(address => mapping(uint256 => uint256)) public playerItems;
    mapping(address => Equipment) public playerEquipment;
    mapping(address => ActiveEffect[]) public activeEffects;
    uint256 public nextItemId = 1;
    
    uint256 public nextBattleId = 1;
    uint256 public nextListingId = 1;
    
    // Game constants
    uint256 public constant COINS_PER_WIN = 50;
    uint256 public constant COINS_PER_LEVEL = 10;
    uint256 public constant HAPPINESS_DECAY_RATE = 1 hours;
    uint256 public constant HUNGER_INCREASE_RATE = 2 hours;
    uint256 public constant BATTLE_COOLDOWN = 10 minutes;
    uint256 public constant TRAINING_COOLDOWN = 1 minutes;
    uint256 public constant ITEM_DROP_CHANCE = 30;
    uint256 public constant RARE_DROP_CHANCE = 5;
    uint256 public constant DAILY_REWARD_COOLDOWN = 24 hours;
    
    // ============ Events ============
    
    event PetCreated(address indexed owner, string name, PetType petType);
    event PetEvolved(address indexed owner, PetType from, PetType to, uint256 stage);
    event PetFed(address indexed owner, uint256 newHunger);
    event PetPlayed(address indexed owner, uint256 newHappiness);
    event PetTrained(address indexed owner, uint256 expGained);
    event PetLevelUp(address indexed owner, uint256 newLevel);
    event PetDied(address indexed owner, string name);
    event PetRevived(address indexed owner, string name);
    
    event BattleStarted(uint256 indexed battleId, address challenger, address opponent);
    event BattleCompleted(uint256 indexed battleId, address winner, uint256 rewards);
    event BattleMoveSubmitted(uint256 indexed battleId, address player, BattleMove move);
    
    event ItemCreated(uint256 indexed itemId, string name, ItemCategory category);
    event ItemDropped(address indexed owner, uint256 itemId, ItemRarity rarity);
    event ItemEquipped(address indexed owner, uint256 itemId);
    event ItemUsed(address indexed owner, uint256 itemId);
    event ItemListed(uint256 indexed listingId, address seller, uint256 itemId, uint256 price);
    event ItemPurchased(uint256 indexed listingId, address buyer);
    
    event DailyRewardClaimed(address indexed player, uint256 coins, uint256 itemId);
    
    // ============ Modifiers ============
    
    modifier onlyPetOwner() {
        require(hasPet[msg.sender], "You don't have a pet");
        require(isPetAlive(msg.sender), "Your pet needs to be revived");
        _;
    }
    
    modifier noBattleActive() {
        require(activeBattles[msg.sender] == 0, "Finish your current battle first");
        _;
    }
    
    // ============ Constructor ============
    
    constructor() {
        _initializeDefaultItems();
    }
    
    // ============ Pet Management ============
    
    function createPet(string memory _name, uint8 _type) external {
        require(bytes(_name).length > 0 && bytes(_name).length <= 20, "Invalid name length");
        require(_type > 0 && _type <= uint8(PetType.Dragon), "Invalid pet type");
        
        if (hasPet[msg.sender]) {
            require(!isPetAlive(msg.sender), "Your current pet is still alive");
        }
        
        PetType petType = PetType(_type);
        PetStats memory baseStats = getBaseStats(petType);
        
        pets[msg.sender] = Pet({
            name: _name,
            petType: petType,
            evolutionStage: 0,
            level: 1,
            experience: 0,
            lastHappiness: 100,
            lastHunger: 50,
            lastFed: block.timestamp,
            lastPlayed: block.timestamp,
            lastTrained: block.timestamp,
            lastBattle: 0,
            isAlive: true,
            attack: baseStats.attack,
            defense: baseStats.defense,
            speed: baseStats.speed,
            health: baseStats.health,
            maxHealth: baseStats.health
        });
        
        hasPet[msg.sender] = true;
        
        // Give starting inventory
        inventories[msg.sender].basicFood = 5;
        inventories[msg.sender].coins = 100;
        inventories[msg.sender].healthPotions = 2;
        
        emit PetCreated(msg.sender, _name, petType);
    }
    
    function feedPet(uint256 foodType) external onlyPetOwner {
        Pet storage pet = pets[msg.sender];
        _updatePetStatus(msg.sender);
        
        uint256 hungerReduction;
        if (foodType == 0) {
            // Basic food
            require(inventories[msg.sender].basicFood > 0, "No basic food");
            inventories[msg.sender].basicFood--;
            hungerReduction = 20;
        } else {
            revert("Invalid food type");
        }
        
        pet.lastHunger = pet.lastHunger > hungerReduction ? pet.lastHunger - hungerReduction : 0;
        pet.lastFed = block.timestamp;
        
        emit PetFed(msg.sender, pet.lastHunger);
    }
    
    function playWithPet() external onlyPetOwner {
        Pet storage pet = pets[msg.sender];
        _updatePetStatus(msg.sender);
        
        pet.lastHappiness = pet.lastHappiness + 20 > 100 ? 100 : pet.lastHappiness + 20;
        pet.lastPlayed = block.timestamp;
        pet.experience += 5;
        
        _checkLevelUp(msg.sender);
        emit PetPlayed(msg.sender, pet.lastHappiness);
    }
    
    function trainPet() external onlyPetOwner {
        Pet storage pet = pets[msg.sender];
        require(block.timestamp >= pet.lastTrained + TRAINING_COOLDOWN, "Pet is resting");
        
        _updatePetStatus(msg.sender);
        
        uint256 expGain = 10 + (pet.level * 2);
        pet.experience += expGain;
        pet.lastTrained = block.timestamp;
        
        // Training improves stats slightly
        pet.attack += 1;
        pet.defense += 1;
        pet.speed += 1;
        
        _checkLevelUp(msg.sender);
        emit PetTrained(msg.sender, expGain);
    }
    
    function revivePet() external {
        require(hasPet[msg.sender], "You don't have a pet");
        require(!pets[msg.sender].isAlive, "Pet is already alive");
        require(inventories[msg.sender].reviveTokens > 0, "No revive tokens");
        
        inventories[msg.sender].reviveTokens--;
        Pet storage pet = pets[msg.sender];
        
        pet.isAlive = true;
        pet.health = pet.maxHealth / 2;
        pet.lastHappiness = 50;
        pet.lastHunger = 50;
        pet.lastFed = block.timestamp;
        pet.lastPlayed = block.timestamp;
        
        emit PetRevived(msg.sender, pet.name);
    }
    
    // ============ Battle System ============
    
    function createBattleChallenge(address _opponent) external onlyPetOwner noBattleActive returns (uint256) {
        require(_opponent != msg.sender, "Cannot battle yourself");
        require(hasPet[_opponent], "Opponent doesn't have a pet");
        require(isPetAlive(_opponent), "Opponent's pet is not alive");
        require(activeBattles[_opponent] == 0, "Opponent is in another battle");
        
        Pet storage challengerPet = pets[msg.sender];
        require(block.timestamp >= challengerPet.lastBattle + BATTLE_COOLDOWN, "Pet needs rest");
        
        uint256 battleId = nextBattleId++;
        
        battles[battleId] = Battle({
            challenger: msg.sender,
            opponent: _opponent,
            challengerMove: BattleMove.None,
            opponentMove: BattleMove.None,
            winner: address(0),
            isActive: true,
            startTime: block.timestamp
        });
        
        activeBattles[msg.sender] = battleId;
        activeBattles[_opponent] = battleId;
        
        emit BattleStarted(battleId, msg.sender, _opponent);
        return battleId;
    }
    
    function submitBattleMove(uint8 _move) external {
        require(_move >= 1 && _move <= uint8(BattleMove.Special), "Invalid move");
        uint256 battleId = activeBattles[msg.sender];
        require(battleId > 0, "Not in battle");
        
        Battle storage battle = battles[battleId];
        require(battle.isActive, "Battle not active");
        
        BattleMove move = BattleMove(_move);
        
        if (msg.sender == battle.challenger) {
            require(battle.challengerMove == BattleMove.None, "Already submitted move");
            battle.challengerMove = move;
        } else if (msg.sender == battle.opponent) {
            require(battle.opponentMove == BattleMove.None, "Already submitted move");
            battle.opponentMove = move;
        } else {
            revert("Not a participant");
        }
        
        emit BattleMoveSubmitted(battleId, msg.sender, move);
        
        // If both moves submitted, resolve battle
        if (battle.challengerMove != BattleMove.None && battle.opponentMove != BattleMove.None) {
            _resolveBattle(battleId);
        }
    }
    
    function _resolveBattle(uint256 battleId) private {
        Battle storage battle = battles[battleId];
        
        address winner = _calculateBattleWinner(
            battle.challenger,
            battle.opponent,
            battle.challengerMove,
            battle.opponentMove
        );
        
        battle.winner = winner;
        battle.isActive = false;
        
        // Update battle timestamps
        pets[battle.challenger].lastBattle = block.timestamp;
        pets[battle.opponent].lastBattle = block.timestamp;
        
        // Clear active battles
        activeBattles[battle.challenger] = 0;
        activeBattles[battle.opponent] = 0;
        
        // Reward winner
        if (winner != address(0)) {
            inventories[winner].coins += COINS_PER_WIN;
            pets[winner].experience += 20;
            _checkLevelUp(winner);
            
            // Random item drop
            if (_random(100) < ITEM_DROP_CHANCE) {
                uint256 itemId = _getRandomDropItem();
                playerItems[winner][itemId]++;
                emit ItemDropped(winner, itemId, items[itemId].rarity);
            }
        }
        
        emit BattleCompleted(battleId, winner, COINS_PER_WIN);
    }
    
    function _calculateBattleWinner(
        address challenger,
        address opponent,
        BattleMove challengerMove,
        BattleMove opponentMove
    ) private view returns (address) {
        PetStats memory challengerStats = getEnhancedPetStats(challenger);
        PetStats memory opponentStats = getEnhancedPetStats(opponent);
        
        uint256 challengerScore = _calculateBattleScore(
            challengerStats,
            challengerMove,
            pets[challenger].petType,
            pets[opponent].petType
        );
        
        uint256 opponentScore = _calculateBattleScore(
            opponentStats,
            opponentMove,
            pets[opponent].petType,
            pets[challenger].petType
        );
        
        if (challengerScore > opponentScore) {
            return challenger;
        } else if (opponentScore > challengerScore) {
            return opponent;
        } else {
            // Tie - higher speed wins
            return challengerStats.speed >= opponentStats.speed ? challenger : opponent;
        }
    }
    
    function _calculateBattleScore(
        PetStats memory stats,
        BattleMove move,
        PetType attackerType,
        PetType defenderType
    ) private pure returns (uint256) {
        uint256 score = 0;
        
        if (move == BattleMove.Attack) {
            score = stats.attack * 2 + stats.speed;
        } else if (move == BattleMove.Defend) {
            score = stats.defense * 3 + stats.health / 10;
        } else if (move == BattleMove.Special) {
            score = stats.attack + stats.speed * 2;
        }
        
        // Type advantages
        uint256 multiplier = _getTypeAdvantage(attackerType, defenderType);
        score = (score * multiplier) / 100;
        
        return score;
    }
    
    function _getTypeAdvantage(PetType attacker, PetType defender) private pure returns (uint256) {
        if (attacker == PetType.Fire && defender == PetType.Grass) return 150;
        if (attacker == PetType.Water && defender == PetType.Fire) return 150;
        if (attacker == PetType.Grass && defender == PetType.Water) return 150;
        if (attacker == PetType.Electric && defender == PetType.Water) return 150;
        if (attacker == PetType.Dragon && defender != PetType.Dragon) return 125;
        
        if (attacker == PetType.Fire && defender == PetType.Water) return 50;
        if (attacker == PetType.Water && defender == PetType.Grass) return 50;
        if (attacker == PetType.Grass && defender == PetType.Fire) return 50;
        if (attacker == PetType.Water && defender == PetType.Electric) return 50;
        
        return 100; // No advantage
    }
    
    // ============ Item System ============
    
    function _initializeDefaultItems() private {
        // Weapons
        _createItem("Wooden Sword", ItemCategory.Weapon, ItemRarity.Common, 5, 0, 0, 0, EffectType.None, 0, 0, true, 1);
        _createItem("Iron Sword", ItemCategory.Weapon, ItemRarity.Uncommon, 10, 0, 2, 0, EffectType.None, 0, 0, true, 5);
        _createItem("Dragon Blade", ItemCategory.Weapon, ItemRarity.Legendary, 25, 5, 5, 0, EffectType.ElementalDamage, 10, 0, true, 15);
        
        // Armor
        _createItem("Leather Armor", ItemCategory.Armor, ItemRarity.Common, 0, 5, 0, 10, EffectType.None, 0, 0, true, 1);
        _createItem("Steel Armor", ItemCategory.Armor, ItemRarity.Uncommon, 0, 15, 0, 25, EffectType.DamageReduction, 10, 0, true, 8);
        
        // Consumables
        _createItem("Health Potion", ItemCategory.Consumable, ItemRarity.Common, 0, 0, 0, 0, EffectType.HealInstant, 50, 0, true, 1);
        _createItem("Strength Elixir", ItemCategory.Consumable, ItemRarity.Rare, 0, 0, 0, 0, EffectType.BoostAttack, 20, 300, true, 5);
        
        // Accessories
        _createItem("Speed Boots", ItemCategory.Accessory, ItemRarity.Uncommon, 0, 0, 10, 0, EffectType.None, 0, 0, true, 3);
        _createItem("Lucky Charm", ItemCategory.Accessory, ItemRarity.Rare, 5, 5, 5, 5, EffectType.CriticalChance, 15, 0, true, 10);
        
        // Evolution items
        _createItem("Fire Stone", ItemCategory.Evolution, ItemRarity.Epic, 0, 0, 0, 0, EffectType.None, 0, 0, false, 10);
    }
    
    function _createItem(
        string memory name,
        ItemCategory category,
        ItemRarity rarity,
        uint256 attack,
        uint256 defense,
        uint256 speed,
        uint256 health,
        EffectType effect,
        uint256 effectValue,
        uint256 effectDuration,
        bool tradeable,
        uint256 requiredLevel
    ) private {
        items[nextItemId] = Item({
            name: name,
            category: category,
            rarity: rarity,
            attackBonus: attack,
            defenseBonus: defense,
            speedBonus: speed,
            healthBonus: health,
            effect: effect,
            effectValue: effectValue,
            effectDuration: effectDuration,
            tradeable: tradeable,
            requiredLevel: requiredLevel,
            description: ""
        });
        
        emit ItemCreated(nextItemId, name, category);
        nextItemId++;
    }
    
    function equipItemToPet(uint256 itemId) external onlyPetOwner {
        require(playerItems[msg.sender][itemId] > 0, "You don't own this item");
        Item memory item = items[itemId];
        require(pets[msg.sender].level >= item.requiredLevel, "Pet level too low");
        
        Equipment storage equipment = playerEquipment[msg.sender];
        
        if (item.category == ItemCategory.Weapon) {
            if (equipment.weapon != 0) {
                playerItems[msg.sender][equipment.weapon]++;
            }
            equipment.weapon = itemId;
        } else if (item.category == ItemCategory.Armor) {
            if (equipment.armor != 0) {
                playerItems[msg.sender][equipment.armor]++;
            }
            equipment.armor = itemId;
        } else if (item.category == ItemCategory.Accessory) {
            if (equipment.accessory1 == 0) {
                equipment.accessory1 = itemId;
            } else if (equipment.accessory2 == 0) {
                equipment.accessory2 = itemId;
            } else if (equipment.accessory3 == 0) {
                equipment.accessory3 = itemId;
            } else {
                revert("All accessory slots full");
            }
        } else {
            revert("Item cannot be equipped");
        }
        
        playerItems[msg.sender][itemId]--;
        emit ItemEquipped(msg.sender, itemId);
    }
    
    function useItem(uint256 itemId) external onlyPetOwner {
        require(playerItems[msg.sender][itemId] > 0, "You don't own this item");
        Item memory item = items[itemId];
        require(item.category == ItemCategory.Consumable, "Not consumable");
        
        Pet storage pet = pets[msg.sender];
        
        if (item.effect == EffectType.HealInstant) {
            pet.health = pet.health + item.effectValue > pet.maxHealth ? 
                pet.maxHealth : pet.health + item.effectValue;
        } else if (item.effectDuration > 0) {
            activeEffects[msg.sender].push(ActiveEffect({
                effectType: item.effect,
                value: item.effectValue,
                endTime: block.timestamp + item.effectDuration,
                itemId: itemId
            }));
        }
        
        playerItems[msg.sender][itemId]--;
        emit ItemUsed(msg.sender, itemId);
    }
    
    // ============ Marketplace ============
    
    function listItemForSale(uint256 itemId, uint256 quantity, uint256 price) external returns (uint256) {
        require(playerItems[msg.sender][itemId] >= quantity, "Insufficient items");
        require(items[itemId].tradeable, "Item not tradeable");
        require(price > 0, "Price must be positive");
        
        uint256 listingId = nextListingId++;
        
        marketplaceListings[listingId] = MarketListing({
            seller: msg.sender,
            itemId: itemId,
            quantity: quantity,
            price: price,
            active: true
        });
        
        playerItems[msg.sender][itemId] -= quantity;
        
        emit ItemListed(listingId, msg.sender, itemId, price);
        return listingId;
    }
    
    function purchaseFromMarketplace(uint256 listingId) external {
        MarketListing storage listing = marketplaceListings[listingId];
        require(listing.active, "Listing not active");
        require(inventories[msg.sender].coins >= listing.price, "Insufficient coins");
        
        inventories[msg.sender].coins -= listing.price;
        inventories[listing.seller].coins += listing.price;
        
        playerItems[msg.sender][listing.itemId] += listing.quantity;
        listing.active = false;
        
        emit ItemPurchased(listingId, msg.sender);
    }
    
    function cancelListing(uint256 listingId) external {
        MarketListing storage listing = marketplaceListings[listingId];
        require(listing.seller == msg.sender, "Not your listing");
        require(listing.active, "Listing not active");
        
        playerItems[msg.sender][listing.itemId] += listing.quantity;
        listing.active = false;
    }
    
    // ============ Evolution System ============
    
    function canEvolve(address owner) public view returns (bool) {
        Pet memory pet = pets[owner];
        if (pet.evolutionStage >= 2) return false;
        
        if (pet.evolutionStage == 0 && pet.level >= 10) return true;
        if (pet.evolutionStage == 1 && pet.level >= 25) return true;
        
        return false;
    }
    
    function evolvePet() external onlyPetOwner {
        require(canEvolve(msg.sender), "Cannot evolve yet");
        
        Pet storage pet = pets[msg.sender];
        PetType oldType = pet.petType;
        
        pet.evolutionStage++;
        
        // Evolution bonuses
        pet.attack += 10;
        pet.defense += 10;
        pet.speed += 5;
        pet.maxHealth += 50;
        pet.health = pet.maxHealth;
        
        // Special evolution for dragons
        if (pet.petType == PetType.Normal && pet.evolutionStage == 2) {
            pet.petType = PetType.Dragon;
        }
        
        emit PetEvolved(msg.sender, oldType, pet.petType, pet.evolutionStage);
    }
    
    // ============ Daily Rewards ============
    
    function claimDailyReward() external onlyPetOwner {
        require(lastDailyReward[msg.sender] == 0 || block.timestamp >= lastDailyReward[msg.sender] + DAILY_REWARD_COOLDOWN, "Already claimed today");
        
        lastDailyReward[msg.sender] = block.timestamp;
        
        // Base reward
        uint256 coins = 100 + (pets[msg.sender].level * 10);
        inventories[msg.sender].coins += coins;
        inventories[msg.sender].basicFood += 3;
        
        // Random item chance
        uint256 itemId = 0;
        if (_random(100) < 20) {
            itemId = _getRandomDropItem();
            playerItems[msg.sender][itemId]++;
        }
        
        emit DailyRewardClaimed(msg.sender, coins, itemId);
    }
    
    // ============ Helper Functions ============
    
    function _updatePetStatus(address owner) private {
        Pet storage pet = pets[owner];
        
        uint256 timeSinceFed = block.timestamp - pet.lastFed;
        uint256 timeSincePlayed = block.timestamp - pet.lastPlayed;
        
        // Update hunger (increases over time)
        uint256 hungerIncrease = timeSinceFed / HUNGER_INCREASE_RATE * 10;
        pet.lastHunger = pet.lastHunger + hungerIncrease > 100 ? 100 : pet.lastHunger + hungerIncrease;
        
        // Update happiness (decreases over time)
        uint256 happinessDecrease = timeSincePlayed / HAPPINESS_DECAY_RATE * 10;
        pet.lastHappiness = pet.lastHappiness > happinessDecrease ? 
            pet.lastHappiness - happinessDecrease : 0;
        
        // Check if pet dies
        if (pet.lastHunger >= 100 || pet.lastHappiness == 0) {
            pet.isAlive = false;
            emit PetDied(owner, pet.name);
        }
    }
    
    function _checkLevelUp(address owner) private {
        Pet storage pet = pets[owner];
        uint256 requiredExp = pet.level * 100;
        
        while (pet.experience >= requiredExp) {
            pet.experience -= requiredExp;
            pet.level++;
            
            // Level up bonuses
            pet.attack += 2;
            pet.defense += 2;
            pet.speed += 1;
            pet.maxHealth += 10;
            pet.health = pet.maxHealth;
            
            inventories[owner].coins += COINS_PER_LEVEL;
            
            emit PetLevelUp(owner, pet.level);
            requiredExp = pet.level * 100;
        }
    }
    
    function _getRandomDropItem() private view returns (uint256) {
        uint256 rand = _random(100);
        if (rand < 60) return 1 + (rand % 3); // Common items
        if (rand < 85) return 4 + (rand % 2); // Uncommon items
        if (rand < 95) return 6 + (rand % 2); // Rare items
        return 8 + (rand % 2); // Epic items
    }
    
    function _random(uint256 max) private view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, msg.sender))) % max;
    }
    
    function isPetAlive(address owner) public view returns (bool) {
        if (!hasPet[owner]) return false;
        Pet memory pet = pets[owner];
        
        uint256 timeSinceFed = block.timestamp - pet.lastFed;
        uint256 timeSincePlayed = block.timestamp - pet.lastPlayed;
        
        uint256 currentHunger = pet.lastHunger + (timeSinceFed / HUNGER_INCREASE_RATE * 10);
        uint256 currentHappiness = pet.lastHappiness > (timeSincePlayed / HAPPINESS_DECAY_RATE * 10) ?
            pet.lastHappiness - (timeSincePlayed / HAPPINESS_DECAY_RATE * 10) : 0;
        
        return pet.isAlive && currentHunger < 100 && currentHappiness > 0;
    }
    
    function getBaseStats(PetType petType) public pure returns (PetStats memory) {
        if (petType == PetType.Fire) return PetStats(15, 10, 12, 100);
        if (petType == PetType.Water) return PetStats(12, 15, 10, 110);
        if (petType == PetType.Grass) return PetStats(10, 12, 15, 105);
        if (petType == PetType.Electric) return PetStats(14, 8, 18, 90);
        if (petType == PetType.Dragon) return PetStats(18, 14, 14, 120);
        return PetStats(10, 10, 10, 100); // Normal
    }
    
    function getEnhancedPetStats(address owner) public view returns (PetStats memory) {
        Pet memory pet = pets[owner];
        Equipment memory equipment = playerEquipment[owner];
        
        uint256 totalAttack = pet.attack;
        uint256 totalDefense = pet.defense;
        uint256 totalSpeed = pet.speed;
        uint256 totalHealth = pet.maxHealth;
        
        // Add equipment bonuses
        if (equipment.weapon != 0) {
            Item memory weapon = items[equipment.weapon];
            totalAttack += weapon.attackBonus;
            totalDefense += weapon.defenseBonus;
            totalSpeed += weapon.speedBonus;
            totalHealth += weapon.healthBonus;
        }
        
        if (equipment.armor != 0) {
            Item memory armor = items[equipment.armor];
            totalAttack += armor.attackBonus;
            totalDefense += armor.defenseBonus;
            totalSpeed += armor.speedBonus;
            totalHealth += armor.healthBonus;
        }
        
        // Add accessory bonuses
        uint256[3] memory accessories = [
            equipment.accessory1,
            equipment.accessory2,
            equipment.accessory3
        ];
        
        for (uint i = 0; i < 3; i++) {
            if (accessories[i] != 0) {
                Item memory accessory = items[accessories[i]];
                totalAttack += accessory.attackBonus;
                totalDefense += accessory.defenseBonus;
                totalSpeed += accessory.speedBonus;
                totalHealth += accessory.healthBonus;
            }
        }
        
        // Apply active effects
        for (uint i = 0; i < activeEffects[owner].length; i++) {
            ActiveEffect memory effect = activeEffects[owner][i];
            if (block.timestamp <= effect.endTime) {
                if (effect.effectType == EffectType.BoostAttack) {
                    totalAttack += effect.value;
                } else if (effect.effectType == EffectType.BoostDefense) {
                    totalDefense += effect.value;
                } else if (effect.effectType == EffectType.BoostSpeed) {
                    totalSpeed += effect.value;
                }
            }
        }
        
        return PetStats(totalAttack, totalDefense, totalSpeed, totalHealth);
    }
    
    // ============ View Functions ============
    
    function getPetStats(address owner) external view returns (
        string memory name,
        uint256 level,
        uint256 experience,
        uint256 happiness,
        uint256 hunger,
        bool isAlive,
        uint8 petType,
        uint8 evolutionStage
    ) {
        Pet memory pet = pets[owner];
        
        uint256 timeSinceFed = block.timestamp - pet.lastFed;
        uint256 timeSincePlayed = block.timestamp - pet.lastPlayed;
        
        uint256 currentHunger = pet.lastHunger + (timeSinceFed / HUNGER_INCREASE_RATE * 10);
        currentHunger = currentHunger > 100 ? 100 : currentHunger;
        
        uint256 currentHappiness = pet.lastHappiness > (timeSincePlayed / HAPPINESS_DECAY_RATE * 10) ?
            pet.lastHappiness - (timeSincePlayed / HAPPINESS_DECAY_RATE * 10) : 0;
        
        return (
            pet.name,
            pet.level,
            pet.experience,
            currentHappiness,
            currentHunger,
            isPetAlive(owner),
            uint8(pet.petType),
            pet.evolutionStage
        );
    }
    
    function getInventory(address owner) external view returns (
        uint256 basicFood,
        uint256 coins,
        uint256 healthPotions,
        uint256 reviveTokens,
        uint256 experienceBoosts
    ) {
        Inventory memory inv = inventories[owner];
        return (inv.basicFood, inv.coins, inv.healthPotions, inv.reviveTokens, inv.experienceBoosts);
    }
    
    function getEquippedItems(address owner) external view returns (
        uint256 weapon,
        uint256 armor,
        uint256 accessory1,
        uint256 accessory2,
        uint256 accessory3
    ) {
        Equipment memory eq = playerEquipment[owner];
        return (eq.weapon, eq.armor, eq.accessory1, eq.accessory2, eq.accessory3);
    }
    
    function getItemBalance(address owner, uint256 itemId) external view returns (uint256) {
        return playerItems[owner][itemId];
    }
    
    // Admin function for testing
    function addItemToInventory(address player, uint256 itemId, uint256 quantity) external {
        playerItems[player][itemId] += quantity;
    }
}