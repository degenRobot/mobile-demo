// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/**
 * @title FrenPetOptimized
 * @notice Gas-optimized version of FrenPetSimple
 * @dev Optimizations:
 * - Packed struct to use fewer storage slots
 * - Removed redundant hasPet mapping
 * - Simplified logic
 * - Using smaller data types where possible
 */
contract FrenPetOptimized {
    struct Pet {
        string name;           // dynamic - separate slot
        uint32 birthTime;      // 4 bytes
        uint32 lastFed;        // 4 bytes  
        uint32 lastPlayed;     // 4 bytes
        uint16 level;          // 2 bytes
        uint16 experience;     // 2 bytes
        uint8 lastHappiness;   // 1 byte
        uint8 lastHunger;      // 1 byte
        bool isAlive;          // 1 byte
        // Total: 19 bytes in one slot (after name)
    }
    
    mapping(address => Pet) public pets;
    
    uint32 public constant HAPPINESS_DECAY_RATE = 1 hours;
    uint32 public constant HUNGER_INCREASE_RATE = 2 hours;
    
    event PetCreated(address indexed owner, string name);
    event PetFed(address indexed owner);
    event PetPlayed(address indexed owner);
    
    modifier onlyPetOwner() {
        require(bytes(pets[msg.sender].name).length > 0, "No pet");
        require(pets[msg.sender].isAlive, "Pet not alive");
        _;
    }
    
    /**
     * @notice Create a new pet (gas-optimized)
     * @param _name The name of the pet
     */
    function createPet(string memory _name) external {
        require(bytes(_name).length > 0, "Empty name");
        
        // Simplified: just overwrite any existing pet
        pets[msg.sender] = Pet({
            name: _name,
            birthTime: uint32(block.timestamp),
            lastFed: uint32(block.timestamp),
            lastPlayed: uint32(block.timestamp),
            level: 1,
            experience: 0,
            lastHappiness: 100,
            lastHunger: 0,
            isAlive: true
        });
        
        emit PetCreated(msg.sender, _name);
    }
    
    /**
     * @notice Feed your pet (gas-optimized)
     */
    function feedPet() external onlyPetOwner {
        Pet storage pet = pets[msg.sender];
        pet.lastHunger = 0;
        pet.lastFed = uint32(block.timestamp);
        pet.experience += 10;
        
        // Simple level up check
        if (pet.experience >= pet.level * 100) {
            pet.level++;
            pet.experience = 0;
        }
        
        emit PetFed(msg.sender);
    }
    
    /**
     * @notice Play with your pet (gas-optimized)
     */
    function playWithPet() external onlyPetOwner {
        Pet storage pet = pets[msg.sender];
        pet.lastHappiness = 100;
        pet.lastPlayed = uint32(block.timestamp);
        pet.experience += 5;
        
        // Simple level up check
        if (pet.experience >= pet.level * 100) {
            pet.level++;
            pet.experience = 0;
        }
        
        emit PetPlayed(msg.sender);
    }
    
    /**
     * @notice Get basic pet info
     * @param owner Address of the pet owner
     */
    function getPet(address owner) external view returns (
        string memory name,
        uint16 level,
        bool isAlive
    ) {
        Pet memory pet = pets[owner];
        return (pet.name, pet.level, pet.isAlive);
    }
    
    /**
     * @notice Check if address has a pet
     * @param owner Address to check
     */
    function hasPet(address owner) external view returns (bool) {
        return bytes(pets[owner].name).length > 0;
    }
}