// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/**
 * @title IItemSystem
 * @notice Comprehensive item system with categories and effects
 */
interface IItemSystem {
    // ============ Item Categories ============
    enum ItemCategory {
        None,
        Weapon,      // Increases attack power
        Armor,       // Increases defense
        Consumable,  // One-time use items (potions, food)
        Accessory,   // Special effects (speed boost, crit chance)
        Evolution,   // Evolution stones and materials
        Collectible  // Rare collectibles, trophies
    }
    
    // ============ Item Rarity ============
    enum ItemRarity {
        Common,
        Uncommon,
        Rare,
        Epic,
        Legendary,
        Mythic
    }
    
    // ============ Effect Types ============
    enum EffectType {
        None,
        InstantHeal,        // Immediate HP restoration
        HealOverTime,       // HP regen over time
        AttackBoost,        // Temporary attack increase
        DefenseBoost,       // Temporary defense increase
        SpeedBoost,         // Temporary speed increase
        AllStatsBoost,      // Boost all stats
        CriticalBoost,      // Increase critical chance
        ExperienceBoost,    // Double XP gain
        CoinBoost,          // Double coin rewards
        Resurrection,       // Revive dead pet
        Evolution,          // Trigger evolution
        PermanentStatBoost, // Permanent stat increase
        ElementalDamage,    // Add elemental damage
        DamageReduction,    // Reduce incoming damage
        Lifesteal          // Heal on attack
    }
    
    // ============ Structures ============
    
    struct Item {
        uint256 id;
        string name;
        ItemCategory category;
        ItemRarity rarity;
        uint256 level;          // Required pet level to use
        uint256 price;          // Base market price
        bool tradeable;         // Can be traded
        bool consumable;        // Destroyed on use
        ItemStats stats;        // Stat modifications
        ItemEffect[] effects;   // Special effects
    }
    
    struct ItemStats {
        int256 attack;          // Attack modifier
        int256 defense;         // Defense modifier
        int256 speed;           // Speed modifier
        int256 health;          // Max health modifier
        uint256 critChance;     // Critical hit chance (0-100)
        uint256 dodgeChance;    // Dodge chance (0-100)
    }
    
    struct ItemEffect {
        EffectType effectType;
        uint256 value;          // Effect strength
        uint256 duration;       // Duration in seconds (0 = permanent)
        uint256 chance;         // Activation chance (0-100)
    }
    
    struct EquippedItems {
        uint256 weapon;         // Equipped weapon ID
        uint256 armor;          // Equipped armor ID
        uint256 accessory1;     // First accessory slot
        uint256 accessory2;     // Second accessory slot
        uint256 accessory3;     // Third accessory slot
    }
    
    struct ActiveEffect {
        uint256 itemId;         // Source item
        EffectType effectType;
        uint256 value;
        uint256 expiresAt;      // Block timestamp when effect ends
    }
    
    // ============ Events ============
    
    event ItemCreated(uint256 indexed itemId, string name, ItemCategory category, ItemRarity rarity);
    event ItemEquipped(address indexed owner, uint256 indexed itemId, ItemCategory category);
    event ItemUnequipped(address indexed owner, uint256 indexed itemId, ItemCategory category);
    event ItemUsed(address indexed owner, uint256 indexed itemId, EffectType effect);
    event ItemCrafted(address indexed owner, uint256 indexed itemId, uint256[] materials);
    event ItemUpgraded(uint256 indexed itemId, uint256 newLevel);
    event EffectApplied(address indexed owner, EffectType effect, uint256 value, uint256 duration);
    event EffectExpired(address indexed owner, EffectType effect);
    
    // ============ Functions ============
    
    function createItem(
        string memory name,
        ItemCategory category,
        ItemRarity rarity,
        ItemStats memory stats,
        ItemEffect[] memory effects
    ) external returns (uint256 itemId);
    
    function equipItem(address owner, uint256 itemId) external;
    function unequipItem(address owner, uint256 itemId) external;
    function useItem(address owner, uint256 itemId) external;
    
    function getItemDetails(uint256 itemId) external view returns (Item memory);
    function getEquippedItems(address owner) external view returns (EquippedItems memory);
    function getActiveEffects(address owner) external view returns (ActiveEffect[] memory);
    function calculateTotalStats(address owner) external view returns (ItemStats memory);
}