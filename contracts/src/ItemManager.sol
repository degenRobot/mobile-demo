// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "./interfaces/IItemSystem.sol";
import "./interfaces/IPetTypes.sol";

/**
 * @title ItemManager
 * @notice Manages all items in the FrenPet ecosystem
 * @dev This contract handles item creation, effects, and equipment
 */
contract ItemManager is IItemSystem {
    // ============ State Variables ============
    
    mapping(uint256 => Item) public items;
    mapping(address => EquippedItems) public equipped;
    mapping(address => mapping(uint256 => uint256)) public inventory; // owner => itemId => quantity
    mapping(address => ActiveEffect[]) public activeEffects;
    mapping(address => uint256) public lastEffectCheck; // Track when effects were last checked
    
    uint256 public nextItemId = 1;
    uint256 public constant MAX_ACTIVE_EFFECTS = 10;
    uint256 public constant MAX_ACCESSORIES = 3;
    
    // Predefined item IDs (starting from 1)
    uint256 public constant WOODEN_SWORD = 1;
    uint256 public constant IRON_SWORD = 2;
    uint256 public constant DRAGON_BLADE = 3;
    uint256 public constant LEATHER_ARMOR = 4;
    uint256 public constant STEEL_ARMOR = 5;
    uint256 public constant HEALTH_POTION = 6;
    uint256 public constant STRENGTH_ELIXIR = 7;
    uint256 public constant SPEED_BOOTS = 8;
    uint256 public constant LUCKY_CHARM = 9;
    uint256 public constant FIRE_STONE = 10;
    
    // ============ Constructor ============
    
    constructor() {
        _initializeDefaultItems();
    }
    
    // ============ Item Creation ============
    
    function _initializeDefaultItems() internal {
        // Weapons
        _createDefaultItem(
            "Wooden Sword",
            ItemCategory.Weapon,
            ItemRarity.Common,
            ItemStats(5, 0, 0, 0, 5, 0),
            _noEffects()
        );
        
        _createDefaultItem(
            "Iron Sword",
            ItemCategory.Weapon,
            ItemRarity.Uncommon,
            ItemStats(10, 2, 0, 0, 10, 0),
            _noEffects()
        );
        
        _createDefaultItem(
            "Dragon Blade",
            ItemCategory.Weapon,
            ItemRarity.Legendary,
            ItemStats(25, 5, 5, 0, 20, 0),
            _singleEffect(EffectType.ElementalDamage, 10, 0, 100)
        );
        
        // Armor
        _createDefaultItem(
            "Leather Armor",
            ItemCategory.Armor,
            ItemRarity.Common,
            ItemStats(0, 5, -1, 10, 0, 5),
            _noEffects()
        );
        
        _createDefaultItem(
            "Steel Armor",
            ItemCategory.Armor,
            ItemRarity.Rare,
            ItemStats(0, 15, -2, 25, 0, 10),
            _singleEffect(EffectType.DamageReduction, 10, 0, 100)
        );
        
        // Consumables
        _createDefaultItem(
            "Health Potion",
            ItemCategory.Consumable,
            ItemRarity.Common,
            ItemStats(0, 0, 0, 0, 0, 0),
            _singleEffect(EffectType.InstantHeal, 50, 0, 100)
        );
        
        _createDefaultItem(
            "Strength Elixir",
            ItemCategory.Consumable,
            ItemRarity.Uncommon,
            ItemStats(0, 0, 0, 0, 0, 0),
            _singleEffect(EffectType.AttackBoost, 20, 300, 100) // 5 minute duration
        );
        
        // Accessories
        _createDefaultItem(
            "Speed Boots",
            ItemCategory.Accessory,
            ItemRarity.Uncommon,
            ItemStats(0, 0, 10, 0, 0, 15),
            _singleEffect(EffectType.SpeedBoost, 5, 0, 100)
        );
        
        _createDefaultItem(
            "Lucky Charm",
            ItemCategory.Accessory,
            ItemRarity.Rare,
            ItemStats(0, 0, 0, 0, 15, 15),
            _singleEffect(EffectType.CoinBoost, 50, 0, 100)
        );
        
        // Evolution Items
        _createDefaultItem(
            "Fire Stone",
            ItemCategory.Evolution,
            ItemRarity.Rare,
            ItemStats(0, 0, 0, 0, 0, 0),
            _singleEffect(EffectType.Evolution, 1, 0, 100)
        );
    }
    
    function _createDefaultItem(
        string memory name,
        ItemCategory category,
        ItemRarity rarity,
        ItemStats memory stats,
        ItemEffect[] memory effects
    ) internal returns (uint256) {
        uint256 itemId = nextItemId++;
        
        items[itemId] = Item({
            id: itemId,
            name: name,
            category: category,
            rarity: rarity,
            level: _getLevelRequirement(rarity),
            price: _getBasePrice(rarity),
            tradeable: true,
            consumable: category == ItemCategory.Consumable,
            stats: stats,
            effects: effects
        });
        
        emit ItemCreated(itemId, name, category, rarity);
        return itemId;
    }
    
    function createItem(
        string memory name,
        ItemCategory category,
        ItemRarity rarity,
        ItemStats memory stats,
        ItemEffect[] memory effects
    ) external returns (uint256) {
        // Only admin/game contract can create custom items
        // Add access control in production
        return _createDefaultItem(name, category, rarity, stats, effects);
    }
    
    // ============ Equipment System ============
    
    function equipItem(address owner, uint256 itemId) external {
        require(inventory[owner][itemId] > 0, "Item not in inventory");
        Item memory item = items[itemId];
        require(item.category != ItemCategory.Consumable, "Cannot equip consumables");
        
        EquippedItems storage equip = equipped[owner];
        
        if (item.category == ItemCategory.Weapon) {
            if (equip.weapon != 0) {
                _unequipItem(owner, equip.weapon);
            }
            equip.weapon = itemId;
        } else if (item.category == ItemCategory.Armor) {
            if (equip.armor != 0) {
                _unequipItem(owner, equip.armor);
            }
            equip.armor = itemId;
        } else if (item.category == ItemCategory.Accessory) {
            _equipAccessory(owner, itemId);
        }
        
        // Apply permanent effects
        _applyItemEffects(owner, itemId);
        
        emit ItemEquipped(owner, itemId, item.category);
    }
    
    function unequipItem(address owner, uint256 itemId) external {
        _unequipItem(owner, itemId);
    }
    
    function _unequipItem(address owner, uint256 itemId) internal {
        EquippedItems storage equip = equipped[owner];
        Item memory item = items[itemId];
        
        if (equip.weapon == itemId) {
            equip.weapon = 0;
        } else if (equip.armor == itemId) {
            equip.armor = 0;
        } else if (equip.accessory1 == itemId) {
            equip.accessory1 = 0;
        } else if (equip.accessory2 == itemId) {
            equip.accessory2 = 0;
        } else if (equip.accessory3 == itemId) {
            equip.accessory3 = 0;
        } else {
            revert("Item not equipped");
        }
        
        // Remove permanent effects
        _removeItemEffects(owner, itemId);
        
        emit ItemUnequipped(owner, itemId, item.category);
    }
    
    function _equipAccessory(address owner, uint256 itemId) internal {
        EquippedItems storage equip = equipped[owner];
        
        if (equip.accessory1 == 0) {
            equip.accessory1 = itemId;
        } else if (equip.accessory2 == 0) {
            equip.accessory2 = itemId;
        } else if (equip.accessory3 == 0) {
            equip.accessory3 = itemId;
        } else {
            revert("All accessory slots full");
        }
    }
    
    // ============ Item Usage ============
    
    function useItem(address owner, uint256 itemId) external {
        require(inventory[owner][itemId] > 0, "Item not in inventory");
        Item memory item = items[itemId];
        
        require(item.category == ItemCategory.Consumable || 
                item.category == ItemCategory.Evolution, 
                "Item not usable");
        
        // Apply effects
        for (uint i = 0; i < item.effects.length; i++) {
            ItemEffect memory effect = item.effects[i];
            
            // Check activation chance
            if (_random(100) < effect.chance) {
                _applyEffect(owner, itemId, effect);
            }
        }
        
        // Consume item if consumable
        if (item.consumable) {
            inventory[owner][itemId]--;
        }
        
        emit ItemUsed(owner, itemId, item.effects.length > 0 ? item.effects[0].effectType : EffectType.None);
    }
    
    // ============ Effect System ============
    
    function _applyEffect(address owner, uint256 itemId, ItemEffect memory effect) internal {
        // Clean expired effects first
        _cleanExpiredEffects(owner);
        
        ActiveEffect[] storage effects = activeEffects[owner];
        require(effects.length < MAX_ACTIVE_EFFECTS, "Too many active effects");
        
        uint256 expiresAt = effect.duration > 0 ? 
            block.timestamp + effect.duration : 
            type(uint256).max; // Permanent effect
        
        effects.push(ActiveEffect({
            itemId: itemId,
            effectType: effect.effectType,
            value: effect.value,
            expiresAt: expiresAt
        }));
        
        emit EffectApplied(owner, effect.effectType, effect.value, effect.duration);
    }
    
    function _applyItemEffects(address owner, uint256 itemId) internal {
        Item memory item = items[itemId];
        
        for (uint i = 0; i < item.effects.length; i++) {
            if (item.effects[i].duration == 0) { // Only apply permanent effects
                _applyEffect(owner, itemId, item.effects[i]);
            }
        }
    }
    
    function _removeItemEffects(address owner, uint256 itemId) internal {
        ActiveEffect[] storage effects = activeEffects[owner];
        
        for (uint i = 0; i < effects.length; ) {
            if (effects[i].itemId == itemId) {
                emit EffectExpired(owner, effects[i].effectType);
                effects[i] = effects[effects.length - 1];
                effects.pop();
            } else {
                i++;
            }
        }
    }
    
    function _cleanExpiredEffects(address owner) internal {
        ActiveEffect[] storage effects = activeEffects[owner];
        uint256 currentTime = block.timestamp;
        
        for (uint i = 0; i < effects.length; ) {
            if (effects[i].expiresAt <= currentTime) {
                emit EffectExpired(owner, effects[i].effectType);
                effects[i] = effects[effects.length - 1];
                effects.pop();
            } else {
                i++;
            }
        }
        
        lastEffectCheck[owner] = currentTime;
    }
    
    // ============ Stats Calculation ============
    
    function calculateTotalStats(address owner) external view returns (ItemStats memory total) {
        EquippedItems memory equip = equipped[owner];
        
        // Add weapon stats
        if (equip.weapon != 0) {
            _addStats(total, items[equip.weapon].stats);
        }
        
        // Add armor stats
        if (equip.armor != 0) {
            _addStats(total, items[equip.armor].stats);
        }
        
        // Add accessory stats
        if (equip.accessory1 != 0) {
            _addStats(total, items[equip.accessory1].stats);
        }
        if (equip.accessory2 != 0) {
            _addStats(total, items[equip.accessory2].stats);
        }
        if (equip.accessory3 != 0) {
            _addStats(total, items[equip.accessory3].stats);
        }
        
        // Add active effect bonuses
        ActiveEffect[] memory effects = activeEffects[owner];
        for (uint i = 0; i < effects.length; i++) {
            if (effects[i].expiresAt > block.timestamp) {
                _applyEffectToStats(total, effects[i]);
            }
        }
        
        return total;
    }
    
    function _addStats(ItemStats memory total, ItemStats memory add) internal pure {
        total.attack += add.attack;
        total.defense += add.defense;
        total.speed += add.speed;
        total.health += add.health;
        total.critChance = _min(100, total.critChance + add.critChance);
        total.dodgeChance = _min(100, total.dodgeChance + add.dodgeChance);
    }
    
    function _applyEffectToStats(ItemStats memory stats, ActiveEffect memory effect) internal pure {
        if (effect.effectType == EffectType.AttackBoost) {
            stats.attack += int256(effect.value);
        } else if (effect.effectType == EffectType.DefenseBoost) {
            stats.defense += int256(effect.value);
        } else if (effect.effectType == EffectType.SpeedBoost) {
            stats.speed += int256(effect.value);
        } else if (effect.effectType == EffectType.AllStatsBoost) {
            stats.attack += int256(effect.value);
            stats.defense += int256(effect.value);
            stats.speed += int256(effect.value);
        } else if (effect.effectType == EffectType.CriticalBoost) {
            stats.critChance = _min(100, stats.critChance + effect.value);
        }
    }
    
    // ============ Inventory Management ============
    
    function addItemToInventory(address owner, uint256 itemId, uint256 quantity) external {
        require(items[itemId].id != 0, "Item doesn't exist");
        inventory[owner][itemId] += quantity;
    }
    
    function removeItemFromInventory(address owner, uint256 itemId, uint256 quantity) external {
        require(inventory[owner][itemId] >= quantity, "Insufficient items");
        inventory[owner][itemId] -= quantity;
    }
    
    // ============ View Functions ============
    
    function getItemDetails(uint256 itemId) external view returns (Item memory) {
        return items[itemId];
    }
    
    function getEquippedItems(address owner) external view returns (EquippedItems memory) {
        return equipped[owner];
    }
    
    function getActiveEffects(address owner) external view returns (ActiveEffect[] memory) {
        ActiveEffect[] memory effects = activeEffects[owner];
        uint256 activeCount = 0;
        
        // Count non-expired effects
        for (uint i = 0; i < effects.length; i++) {
            if (effects[i].expiresAt > block.timestamp) {
                activeCount++;
            }
        }
        
        // Return only active effects
        ActiveEffect[] memory active = new ActiveEffect[](activeCount);
        uint256 index = 0;
        for (uint i = 0; i < effects.length; i++) {
            if (effects[i].expiresAt > block.timestamp) {
                active[index++] = effects[i];
            }
        }
        
        return active;
    }
    
    function getInventoryItem(address owner, uint256 itemId) external view returns (uint256) {
        return inventory[owner][itemId];
    }
    
    // ============ Helper Functions ============
    
    function _getLevelRequirement(ItemRarity rarity) internal pure returns (uint256) {
        if (rarity == ItemRarity.Common) return 1;
        if (rarity == ItemRarity.Uncommon) return 5;
        if (rarity == ItemRarity.Rare) return 10;
        if (rarity == ItemRarity.Epic) return 20;
        if (rarity == ItemRarity.Legendary) return 30;
        if (rarity == ItemRarity.Mythic) return 50;
        return 1;
    }
    
    function _getBasePrice(ItemRarity rarity) internal pure returns (uint256) {
        if (rarity == ItemRarity.Common) return 10;
        if (rarity == ItemRarity.Uncommon) return 50;
        if (rarity == ItemRarity.Rare) return 200;
        if (rarity == ItemRarity.Epic) return 1000;
        if (rarity == ItemRarity.Legendary) return 5000;
        if (rarity == ItemRarity.Mythic) return 20000;
        return 10;
    }
    
    function _noEffects() internal pure returns (ItemEffect[] memory) {
        return new ItemEffect[](0);
    }
    
    function _singleEffect(
        EffectType effectType,
        uint256 value,
        uint256 duration,
        uint256 chance
    ) internal pure returns (ItemEffect[] memory) {
        ItemEffect[] memory effects = new ItemEffect[](1);
        effects[0] = ItemEffect(effectType, value, duration, chance);
        return effects;
    }
    
    function _random(uint256 max) internal view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, block.prevrandao))) % max;
    }
    
    function _min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
}