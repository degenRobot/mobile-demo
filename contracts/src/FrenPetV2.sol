// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "./interfaces/IPetTypes.sol";
import "./interfaces/IInventory.sol";
import "./interfaces/IBattleSystem.sol";

/**
 * @title FrenPetV2
 * @notice Enhanced FrenPet with battle, inventory, marketplace, and evolution systems
 * @dev Modular architecture for future expansions
 */
contract FrenPetV2 is IPetTypes {
    // ============ State Variables ============
    
    mapping(address => Pet) public pets;
    mapping(address => bool) public hasPet;
    mapping(address => Inventory) public inventories;
    mapping(uint256 => Battle) public battles;
    mapping(address => uint256) public activeBattles;
    mapping(uint256 => MarketListing) public marketplace;
    
    uint256 public nextBattleId = 1;
    uint256 public nextListingId = 1;
    uint256 public constant COINS_PER_WIN = 50;
    uint256 public constant COINS_PER_LEVEL = 10;
    
    // Time-based mechanics
    uint256 public constant HAPPINESS_DECAY_RATE = 1 hours;
    uint256 public constant HUNGER_INCREASE_RATE = 2 hours;
    uint256 public constant BATTLE_COOLDOWN = 10 minutes;
    
    // ============ Events ============
    
    event PetCreated(address indexed owner, string name, PetType petType);
    event PetEvolved(address indexed owner, PetType from, PetType to);
    event BattleStarted(uint256 indexed battleId, address challenger, address opponent);
    event BattleCompleted(uint256 indexed battleId, address winner);
    event ItemUsed(address indexed owner, ItemType item);
    event ItemListed(uint256 indexed listingId, address seller, ItemType item, uint256 price);
    event ItemPurchased(uint256 indexed listingId, address buyer);
    event DailyRewardClaimed(address indexed player, uint256 coins, ItemType item);
    
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
    
    // ============ Pet Management ============
    
    /**
     * @notice Create a new pet with chosen type
     */
    function createPet(string memory _name, PetType _type) external {
        require(bytes(_name).length > 0 && bytes(_name).length <= 20, "Invalid name length");
        require(_type != PetType.None, "Invalid pet type");
        
        // Check if player has a dead pet
        if (hasPet[msg.sender]) {
            require(!isPetAlive(msg.sender), "Your current pet is still alive");
        }
        
        // Get base stats for pet type
        PetStats memory baseStats = getBaseStats(_type);
        
        pets[msg.sender] = Pet({
            name: _name,
            petType: _type,
            evolutionStage: 1,
            level: 1,
            experience: 0,
            lastHappiness: 100,
            lastHunger: 0,
            lastFed: block.timestamp,
            lastPlayed: block.timestamp,
            lastBattle: 0,
            birthTime: block.timestamp,
            isAlive: true,
            wins: 0,
            losses: 0,
            winStreak: 0,
            // Base stats
            attack: baseStats.attack,
            defense: baseStats.defense,
            speed: baseStats.speed,
            health: baseStats.health,
            maxHealth: baseStats.health
        });
        
        // Initialize inventory
        inventories[msg.sender].coins = 100; // Starting coins
        inventories[msg.sender].lastDailyReward = 0;
        
        hasPet[msg.sender] = true;
        emit PetCreated(msg.sender, _name, _type);
    }
    
    /**
     * @notice Get base stats for a pet type
     */
    function getBaseStats(PetType _type) public pure returns (PetStats memory) {
        if (_type == PetType.Fire) {
            return PetStats(15, 10, 12, 100); // High attack
        } else if (_type == PetType.Water) {
            return PetStats(10, 15, 10, 120); // High defense & health
        } else if (_type == PetType.Grass) {
            return PetStats(12, 12, 8, 110); // Balanced
        } else if (_type == PetType.Electric) {
            return PetStats(13, 8, 15, 90); // High speed
        } else if (_type == PetType.Dragon) {
            return PetStats(18, 14, 14, 130); // Strong overall (rare)
        } else {
            return PetStats(10, 10, 10, 100); // Normal type
        }
    }
    
    /**
     * @notice Feed your pet using an item or basic feeding
     */
    function feedPet(ItemType _food) external onlyPetOwner {
        Pet storage pet = pets[msg.sender];
        Inventory storage inv = inventories[msg.sender];
        
        uint256 hungerReduction = 20; // Base feeding
        uint256 expGain = 10;
        
        if (_food != ItemType.None) {
            require(inv.items[_food] > 0, "You don't have this item");
            inv.items[_food]--;
            
            // Different foods have different effects
            if (_food == ItemType.BasicFood) {
                hungerReduction = 30;
                expGain = 15;
            } else if (_food == ItemType.RareFood) {
                hungerReduction = 50;
                expGain = 30;
                pet.lastHappiness = min(100, pet.lastHappiness + 10);
            } else if (_food == ItemType.EpicFood) {
                hungerReduction = 100;
                expGain = 50;
                pet.lastHappiness = 100;
                pet.health = min(pet.maxHealth, pet.health + 20);
            }
            
            emit ItemUsed(msg.sender, _food);
        }
        
        updatePetStats(msg.sender);
        
        pet.lastHunger = pet.lastHunger > hungerReduction ? pet.lastHunger - hungerReduction : 0;
        pet.lastFed = block.timestamp;
        pet.experience += expGain;
        
        checkLevelUp(msg.sender);
    }
    
    /**
     * @notice Play with your pet
     */
    function playWithPet() external onlyPetOwner {
        Pet storage pet = pets[msg.sender];
        updatePetStats(msg.sender);
        
        pet.lastHappiness = 100;
        pet.lastPlayed = block.timestamp;
        pet.experience += 5;
        
        checkLevelUp(msg.sender);
    }
    
    /**
     * @notice Train your pet to gain experience and stats
     */
    function trainPet() external onlyPetOwner {
        Pet storage pet = pets[msg.sender];
        require(block.timestamp >= pet.lastBattle + BATTLE_COOLDOWN, "Pet needs rest");
        
        updatePetStats(msg.sender);
        
        // Training costs happiness but gains experience
        require(pet.lastHappiness >= 20, "Pet too unhappy to train");
        pet.lastHappiness -= 20;
        pet.experience += 25;
        
        // Small stat increases
        if (block.number % 3 == 0) pet.attack++;
        else if (block.number % 3 == 1) pet.defense++;
        else pet.speed++;
        
        checkLevelUp(msg.sender);
    }
    
    // ============ Evolution System ============
    
    /**
     * @notice Evolve your pet when conditions are met
     */
    function evolvePet() external onlyPetOwner {
        Pet storage pet = pets[msg.sender];
        require(canEvolve(msg.sender), "Evolution conditions not met");
        
        PetType oldType = pet.petType;
        
        // Evolution paths
        if (pet.evolutionStage == 1 && pet.level >= 10) {
            pet.evolutionStage = 2;
            // Stat boosts
            pet.attack += 5;
            pet.defense += 5;
            pet.speed += 3;
            pet.maxHealth += 20;
            pet.health = pet.maxHealth;
        } else if (pet.evolutionStage == 2 && pet.level >= 25) {
            pet.evolutionStage = 3;
            // Major stat boosts
            pet.attack += 10;
            pet.defense += 10;
            pet.speed += 5;
            pet.maxHealth += 30;
            pet.health = pet.maxHealth;
            
            // Special evolution to Dragon type at stage 3
            if (pet.wins >= 50) {
                pet.petType = PetType.Dragon;
            }
        }
        
        emit PetEvolved(msg.sender, oldType, pet.petType);
    }
    
    /**
     * @notice Check if pet can evolve
     */
    function canEvolve(address _owner) public view returns (bool) {
        Pet memory pet = pets[_owner];
        if (pet.evolutionStage == 1 && pet.level >= 10) return true;
        if (pet.evolutionStage == 2 && pet.level >= 25) return true;
        return false;
    }
    
    // ============ Battle System ============
    
    /**
     * @notice Create a battle challenge
     */
    function createBattleChallenge(address _opponent) external onlyPetOwner noBattleActive {
        require(_opponent != msg.sender, "Cannot battle yourself");
        require(hasPet[_opponent], "Opponent doesn't have a pet");
        require(isPetAlive(_opponent), "Opponent's pet is not alive");
        
        Pet storage myPet = pets[msg.sender];
        require(block.timestamp >= myPet.lastBattle + BATTLE_COOLDOWN, "Pet needs rest");
        
        uint256 battleId = nextBattleId++;
        battles[battleId] = Battle({
            challenger: msg.sender,
            opponent: _opponent,
            winner: address(0),
            startTime: block.timestamp,
            completed: false,
            challengerMove: BattleMove.None,
            opponentMove: BattleMove.None
        });
        
        activeBattles[msg.sender] = battleId;
        activeBattles[_opponent] = battleId;
        
        emit BattleStarted(battleId, msg.sender, _opponent);
    }
    
    /**
     * @notice Submit your move for a battle
     */
    function submitBattleMove(BattleMove _move) external {
        uint256 battleId = activeBattles[msg.sender];
        require(battleId != 0, "No active battle");
        
        Battle storage battle = battles[battleId];
        require(!battle.completed, "Battle already completed");
        require(_move != BattleMove.None, "Invalid move");
        
        if (msg.sender == battle.challenger) {
            require(battle.challengerMove == BattleMove.None, "Move already submitted");
            battle.challengerMove = _move;
        } else if (msg.sender == battle.opponent) {
            require(battle.opponentMove == BattleMove.None, "Move already submitted");
            battle.opponentMove = _move;
        } else {
            revert("Not a participant");
        }
        
        // If both moves submitted, resolve battle
        if (battle.challengerMove != BattleMove.None && battle.opponentMove != BattleMove.None) {
            resolveBattle(battleId);
        }
    }
    
    /**
     * @notice Resolve a battle once both moves are submitted
     */
    function resolveBattle(uint256 _battleId) internal {
        Battle storage battle = battles[_battleId];
        
        (address winner, address loser) = determineBattleWinner(_battleId);
        
        battle.winner = winner;
        battle.completed = true;
        
        updateBattleResults(winner, loser);
        
        activeBattles[battle.challenger] = 0;
        activeBattles[battle.opponent] = 0;
        
        emit BattleCompleted(_battleId, winner);
    }
    
    function determineBattleWinner(uint256 _battleId) internal view returns (address winner, address loser) {
        Battle storage battle = battles[_battleId];
        Pet storage challengerPet = pets[battle.challenger];
        Pet storage opponentPet = pets[battle.opponent];
        
        uint256 challengerPower = calculateBattlePower(
            challengerPet, 
            battle.challengerMove,
            opponentPet.petType
        );
        
        uint256 opponentPower = calculateBattlePower(
            opponentPet,
            battle.opponentMove,
            challengerPet.petType
        );
        
        if (challengerPower > opponentPower) {
            return (battle.challenger, battle.opponent);
        } else if (opponentPower > challengerPower) {
            return (battle.opponent, battle.challenger);
        } else {
            // Tie goes to higher level
            if (challengerPet.level >= opponentPet.level) {
                return (battle.challenger, battle.opponent);
            } else {
                return (battle.opponent, battle.challenger);
            }
        }
    }
    
    function updateBattleResults(address _winner, address _loser) internal {
        Pet storage winnerPet = pets[_winner];
        Pet storage loserPet = pets[_loser];
        
        winnerPet.wins++;
        winnerPet.winStreak++;
        winnerPet.experience += 50;
        winnerPet.lastBattle = block.timestamp;
        
        loserPet.losses++;
        loserPet.winStreak = 0;
        loserPet.experience += 20;
        loserPet.lastBattle = block.timestamp;
        loserPet.health = loserPet.health > 20 ? loserPet.health - 20 : 0;
        
        inventories[_winner].coins += COINS_PER_WIN;
        
        checkLevelUp(_winner);
        checkLevelUp(_loser);
    }
    
    /**
     * @notice Calculate battle power based on stats, move, and type advantage
     */
    function calculateBattlePower(
        Pet memory _pet,
        BattleMove _move,
        PetType _opponentType
    ) internal pure returns (uint256) {
        uint256 basePower = calculateBasePower(_pet);
        basePower = applyMoveMultiplier(basePower, _move, _pet.defense);
        basePower = applyTypeAdvantage(basePower, _pet.petType, _opponentType);
        basePower += _pet.level * 10;
        basePower = basePower * _pet.health / _pet.maxHealth;
        return basePower;
    }
    
    function calculateBasePower(Pet memory _pet) internal pure returns (uint256) {
        return _pet.attack * 10 + _pet.speed * 5 + _pet.defense * 3;
    }
    
    function applyMoveMultiplier(
        uint256 _power,
        BattleMove _move,
        uint256 _defense
    ) internal pure returns (uint256) {
        if (_move == BattleMove.Attack) {
            return _power * 12 / 10;
        } else if (_move == BattleMove.Defend) {
            return _power * 8 / 10 + _defense * 20;
        } else if (_move == BattleMove.Special) {
            return _power * 15 / 10;
        }
        return _power;
    }
    
    /**
     * @notice Apply type advantages (Pokemon-style)
     */
    function applyTypeAdvantage(
        uint256 _power,
        PetType _attacker,
        PetType _defender
    ) internal pure returns (uint256) {
        // Fire > Grass, Grass > Water, Water > Fire
        if (_attacker == PetType.Fire && _defender == PetType.Grass) {
            return _power * 15 / 10; // 1.5x
        } else if (_attacker == PetType.Grass && _defender == PetType.Water) {
            return _power * 15 / 10;
        } else if (_attacker == PetType.Water && _defender == PetType.Fire) {
            return _power * 15 / 10;
        } else if (_attacker == PetType.Electric && _defender == PetType.Water) {
            return _power * 15 / 10;
        } else if (_attacker == PetType.Dragon) {
            return _power * 12 / 10; // Dragons are strong
        }
        
        // Reverse disadvantages
        if (_attacker == PetType.Grass && _defender == PetType.Fire) {
            return _power * 7 / 10; // 0.7x
        } else if (_attacker == PetType.Water && _defender == PetType.Grass) {
            return _power * 7 / 10;
        } else if (_attacker == PetType.Fire && _defender == PetType.Water) {
            return _power * 7 / 10;
        }
        
        return _power;
    }
    
    // ============ Inventory & Items ============
    
    /**
     * @notice Use an item from inventory
     */
    function useItem(ItemType _item) external onlyPetOwner {
        Inventory storage inv = inventories[msg.sender];
        require(inv.items[_item] > 0, "You don't have this item");
        
        Pet storage pet = pets[msg.sender];
        inv.items[_item]--;
        
        // Apply item effects
        if (_item == ItemType.HealthPotion) {
            pet.health = min(pet.maxHealth, pet.health + 50);
        } else if (_item == ItemType.RevivePotion) {
            if (!pet.isAlive) {
                pet.isAlive = true;
                pet.health = pet.maxHealth / 2;
                pet.lastHappiness = 50;
                pet.lastHunger = 50;
                pet.lastFed = block.timestamp;
                pet.lastPlayed = block.timestamp;
            }
        } else if (_item == ItemType.ExpBoost) {
            pet.experience += 100;
            checkLevelUp(msg.sender);
        } else if (_item == ItemType.StatBoost) {
            pet.attack += 2;
            pet.defense += 2;
            pet.speed += 1;
        }
        
        emit ItemUsed(msg.sender, _item);
    }
    
    /**
     * @notice Claim daily reward
     */
    function claimDailyReward() external onlyPetOwner {
        Inventory storage inv = inventories[msg.sender];
        require(block.timestamp >= inv.lastDailyReward + 1 days, "Already claimed today");
        
        inv.lastDailyReward = block.timestamp;
        inv.coins += 50;
        
        // Random item reward
        uint256 random = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender))) % 100;
        ItemType rewardItem;
        
        if (random < 40) {
            rewardItem = ItemType.BasicFood;
        } else if (random < 70) {
            rewardItem = ItemType.Toy;
        } else if (random < 85) {
            rewardItem = ItemType.HealthPotion;
        } else if (random < 95) {
            rewardItem = ItemType.RareFood;
        } else {
            rewardItem = ItemType.ExpBoost;
        }
        
        inv.items[rewardItem]++;
        emit DailyRewardClaimed(msg.sender, 50, rewardItem);
    }
    
    // ============ Marketplace ============
    
    /**
     * @notice List an item for sale
     */
    function listItem(ItemType _item, uint256 _quantity, uint256 _pricePerItem) external {
        require(_item != ItemType.None, "Invalid item");
        require(_quantity > 0, "Invalid quantity");
        require(_pricePerItem > 0, "Invalid price");
        
        Inventory storage inv = inventories[msg.sender];
        require(inv.items[_item] >= _quantity, "Insufficient items");
        
        // Remove items from inventory
        inv.items[_item] -= _quantity;
        
        uint256 listingId = nextListingId++;
        marketplace[listingId] = MarketListing({
            seller: msg.sender,
            item: _item,
            quantity: _quantity,
            pricePerItem: _pricePerItem,
            active: true
        });
        
        emit ItemListed(listingId, msg.sender, _item, _pricePerItem);
    }
    
    /**
     * @notice Buy an item from marketplace
     */
    function buyItem(uint256 _listingId, uint256 _quantity) external {
        MarketListing storage listing = marketplace[_listingId];
        require(listing.active, "Listing not active");
        require(_quantity > 0 && _quantity <= listing.quantity, "Invalid quantity");
        
        uint256 totalPrice = listing.pricePerItem * _quantity;
        Inventory storage buyerInv = inventories[msg.sender];
        require(buyerInv.coins >= totalPrice, "Insufficient coins");
        
        // Transfer coins
        buyerInv.coins -= totalPrice;
        inventories[listing.seller].coins += totalPrice;
        
        // Transfer items
        buyerInv.items[listing.item] += _quantity;
        listing.quantity -= _quantity;
        
        if (listing.quantity == 0) {
            listing.active = false;
        }
        
        emit ItemPurchased(_listingId, msg.sender);
    }
    
    /**
     * @notice Cancel a marketplace listing
     */
    function cancelListing(uint256 _listingId) external {
        MarketListing storage listing = marketplace[_listingId];
        require(listing.seller == msg.sender, "Not your listing");
        require(listing.active, "Listing not active");
        
        // Return items to seller
        inventories[msg.sender].items[listing.item] += listing.quantity;
        listing.active = false;
    }
    
    // ============ Helper Functions ============
    
    function updatePetStats(address owner) internal {
        Pet storage pet = pets[owner];
        if (!pet.isAlive) return;
        
        uint256 timeSinceLastFed = block.timestamp - pet.lastFed;
        uint256 timeSinceLastPlayed = block.timestamp - pet.lastPlayed;
        
        // Calculate current hunger
        uint256 hungerIncrease = (timeSinceLastFed / HUNGER_INCREASE_RATE) * 10;
        uint256 currentHunger = pet.lastHunger + hungerIncrease > 100 ? 100 : pet.lastHunger + hungerIncrease;
        
        // Calculate current happiness
        uint256 happinessDecrease = (timeSinceLastPlayed / HAPPINESS_DECAY_RATE) * 10;
        uint256 currentHappiness = pet.lastHappiness < happinessDecrease ? 0 : pet.lastHappiness - happinessDecrease;
        
        pet.lastHunger = currentHunger;
        pet.lastHappiness = currentHappiness;
        
        // Check if pet dies
        if (currentHunger >= 100 || currentHappiness == 0 || pet.health == 0) {
            pet.isAlive = false;
        }
    }
    
    function checkLevelUp(address owner) internal {
        Pet storage pet = pets[owner];
        uint256 requiredExp = pet.level * 100;
        
        while (pet.experience >= requiredExp) {
            pet.level++;
            pet.experience -= requiredExp;
            
            // Stat increases on level up
            pet.attack += 2;
            pet.defense += 2;
            pet.speed += 1;
            pet.maxHealth += 10;
            pet.health = pet.maxHealth; // Full heal on level up
            
            // Coin reward
            inventories[owner].coins += COINS_PER_LEVEL;
            
            requiredExp = pet.level * 100;
        }
    }
    
    function isPetAlive(address _owner) public view returns (bool) {
        Pet memory pet = pets[_owner];
        if (!pet.isAlive) return false;
        
        uint256 timeSinceLastFed = block.timestamp - pet.lastFed;
        uint256 timeSinceLastPlayed = block.timestamp - pet.lastPlayed;
        
        uint256 currentHunger = pet.lastHunger + (timeSinceLastFed / HUNGER_INCREASE_RATE) * 10;
        uint256 currentHappiness = pet.lastHappiness > (timeSinceLastPlayed / HAPPINESS_DECAY_RATE) * 10 ? 
            pet.lastHappiness - (timeSinceLastPlayed / HAPPINESS_DECAY_RATE) * 10 : 0;
        
        return currentHunger < 100 && currentHappiness > 0 && pet.health > 0;
    }
    
    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
    
    // ============ View Functions ============
    
    function getPetStats(address _owner) external view returns (
        string memory name,
        PetType petType,
        uint256 level,
        uint256 experience,
        uint256 happiness,
        uint256 hunger,
        uint256 health,
        bool isAlive
    ) {
        Pet memory pet = pets[_owner];
        
        uint256 currentHunger = pet.lastHunger;
        uint256 currentHappiness = pet.lastHappiness;
        bool currentlyAlive = pet.isAlive;
        
        if (pet.isAlive) {
            uint256 timeSinceLastFed = block.timestamp - pet.lastFed;
            uint256 timeSinceLastPlayed = block.timestamp - pet.lastPlayed;
            
            currentHunger = min(100, pet.lastHunger + (timeSinceLastFed / HUNGER_INCREASE_RATE) * 10);
            uint256 happinessDecrease = (timeSinceLastPlayed / HAPPINESS_DECAY_RATE) * 10;
            currentHappiness = pet.lastHappiness > happinessDecrease ? pet.lastHappiness - happinessDecrease : 0;
            
            currentlyAlive = currentHunger < 100 && currentHappiness > 0 && pet.health > 0;
        }
        
        return (
            pet.name,
            pet.petType,
            pet.level,
            pet.experience,
            currentHappiness,
            currentHunger,
            pet.health,
            currentlyAlive
        );
    }
    
    function getInventory(address _owner) external view returns (
        uint256 coins,
        uint256 basicFood,
        uint256 rareFood,
        uint256 toys,
        uint256 healthPotions
    ) {
        Inventory storage inv = inventories[_owner];
        return (
            inv.coins,
            inv.items[ItemType.BasicFood],
            inv.items[ItemType.RareFood],
            inv.items[ItemType.Toy],
            inv.items[ItemType.HealthPotion]
        );
    }
}