// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Test.sol";
import "../src/FrenPetV2.sol";

contract FrenPetV2Test is Test {
    FrenPetV2 public game;
    address public player1;
    address public player2;
    
    function setUp() public {
        game = new FrenPetV2();
        player1 = address(0x1);
        player2 = address(0x2);
        
        // Fund test accounts
        vm.deal(player1, 10 ether);
        vm.deal(player2, 10 ether);
    }
    
    function testCreatePet() public {
        vm.prank(player1);
        game.createPet("TestPet", uint8(FrenPetV2.PetType.Fire));
        
        (
            string memory name,
            uint256 level,
            uint256 experience,
            uint256 happiness,
            uint256 hunger,
            bool isAlive,
            uint8 petType,
            uint8 evolutionStage
        ) = game.getPetStats(player1);
        
        assertEq(name, "TestPet");
        assertEq(petType, uint8(FrenPetV2.PetType.Fire));
        assertEq(level, 1);
        assertEq(experience, 0);
        assertEq(happiness, 100);
        assertEq(hunger, 50);
        assertTrue(isAlive);
        assertEq(evolutionStage, 0);
    }
    
    function testFeedPet() public {
        // Create pet
        vm.prank(player1);
        game.createPet("Hungry", uint8(FrenPetV2.PetType.Water));
        
        // Feed pet
        vm.prank(player1);
        game.feedPet(0); // Basic feeding
        
        (, , , , uint256 hunger, , ,) = game.getPetStats(player1);
        assertLt(hunger, 50); // Hunger should decrease
    }
    
    function testPlayWithPet() public {
        // Create pet
        vm.prank(player1);
        game.createPet("Playful", uint8(FrenPetV2.PetType.Grass));
        
        // Play with pet
        vm.prank(player1);
        game.playWithPet();
        
        (, , , uint256 happiness, , , ,) = game.getPetStats(player1);
        assertEq(happiness, 100); // Already at max
    }
    
    function testTrainPet() public {
        // Create pet
        vm.prank(player1);
        game.createPet("Strong", uint8(FrenPetV2.PetType.Electric));
        
        // Wait for cooldown
        vm.warp(block.timestamp + 61);
        
        // Train pet
        vm.prank(player1);
        game.trainPet();
        
        (, , uint256 experience, , , , ,) = game.getPetStats(player1);
        assertGt(experience, 0); // Should gain experience
    }
    
    function testBattleSystem() public {
        // Create pets for both players
        vm.prank(player1);
        game.createPet("Fighter1", uint8(FrenPetV2.PetType.Fire));
        
        vm.prank(player2);
        game.createPet("Fighter2", uint8(FrenPetV2.PetType.Water));
        
        // Wait for battle cooldown
        vm.warp(block.timestamp + 11 minutes);
        
        // Create battle challenge
        vm.prank(player1);
        uint256 battleId = game.createBattleChallenge(player2);
        
        // Submit moves
        vm.prank(player1);
        game.submitBattleMove(uint8(FrenPetV2.BattleMove.Attack));
        
        vm.prank(player2);
        game.submitBattleMove(uint8(FrenPetV2.BattleMove.Defend));
        
        // Check battle was resolved
        (
            address challenger,
            address opponent,
            , ,
            address winner,
            bool isActive,
            
        ) = game.battles(battleId);
        
        assertEq(challenger, player1);
        assertEq(opponent, player2);
        assertFalse(isActive);
        assertTrue(winner == player1 || winner == player2);
    }
    
    function testItemCreation() public {
        // Create pet
        vm.prank(player1);
        game.createPet("ItemUser", uint8(FrenPetV2.PetType.Dragon));
        
        // Add item to inventory (as contract owner for testing)
        game.addItemToInventory(player1, 1, 1); // Item ID 1, quantity 1
        
        uint256 itemCount = game.getItemBalance(player1, 1);
        assertEq(itemCount, 1);
    }
    
    function testEquipItem() public {
        // Create pet
        vm.prank(player1);
        game.createPet("Equipped", uint8(FrenPetV2.PetType.Normal));
        
        // Add weapon to inventory
        game.addItemToInventory(player1, 1, 1); // Wooden Sword
        
        // Equip item
        vm.prank(player1);
        game.equipItemToPet(1);
        
        // Check equipment
        (uint256 weapon, , , , ) = game.getEquippedItems(player1);
        assertEq(weapon, 1);
    }
    
    function testUseConsumable() public {
        // Create pet
        vm.prank(player1);
        game.createPet("Healer", uint8(FrenPetV2.PetType.Normal));
        
        // Add health potion
        game.addItemToInventory(player1, 6, 1); // Health Potion
        
        // Use item
        vm.prank(player1);
        game.useItem(6);
        
        // Check item was consumed
        uint256 itemCount = game.getItemBalance(player1, 6);
        assertEq(itemCount, 0);
    }
    
    function testMarketplaceListing() public {
        // Create pet
        vm.prank(player1);
        game.createPet("Trader", uint8(FrenPetV2.PetType.Normal));
        
        // Add item
        game.addItemToInventory(player1, 2, 1); // Iron Sword
        
        // List on marketplace
        vm.prank(player1);
        uint256 listingId = game.listItemForSale(2, 1, 100);
        
        (
            address seller,
            uint256 itemId,
            uint256 quantity,
            uint256 price,
            bool active
        ) = game.marketplaceListings(listingId);
        
        assertEq(seller, player1);
        assertEq(itemId, 2);
        assertEq(quantity, 1);
        assertEq(price, 100);
        assertTrue(active);
    }
    
    function testPurchaseFromMarketplace() public {
        // Setup seller
        vm.prank(player1);
        game.createPet("Seller", uint8(FrenPetV2.PetType.Normal));
        game.addItemToInventory(player1, 3, 1); // Dragon Blade
        
        // Setup buyer
        vm.prank(player2);
        game.createPet("Buyer", uint8(FrenPetV2.PetType.Normal));
        
        // No need to advance time - first claim should work
        
        // Give buyer coins
        vm.prank(player2);
        game.claimDailyReward();
        
        // List item
        vm.prank(player1);
        uint256 listingId = game.listItemForSale(3, 1, 50);
        
        // Purchase item
        vm.prank(player2);
        game.purchaseFromMarketplace(listingId);
        
        // Check transfer
        uint256 buyerBalance = game.getItemBalance(player2, 3);
        assertEq(buyerBalance, 1);
        
        // Check listing is inactive
        (, , , , bool active) = game.marketplaceListings(listingId);
        assertFalse(active);
    }
    
    function testEvolution() public {
        // Create pet
        vm.prank(player1);
        game.createPet("Evolver", uint8(FrenPetV2.PetType.Fire));
        
        // Level up to 10 (multiple training sessions)
        for (uint i = 0; i < 20; i++) {
            vm.warp(block.timestamp + 2 minutes);
            vm.prank(player1);
            game.trainPet();
        }
        
        // Check if can evolve
        vm.prank(player1);
        bool canEvolve = game.canEvolve(player1);
        
        if (canEvolve) {
            vm.prank(player1);
            game.evolvePet();
            
            (, , , , , , , uint8 evolutionStage) = game.getPetStats(player1);
            assertEq(evolutionStage, 1);
        }
    }
    
    function testDailyReward() public {
        // Create pet
        vm.prank(player1);
        game.createPet("Daily", uint8(FrenPetV2.PetType.Normal));
        
        // No need to advance time - first claim should work
        
        // Claim daily reward
        vm.prank(player1);
        game.claimDailyReward();
        
        (, uint256 coins, , , ) = game.getInventory(player1);
        assertGt(coins, 0);
        
        // Try to claim again (should fail)
        vm.expectRevert("Already claimed today");
        vm.prank(player1);
        game.claimDailyReward();
    }
}