// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "./FrenPetV2.sol";
import "./ItemManager.sol";
import "./interfaces/IItemSystem.sol";

/**
 * @title FrenPetV2Enhanced
 * @notice Enhanced FrenPet with comprehensive item system
 * @dev Extends FrenPetV2 with equipment, consumables, and item effects
 */
contract FrenPetV2Enhanced is FrenPetV2 {
    // ============ State Variables ============
    
    ItemManager public itemManager;
    
    // Track equipped items per pet
    mapping(address => mapping(uint256 => bool)) public hasItemEquipped;
    
    // Item drop rates
    uint256 constant ITEM_DROP_CHANCE = 30; // 30% chance
    uint256 constant RARE_DROP_CHANCE = 5;  // 5% chance for rare
    
    // ============ Events ============
    
    event ItemDropped(address indexed owner, uint256 itemId, IItemSystem.ItemRarity rarity);
    event ItemEquippedToPet(address indexed owner, uint256 itemId);
    event ItemUsedOnPet(address indexed owner, uint256 itemId, IItemSystem.EffectType effect);
    
    // ============ Constructor ============
    
    constructor() {
        itemManager = new ItemManager();
    }
    
    // ============ Enhanced Battle System ============
    
    /**
     * @notice Calculate battle power with item bonuses
     */
    function calculateEnhancedBattlePower(
        address _owner,
        BattleMove _move,
        PetType _opponentType
    ) public view returns (uint256) {
        Pet memory pet = pets[_owner];
        
        // Get base battle power
        uint256 basePower = calculateBattlePower(pet, _move, _opponentType);
        
        // Get item stat bonuses
        IItemSystem.ItemStats memory itemStats = itemManager.calculateTotalStats(_owner);
        
        // Apply item bonuses
        if (itemStats.attack > 0) {
            basePower += uint256(itemStats.attack) * 10;
        } else if (itemStats.attack < 0) {
            uint256 reduction = uint256(-itemStats.attack) * 10;
            basePower = basePower > reduction ? basePower - reduction : 0;
        }
        
        if (itemStats.defense > 0 && _move == BattleMove.Defend) {
            basePower += uint256(itemStats.defense) * 15;
        }
        
        if (itemStats.speed > 0) {
            basePower += uint256(itemStats.speed) * 5;
        }
        
        // Apply critical hit chance
        if (itemStats.critChance > 0 && _random(100) < itemStats.critChance) {
            basePower = basePower * 15 / 10; // 1.5x critical damage
        }
        
        // Check for special effects
        IItemSystem.ActiveEffect[] memory effects = itemManager.getActiveEffects(_owner);
        for (uint i = 0; i < effects.length; i++) {
            if (effects[i].effectType == IItemSystem.EffectType.AttackBoost) {
                basePower = basePower * (100 + effects[i].value) / 100;
            } else if (effects[i].effectType == IItemSystem.EffectType.ElementalDamage) {
                basePower += effects[i].value * 10;
            }
        }
        
        return basePower;
    }
    
    /**
     * @notice Enhanced battle resolution with item drops
     */
    function resolveBattleWithItems(uint256 _battleId) internal {
        // Resolve battle normally
        resolveBattle(_battleId);
        
        Battle memory battle = battles[_battleId];
        
        // Drop items for winner
        if (battle.winner != address(0)) {
            _dropItemsForWinner(battle.winner);
        }
    }
    
    // ============ Item Integration ============
    
    /**
     * @notice Equip an item to your pet
     */
    function equipItemToPet(uint256 _itemId) external onlyPetOwner {
        itemManager.equipItem(msg.sender, _itemId);
        hasItemEquipped[msg.sender][_itemId] = true;
        
        // Apply stat bonuses to pet
        _applyItemStatsToPet(msg.sender);
        
        emit ItemEquippedToPet(msg.sender, _itemId);
    }
    
    /**
     * @notice Use a consumable item on your pet
     */
    function useItemOnPet(uint256 _itemId) external onlyPetOwner {
        IItemSystem.Item memory item = itemManager.getItemDetails(_itemId);
        Pet storage pet = pets[msg.sender];
        
        // Handle different effect types
        for (uint i = 0; i < item.effects.length; i++) {
            IItemSystem.ItemEffect memory effect = item.effects[i];
            
            if (effect.effectType == IItemSystem.EffectType.InstantHeal) {
                pet.health = min(pet.maxHealth, pet.health + effect.value);
            } else if (effect.effectType == IItemSystem.EffectType.Resurrection) {
                if (!pet.isAlive) {
                    pet.isAlive = true;
                    pet.health = pet.maxHealth / 2;
                    pet.lastHappiness = 50;
                    pet.lastHunger = 50;
                }
            } else if (effect.effectType == IItemSystem.EffectType.ExperienceBoost) {
                pet.experience += effect.value;
                checkLevelUp(msg.sender);
            } else if (effect.effectType == IItemSystem.EffectType.PermanentStatBoost) {
                pet.attack += effect.value / 3;
                pet.defense += effect.value / 3;
                pet.speed += effect.value / 3;
            } else if (effect.effectType == IItemSystem.EffectType.Evolution) {
                if (canEvolve(msg.sender)) {
                    // Trigger evolution through base contract
                    // Note: Would need to expose evolvePet as public in base contract
                    pet.evolutionStage++;
                    pet.attack += 10;
                    pet.defense += 10;
                    pet.speed += 5;
                    pet.maxHealth += 30;
                    pet.health = pet.maxHealth;
                }
            }
        }
        
        // Use the item (consumes if consumable)
        itemManager.useItem(msg.sender, _itemId);
        
        emit ItemUsedOnPet(msg.sender, _itemId, item.effects.length > 0 ? item.effects[0].effectType : IItemSystem.EffectType.None);
    }
    
    /**
     * @notice Feed pet with food items
     */
    function feedPetWithItem(uint256 _itemId) external onlyPetOwner {
        IItemSystem.Item memory item = itemManager.getItemDetails(_itemId);
        require(item.category == IItemSystem.ItemCategory.Consumable, "Not a consumable");
        
        Pet storage pet = pets[msg.sender];
        updatePetStats(msg.sender);
        
        // Enhanced feeding based on item rarity
        uint256 hungerReduction = 20;
        uint256 happinessBonus = 0;
        uint256 expGain = 10;
        
        if (item.rarity == IItemSystem.ItemRarity.Uncommon) {
            hungerReduction = 40;
            happinessBonus = 10;
            expGain = 20;
        } else if (item.rarity == IItemSystem.ItemRarity.Rare) {
            hungerReduction = 60;
            happinessBonus = 20;
            expGain = 40;
        } else if (item.rarity == IItemSystem.ItemRarity.Epic) {
            hungerReduction = 80;
            happinessBonus = 30;
            expGain = 60;
        } else if (item.rarity == IItemSystem.ItemRarity.Legendary) {
            hungerReduction = 100;
            happinessBonus = 50;
            expGain = 100;
        }
        
        pet.lastHunger = pet.lastHunger > hungerReduction ? pet.lastHunger - hungerReduction : 0;
        pet.lastHappiness = min(100, pet.lastHappiness + happinessBonus);
        pet.experience += expGain;
        pet.lastFed = block.timestamp;
        
        itemManager.useItem(msg.sender, _itemId);
        checkLevelUp(msg.sender);
    }
    
    // ============ Item Drops & Rewards ============
    
    /**
     * @notice Drop items for battle winner
     */
    function _dropItemsForWinner(address _winner) internal {
        uint256 roll = _random(100);
        
        if (roll < ITEM_DROP_CHANCE) {
            uint256 itemId;
            IItemSystem.ItemRarity rarity;
            
            if (roll < RARE_DROP_CHANCE) {
                // Drop rare item
                itemId = _getRandomRareItem();
                rarity = IItemSystem.ItemRarity.Rare;
            } else if (roll < 15) {
                // Drop uncommon item
                itemId = _getRandomUncommonItem();
                rarity = IItemSystem.ItemRarity.Uncommon;
            } else {
                // Drop common item
                itemId = _getRandomCommonItem();
                rarity = IItemSystem.ItemRarity.Common;
            }
            
            itemManager.addItemToInventory(_winner, itemId, 1);
            emit ItemDropped(_winner, itemId, rarity);
        }
    }
    
    /**
     * @notice Claim enhanced daily reward with items
     */
    function claimEnhancedDailyReward() external onlyPetOwner {
        Inventory storage inv = inventories[msg.sender];
        require(block.timestamp >= inv.lastDailyReward + 1 days, "Already claimed today");
        
        inv.lastDailyReward = block.timestamp;
        inv.coins += 50;
        
        // Give random items
        uint256 roll = _random(100);
        uint256 itemId;
        
        if (roll < 50) {
            itemId = 6; // HEALTH_POTION - Common
        } else if (roll < 80) {
            itemId = 7; // STRENGTH_ELIXIR - Uncommon
        } else if (roll < 95) {
            itemId = 8; // SPEED_BOOTS - Uncommon accessory
        } else {
            itemId = 9; // LUCKY_CHARM - Rare accessory
        }
        
        itemManager.addItemToInventory(msg.sender, itemId, 1);
        
        // Small chance for evolution stone
        if (_random(100) < 10) {
            itemManager.addItemToInventory(msg.sender, 10, 1); // FIRE_STONE
        }
    }
    
    // ============ Helper Functions ============
    
    function _applyItemStatsToPet(address _owner) internal {
        Pet storage pet = pets[_owner];
        IItemSystem.ItemStats memory itemStats = itemManager.calculateTotalStats(_owner);
        
        // Apply permanent item bonuses to pet stats
        // These stack with the pet's base stats
        if (itemStats.attack > 0) {
            pet.attack += uint256(itemStats.attack);
        }
        if (itemStats.defense > 0) {
            pet.defense += uint256(itemStats.defense);
        }
        if (itemStats.speed > 0) {
            pet.speed += uint256(itemStats.speed);
        }
        if (itemStats.health > 0) {
            pet.maxHealth += uint256(itemStats.health);
            pet.health = pet.maxHealth; // Heal to new max
        }
    }
    
    function _getRandomCommonItem() internal view returns (uint256) {
        uint256 roll = _random(3);
        if (roll == 0) return 1; // WOODEN_SWORD
        if (roll == 1) return 4; // LEATHER_ARMOR
        return 6; // HEALTH_POTION
    }
    
    function _getRandomUncommonItem() internal view returns (uint256) {
        uint256 roll = _random(3);
        if (roll == 0) return 2; // IRON_SWORD
        if (roll == 1) return 7; // STRENGTH_ELIXIR
        return 8; // SPEED_BOOTS
    }
    
    function _getRandomRareItem() internal view returns (uint256) {
        uint256 roll = _random(3);
        if (roll == 0) return 5; // STEEL_ARMOR
        if (roll == 1) return 9; // LUCKY_CHARM
        return 10; // FIRE_STONE
    }
    
    function _random(uint256 _max) internal view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, block.prevrandao))) % _max;
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get pet stats including item bonuses
     */
    function getEnhancedPetStats(address _owner) external view returns (
        string memory name,
        PetType petType,
        uint256 level,
        uint256 attack,
        uint256 defense,
        uint256 speed,
        uint256 health,
        uint256 maxHealth
    ) {
        Pet memory pet = pets[_owner];
        IItemSystem.ItemStats memory itemStats = itemManager.calculateTotalStats(_owner);
        
        // Calculate total stats with items
        uint256 totalAttack = pet.attack;
        uint256 totalDefense = pet.defense;
        uint256 totalSpeed = pet.speed;
        
        if (itemStats.attack > 0) {
            totalAttack += uint256(itemStats.attack);
        }
        if (itemStats.defense > 0) {
            totalDefense += uint256(itemStats.defense);
        }
        if (itemStats.speed > 0) {
            totalSpeed += uint256(itemStats.speed);
        }
        
        return (
            pet.name,
            pet.petType,
            pet.level,
            totalAttack,
            totalDefense,
            totalSpeed,
            pet.health,
            pet.maxHealth
        );
    }
    
    /**
     * @notice Get player's item inventory
     */
    function getPlayerInventory(address _owner) external view returns (
        uint256[] memory itemIds,
        uint256[] memory quantities
    ) {
        // This would need a more complex implementation to track all items
        // For now, return equipped items
        IItemSystem.EquippedItems memory equipped = itemManager.getEquippedItems(_owner);
        
        uint256 count = 0;
        if (equipped.weapon != 0) count++;
        if (equipped.armor != 0) count++;
        if (equipped.accessory1 != 0) count++;
        if (equipped.accessory2 != 0) count++;
        if (equipped.accessory3 != 0) count++;
        
        itemIds = new uint256[](count);
        quantities = new uint256[](count);
        
        uint256 index = 0;
        if (equipped.weapon != 0) {
            itemIds[index] = equipped.weapon;
            quantities[index] = 1;
            index++;
        }
        if (equipped.armor != 0) {
            itemIds[index] = equipped.armor;
            quantities[index] = 1;
            index++;
        }
        if (equipped.accessory1 != 0) {
            itemIds[index] = equipped.accessory1;
            quantities[index] = 1;
            index++;
        }
        if (equipped.accessory2 != 0) {
            itemIds[index] = equipped.accessory2;
            quantities[index] = 1;
            index++;
        }
        if (equipped.accessory3 != 0) {
            itemIds[index] = equipped.accessory3;
            quantities[index] = 1;
            index++;
        }
        
        return (itemIds, quantities);
    }
}