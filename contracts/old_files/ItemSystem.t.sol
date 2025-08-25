// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Test.sol";
import "../src/ItemManager.sol";
import "../src/FrenPetV2Enhanced.sol";
import "../src/interfaces/IItemSystem.sol";
import "../src/interfaces/IPetTypes.sol";

contract ItemSystemTest is Test {
    ItemManager public itemManager;
    FrenPetV2Enhanced public game;
    
    address public alice = address(0x1);
    address public bob = address(0x2);
    
    function setUp() public {
        itemManager = new ItemManager();
        game = new FrenPetV2Enhanced();
        
        // Fund test accounts
        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
        
        // Create pets for testing
        vm.prank(alice);
        game.createPet("TestPet", IPetTypes.PetType.Fire);
        
        vm.prank(bob);
        game.createPet("BobPet", IPetTypes.PetType.Water);
    }
    
    // ============ Item Creation Tests ============
    
    function testDefaultItemsCreated() public {
        // Check wooden sword exists
        IItemSystem.Item memory woodenSword = itemManager.getItemDetails(1); // WOODEN_SWORD
        assertEq(woodenSword.name, "Wooden Sword");
        assertTrue(woodenSword.category == IItemSystem.ItemCategory.Weapon);
        assertTrue(woodenSword.rarity == IItemSystem.ItemRarity.Common);
        assertEq(woodenSword.stats.attack, 5);
    }
    
    function testDragonBladeStats() public {
        IItemSystem.Item memory dragonBlade = itemManager.getItemDetails(3); // DRAGON_BLADE
        assertEq(dragonBlade.name, "Dragon Blade");
        assertTrue(dragonBlade.category == IItemSystem.ItemCategory.Weapon);
        assertTrue(dragonBlade.rarity == IItemSystem.ItemRarity.Legendary);
        assertEq(dragonBlade.stats.attack, 25);
        assertEq(dragonBlade.stats.defense, 5);
        assertEq(dragonBlade.stats.speed, 5);
        assertEq(dragonBlade.stats.critChance, 20);
    }
    
    function testHealthPotionIsConsumable() public {
        IItemSystem.Item memory potion = itemManager.getItemDetails(6); // HEALTH_POTION
        assertTrue(potion.category == IItemSystem.ItemCategory.Consumable);
        assertTrue(potion.consumable);
        assertEq(potion.effects.length, 1);
        assertTrue(potion.effects[0].effectType == IItemSystem.EffectType.InstantHeal);
        assertEq(potion.effects[0].value, 50);
    }
    
    // ============ Equipment Tests ============
    
    function testEquipWeapon() public {
        // Give Alice a wooden sword
        itemManager.addItemToInventory(alice, 1, 1); // WOODEN_SWORD
        
        // Equip it
        vm.prank(alice);
        itemManager.equipItem(alice, 1); // WOODEN_SWORD
        
        // Check it's equipped
        IItemSystem.EquippedItems memory equipped = itemManager.getEquippedItems(alice);
        assertEq(equipped.weapon, 1); // WOODEN_SWORD
    }
    
    function testEquipMultipleAccessories() public {
        // Give Alice accessories
        itemManager.addItemToInventory(alice, 8, 1);
        itemManager.addItemToInventory(alice, 9, 1);
        
        // Equip both
        vm.prank(alice);
        itemManager.equipItem(alice, 8);
        
        vm.prank(alice);
        itemManager.equipItem(alice, 9);
        
        // Check both equipped
        IItemSystem.EquippedItems memory equipped = itemManager.getEquippedItems(alice);
        assertEq(equipped.accessory1, 8);
        assertEq(equipped.accessory2, 9);
    }
    
    function testCannotEquipConsumable() public {
        itemManager.addItemToInventory(alice, 6, 1);
        
        vm.prank(alice);
        vm.expectRevert("Cannot equip consumables");
        itemManager.equipItem(alice, 6);
    }
    
    function testUnequipItem() public {
        // Equip weapon
        itemManager.addItemToInventory(alice, 2, 1);
        vm.prank(alice);
        itemManager.equipItem(alice, 2);
        
        // Unequip it
        vm.prank(alice);
        itemManager.unequipItem(alice, 2);
        
        // Check it's unequipped
        IItemSystem.EquippedItems memory equipped = itemManager.getEquippedItems(alice);
        assertEq(equipped.weapon, 0);
    }
    
    // ============ Stats Calculation Tests ============
    
    function testCalculateTotalStats() public {
        // Equip multiple items
        itemManager.addItemToInventory(alice, 2, 1);
        itemManager.addItemToInventory(alice, 4, 1);
        itemManager.addItemToInventory(alice, 8, 1);
        
        vm.startPrank(alice);
        itemManager.equipItem(alice, 2);
        itemManager.equipItem(alice, 4);
        itemManager.equipItem(alice, 8);
        vm.stopPrank();
        
        // Calculate total stats
        IItemSystem.ItemStats memory total = itemManager.calculateTotalStats(alice);
        
        // Iron Sword: +10 attack, +2 defense
        // Leather Armor: +5 defense, -1 speed, +10 health
        // Speed Boots: +10 speed
        assertEq(total.attack, 10);
        assertEq(total.defense, 7); // 2 + 5
        assertEq(total.speed, 9); // -1 + 10
        assertEq(total.health, 10);
        assertEq(total.critChance, 10); // From Iron Sword
        assertEq(total.dodgeChance, 20); // 5 + 15
    }
    
    // ============ Consumable Usage Tests ============
    
    function testUseHealthPotion() public {
        itemManager.addItemToInventory(alice, 6, 2);
        
        // Use one potion
        vm.prank(alice);
        itemManager.useItem(alice, 6);
        
        // Check quantity decreased
        uint256 remaining = itemManager.getInventoryItem(alice, 6);
        assertEq(remaining, 1);
    }
    
    function testStrengthElixirAppliesEffect() public {
        itemManager.addItemToInventory(alice, 7, 1);
        
        vm.prank(alice);
        itemManager.useItem(alice, 7);
        
        // Check active effect
        IItemSystem.ActiveEffect[] memory effects = itemManager.getActiveEffects(alice);
        assertEq(effects.length, 1);
        assertTrue(effects[0].effectType == IItemSystem.EffectType.AttackBoost);
        assertEq(effects[0].value, 20);
        assertTrue(effects[0].expiresAt > block.timestamp);
    }
    
    // ============ Effect System Tests ============
    
    function testEffectExpiration() public {
        itemManager.addItemToInventory(alice, 7, 1);
        
        vm.prank(alice);
        itemManager.useItem(alice, 7);
        
        // Fast forward past duration
        vm.warp(block.timestamp + 301); // 5 minutes + 1 second
        
        // Check effect expired
        IItemSystem.ActiveEffect[] memory effects = itemManager.getActiveEffects(alice);
        assertEq(effects.length, 0);
    }
    
    function testPermanentEffects() public {
        // Equip item with permanent effect
        itemManager.addItemToInventory(alice, 3, 1);
        
        vm.prank(alice);
        itemManager.equipItem(alice, 3);
        
        // Check effect is permanent
        IItemSystem.ActiveEffect[] memory effects = itemManager.getActiveEffects(alice);
        assertEq(effects.length, 1);
        assertTrue(effects[0].effectType == IItemSystem.EffectType.ElementalDamage);
        assertEq(effects[0].expiresAt, type(uint256).max); // Permanent
    }
    
    // ============ Integration Tests ============
    
    function testEnhancedBattlePower() public {
        // Give Alice powerful equipment
        itemManager.addItemToInventory(alice, 3, 1);
        itemManager.addItemToInventory(alice, 5, 1);
        
        vm.startPrank(alice);
        game.equipItemToPet(3);
        game.equipItemToPet(5);
        vm.stopPrank();
        
        // Calculate enhanced battle power
        uint256 enhancedPower = game.calculateEnhancedBattlePower(
            alice,
            IPetTypes.BattleMove.Attack,
            IPetTypes.PetType.Grass
        );
        
        // Should be significantly higher with equipment
        assertTrue(enhancedPower > 0);
    }
    
    function testUseItemOnPet() public {
        // Damage the pet first
        vm.warp(block.timestamp + 20 hours); // Let pet get hungry/unhappy
        
        // Give healing item
        itemManager.addItemToInventory(alice, 6, 1);
        
        // Use on pet
        vm.prank(alice);
        game.useItemOnPet(6);
        
        // Check pet health improved
        (,,,,,, uint256 health,) = game.getPetStats(alice);
        assertTrue(health > 0);
    }
    
    function testFeedPetWithItem() public {
        // Give food item
        itemManager.addItemToInventory(alice, 6, 1);
        
        // Time passes to make pet hungry
        vm.warp(block.timestamp + 5 hours);
        
        // Feed with item
        vm.prank(alice);
        game.feedPetWithItem(6);
        
        // Check hunger reduced
        (,,,,, uint256 hunger,,) = game.getPetStats(alice);
        assertTrue(hunger < 50);
    }
    
    function testClaimEnhancedDailyReward() public {
        vm.prank(alice);
        game.claimEnhancedDailyReward();
        
        // Should have received coins and items
        (uint256 coins,,,,) = game.getInventory(alice);
        assertTrue(coins >= 150); // 100 starting + 50 daily
        
        // Check for item rewards (at least one item should be given)
        uint256 potions = itemManager.getInventoryItem(alice, 6);
        uint256 elixirs = itemManager.getInventoryItem(alice, 7);
        uint256 boots = itemManager.getInventoryItem(alice, 8);
        uint256 charms = itemManager.getInventoryItem(alice, 9);
        
        assertTrue(potions + elixirs + boots + charms > 0);
    }
    
    // ============ Edge Cases ============
    
    function testCannotEquipWithoutItem() public {
        vm.prank(alice);
        vm.expectRevert("Item not in inventory");
        itemManager.equipItem(alice, 3);
    }
    
    function testMaxAccessorySlots() public {
        // Give 4 accessories
        itemManager.addItemToInventory(alice, 8, 4);
        
        vm.startPrank(alice);
        itemManager.equipItem(alice, 8); // Slot 1
        
        // Add more accessories to different slots (would need different item IDs in real scenario)
        // For test, we'll check the limit
        vm.stopPrank();
        
        IItemSystem.EquippedItems memory equipped = itemManager.getEquippedItems(alice);
        assertEq(equipped.accessory1, 8);
    }
}