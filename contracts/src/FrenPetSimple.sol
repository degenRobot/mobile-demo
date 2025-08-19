// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/**
 * @title FrenPetSimple
 * @notice Simplified version of FrenPet without payable functions for gasless testing
 * @dev All payment-related functionality has been removed
 */
contract FrenPetSimple {
    struct Pet {
        string name;
        uint256 level;
        uint256 experience;
        uint256 lastHappiness;
        uint256 lastHunger;
        uint256 lastFed;
        uint256 lastPlayed;
        uint256 birthTime;
        bool isAlive;
    }
    
    mapping(address => Pet) public pets;
    mapping(address => bool) public hasPet;
    
    uint256 public constant HAPPINESS_DECAY_RATE = 1 hours;
    uint256 public constant HUNGER_INCREASE_RATE = 2 hours;
    
    event PetCreated(address indexed owner, string name);
    event PetFed(address indexed owner, uint256 newHunger);
    event PetPlayed(address indexed owner, uint256 newHappiness);
    event PetLevelUp(address indexed owner, uint256 newLevel);
    
    modifier onlyPetOwner() {
        require(hasPet[msg.sender], "You don't have a pet");
        Pet memory pet = pets[msg.sender];
        if (pet.isAlive) {
            uint256 timeSinceLastFed = block.timestamp - pet.lastFed;
            uint256 timeSinceLastPlayed = block.timestamp - pet.lastPlayed;
            
            uint256 hungerIncrease = (timeSinceLastFed / HUNGER_INCREASE_RATE) * 10;
            uint256 currentHunger = pet.lastHunger + hungerIncrease > 100 ? 100 : pet.lastHunger + hungerIncrease;
            
            uint256 happinessDecrease = (timeSinceLastPlayed / HAPPINESS_DECAY_RATE) * 10;
            uint256 currentHappiness = pet.lastHappiness < happinessDecrease ? 0 : pet.lastHappiness - happinessDecrease;
            
            require(currentHunger < 100 && currentHappiness > 0, "Your pet is no longer with us");
        } else {
            revert("Your pet is no longer with us");
        }
        _;
    }
    
    function createPet(string memory _name) external {
        require(bytes(_name).length > 0, "Name cannot be empty");
        
        // If user has a pet, check if it's dead
        if (hasPet[msg.sender]) {
            Pet memory currentPet = pets[msg.sender];
            uint256 timeSinceLastFed = block.timestamp - currentPet.lastFed;
            uint256 timeSinceLastPlayed = block.timestamp - currentPet.lastPlayed;
            
            uint256 hungerIncrease = (timeSinceLastFed / HUNGER_INCREASE_RATE) * 10;
            uint256 currentHunger = currentPet.lastHunger + hungerIncrease > 100 ? 100 : currentPet.lastHunger + hungerIncrease;
            
            uint256 happinessDecrease = (timeSinceLastPlayed / HAPPINESS_DECAY_RATE) * 10;
            uint256 currentHappiness = currentPet.lastHappiness < happinessDecrease ? 0 : currentPet.lastHappiness - happinessDecrease;
            
            require(currentHunger >= 100 || currentHappiness == 0, "Your current pet is still alive");
        }
        
        pets[msg.sender] = Pet({
            name: _name,
            level: 1,
            experience: 0,
            lastHappiness: 100,
            lastHunger: 0,
            lastFed: block.timestamp,
            lastPlayed: block.timestamp,
            birthTime: block.timestamp,
            isAlive: true
        });
        
        hasPet[msg.sender] = true;
        emit PetCreated(msg.sender, _name);
    }
    
    /**
     * @notice Feed your pet - no payment required in simplified version
     * @dev Resets hunger to 0 and adds experience
     */
    function feedPet() external onlyPetOwner {
        Pet storage pet = pets[msg.sender];
        updatePetStats(msg.sender);
        
        pet.lastHunger = 0;
        pet.lastFed = block.timestamp;
        pet.experience += 10;
        
        checkLevelUp(msg.sender);
        
        emit PetFed(msg.sender, 0);
    }
    
    /**
     * @notice Play with your pet - no payment required in simplified version
     * @dev Resets happiness to 100 and adds experience
     */
    function playWithPet() external onlyPetOwner {
        Pet storage pet = pets[msg.sender];
        updatePetStats(msg.sender);
        
        pet.lastHappiness = 100;
        pet.lastPlayed = block.timestamp;
        pet.experience += 5;
        
        checkLevelUp(msg.sender);
        
        emit PetPlayed(msg.sender, 100);
    }
    
    /**
     * @notice Update pet stats based on time passed
     * @param owner Address of the pet owner
     */
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
        
        // Check if pet dies
        if (currentHunger >= 100 || currentHappiness == 0) {
            pet.isAlive = false;
        }
    }
    
    /**
     * @notice Check if pet should level up
     * @param owner Address of the pet owner
     */
    function checkLevelUp(address owner) internal {
        Pet storage pet = pets[owner];
        uint256 requiredExp = pet.level * 100;
        
        if (pet.experience >= requiredExp) {
            pet.level++;
            pet.experience -= requiredExp;
            emit PetLevelUp(owner, pet.level);
        }
    }
    
    /**
     * @notice Get current stats of a pet
     * @param owner Address of the pet owner
     * @return name Pet's name
     * @return level Current level
     * @return experience Current experience
     * @return happiness Current happiness (0-100)
     * @return hunger Current hunger (0-100)
     * @return isAlive Whether the pet is still alive
     */
    function getPetStats(address owner) external view returns (
        string memory name,
        uint256 level,
        uint256 experience,
        uint256 happiness,
        uint256 hunger,
        bool isAlive
    ) {
        Pet memory pet = pets[owner];
        
        // Calculate current stats without updating storage
        uint256 currentHunger = pet.lastHunger;
        uint256 currentHappiness = pet.lastHappiness;
        bool currentlyAlive = pet.isAlive;
        
        if (pet.isAlive) {
            uint256 timeSinceLastFed = block.timestamp - pet.lastFed;
            uint256 timeSinceLastPlayed = block.timestamp - pet.lastPlayed;
            
            uint256 hungerIncrease = (timeSinceLastFed / HUNGER_INCREASE_RATE) * 10;
            currentHunger = pet.lastHunger + hungerIncrease > 100 ? 100 : pet.lastHunger + hungerIncrease;
            
            uint256 happinessDecrease = (timeSinceLastPlayed / HAPPINESS_DECAY_RATE) * 10;
            currentHappiness = pet.lastHappiness < happinessDecrease ? 0 : pet.lastHappiness - happinessDecrease;
            
            // Determine if pet is currently alive based on calculated stats
            currentlyAlive = currentHunger < 100 && currentHappiness > 0;
        }
        
        return (
            pet.name,
            pet.level,
            pet.experience,
            currentHappiness,
            currentHunger,
            currentlyAlive
        );
    }
}