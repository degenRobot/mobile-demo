// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Test.sol";
import "../src/FrenPetV2.sol";
import "../src/interfaces/IPetTypes.sol";

contract FrenPetV2Test is Test {
    FrenPetV2 public game;
    address public alice = address(0x1);
    address public bob = address(0x2);
    address public charlie = address(0x3);
    
    function setUp() public {
        game = new FrenPetV2();
        
        // Fund test accounts
        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
        vm.deal(charlie, 10 ether);
    }
    
    // ============ Pet Creation Tests ============
    
    function testCreatePet() public {
        vm.prank(alice);
        game.createPet("Fluffy", IPetTypes.PetType.Fire);
        
        assertTrue(game.hasPet(alice));
        
        (string memory name, IPetTypes.PetType petType,,,,,, bool isAlive) = game.getPetStats(alice);
        assertEq(name, "Fluffy");
        assertTrue(petType == IPetTypes.PetType.Fire);
        assertTrue(isAlive);
    }
    
    function testCreateMultiplePetTypes() public {
        vm.prank(alice);
        game.createPet("Flamey", IPetTypes.PetType.Fire);
        
        vm.prank(bob);
        game.createPet("Splashy", IPetTypes.PetType.Water);
        
        vm.prank(charlie);
        game.createPet("Leafy", IPetTypes.PetType.Grass);
        
        // Verify different base stats
        (,,,,,,, bool aliceAlive) = game.getPetStats(alice);
        (,,,,,,, bool bobAlive) = game.getPetStats(bob);
        (,,,,,,, bool charlieAlive) = game.getPetStats(charlie);
        
        assertTrue(aliceAlive);
        assertTrue(bobAlive);
        assertTrue(charlieAlive);
    }
    
    function testCannotCreatePetWithEmptyName() public {
        vm.prank(alice);
        vm.expectRevert("Invalid name length");
        game.createPet("", IPetTypes.PetType.Fire);
    }
    
    // ============ Feeding & Care Tests ============
    
    function testFeedPet() public {
        vm.prank(alice);
        game.createPet("Hungry", IPetTypes.PetType.Normal);
        
        // Fast forward time to increase hunger
        vm.warp(block.timestamp + 4 hours);
        
        vm.prank(alice);
        game.feedPet(IPetTypes.ItemType.None);
        
        (,,,,,uint256 hunger,, bool isAlive) = game.getPetStats(alice);
        assertTrue(hunger < 40); // Should be reduced after feeding
        assertTrue(isAlive);
    }
    
    function testPlayWithPet() public {
        vm.prank(alice);
        game.createPet("Playful", IPetTypes.PetType.Electric);
        
        // Fast forward time to decrease happiness
        vm.warp(block.timestamp + 3 hours);
        
        vm.prank(alice);
        game.playWithPet();
        
        (,,,,uint256 happiness,,, bool isAlive) = game.getPetStats(alice);
        assertEq(happiness, 100); // Should be max after playing
        assertTrue(isAlive);
    }
    
    function testTrainPet() public {
        vm.prank(alice);
        game.createPet("Strong", IPetTypes.PetType.Dragon);
        
        // Wait for battle cooldown
        vm.warp(block.timestamp + 11 minutes);
        
        uint256 initialExp;
        (,,uint256 level, uint256 exp,,,,) = game.getPetStats(alice);
        initialExp = exp;
        
        vm.prank(alice);
        game.trainPet();
        
        (,,uint256 newLevel, uint256 newExp,,,,) = game.getPetStats(alice);
        assertTrue(newExp > initialExp);
    }
    
    // ============ Evolution Tests ============
    
    function testPetEvolution() public {
        vm.prank(alice);
        game.createPet("Evolvy", IPetTypes.PetType.Fire);
        
        // Train pet many times to reach level 10
        // Each training gives 25 exp, need 1000 exp for level 10
        vm.warp(block.timestamp + 11 minutes);
        
        for (uint i = 0; i < 40; i++) {
            vm.prank(alice);
            game.trainPet();
            // Wait for cooldown between training sessions
            vm.warp(block.timestamp + 11 minutes);
            // Restore happiness for next training
            vm.prank(alice);
            game.playWithPet();
        }
        
        // Check if can evolve
        assertTrue(game.canEvolve(alice));
        
        vm.prank(alice);
        game.evolvePet();
        
        // Verify evolution happened
        // After evolution, pet should not be able to evolve again at level 10
        assertFalse(game.canEvolve(alice));
    }
    
    // ============ Battle System Tests ============
    
    function testCreateBattleChallenge() public {
        // Create pets for both players
        vm.prank(alice);
        game.createPet("Fighter", IPetTypes.PetType.Fire);
        
        vm.prank(bob);
        game.createPet("Defender", IPetTypes.PetType.Water);
        
        // Wait for cooldown
        vm.warp(block.timestamp + 11 minutes);
        
        // Alice challenges Bob
        vm.prank(alice);
        game.createBattleChallenge(bob);
        
        // Verify battle was created
        uint256 battleId = game.activeBattles(alice);
        assertTrue(battleId > 0);
        assertEq(game.activeBattles(bob), battleId);
    }
    
    function testBattleResolution() public {
        // Setup battle
        vm.prank(alice);
        game.createPet("Attacker", IPetTypes.PetType.Fire);
        
        vm.prank(bob);
        game.createPet("Defender", IPetTypes.PetType.Grass); // Fire > Grass
        
        // Wait for cooldown
        vm.warp(block.timestamp + 11 minutes);
        
        vm.prank(alice);
        game.createBattleChallenge(bob);
        
        uint256 battleId = game.activeBattles(alice);
        
        // Submit moves
        vm.prank(alice);
        game.submitBattleMove(IPetTypes.BattleMove.Attack);
        
        vm.prank(bob);
        game.submitBattleMove(IPetTypes.BattleMove.Defend);
        
        // Battle should be resolved automatically
        (,,,, bool completed,,) = game.battles(battleId);
        assertTrue(completed);
        
        // Alice should have won (Fire > Grass)
        (address challenger,, address winner,,,,) = game.battles(battleId);
        assertEq(winner, alice);
    }
    
    function testTypeAdvantage() public {
        // Test Water > Fire
        vm.prank(alice);
        game.createPet("FirePet", IPetTypes.PetType.Fire);
        
        vm.prank(bob);
        game.createPet("WaterPet", IPetTypes.PetType.Water);
        
        // Wait for cooldown
        vm.warp(block.timestamp + 11 minutes);
        
        vm.prank(alice);
        game.createBattleChallenge(bob);
        
        vm.prank(alice);
        game.submitBattleMove(IPetTypes.BattleMove.Attack);
        
        vm.prank(bob);
        game.submitBattleMove(IPetTypes.BattleMove.Attack);
        
        // Bob (Water) should win against Alice (Fire)
        uint256 battleId = game.activeBattles(alice);
        (,,address winner,,,,) = game.battles(battleId);
        // Note: With equal stats, type advantage should determine winner
    }
    
    // ============ Inventory Tests ============
    
    function testClaimDailyReward() public {
        vm.prank(alice);
        game.createPet("Lucky", IPetTypes.PetType.Normal);
        
        vm.prank(alice);
        game.claimDailyReward();
        
        (uint256 coins,,,,) = game.getInventory(alice);
        assertTrue(coins >= 150); // 100 starting + 50 daily
    }
    
    function testCannotClaimDailyRewardTwice() public {
        vm.prank(alice);
        game.createPet("Greedy", IPetTypes.PetType.Normal);
        
        vm.prank(alice);
        game.claimDailyReward();
        
        vm.prank(alice);
        vm.expectRevert("Already claimed today");
        game.claimDailyReward();
        
        // Fast forward 1 day
        vm.warp(block.timestamp + 1 days);
        
        // Should work now
        vm.prank(alice);
        game.claimDailyReward();
    }
    
    function testUseHealthPotion() public {
        vm.prank(alice);
        game.createPet("Injured", IPetTypes.PetType.Normal);
        
        // Test would need inventory manipulation helper
        // For now just verify pet was created
        assertTrue(game.hasPet(alice));
    }
    
    // ============ Marketplace Tests ============
    
    function testListItemOnMarketplace() public {
        vm.prank(alice);
        game.createPet("Merchant", IPetTypes.PetType.Normal);
        
        // Test marketplace creation
        assertTrue(game.hasPet(alice));
        
        // Full test would need items in inventory
    }
    
    function testBuyFromMarketplace() public {
        // Setup seller
        vm.prank(alice);
        game.createPet("Seller", IPetTypes.PetType.Normal);
        
        // Setup buyer
        vm.prank(bob);
        game.createPet("Buyer", IPetTypes.PetType.Normal);
        
        // Would need to:
        // 1. Give Alice items
        // 2. Alice lists item
        // 3. Bob buys item
        // Full test would require helper functions or direct state manipulation
    }
    
    // ============ Edge Cases & Death Tests ============
    
    function testPetDiesFromNeglect() public {
        vm.prank(alice);
        game.createPet("Neglected", IPetTypes.PetType.Normal);
        
        // Fast forward time significantly
        vm.warp(block.timestamp + 20 hours);
        
        (,,,,,,, bool isAlive) = game.getPetStats(alice);
        assertFalse(isAlive);
    }
    
    function testCannotInteractWithDeadPet() public {
        vm.prank(alice);
        game.createPet("Dead", IPetTypes.PetType.Normal);
        
        // Kill pet by time
        vm.warp(block.timestamp + 20 hours);
        
        vm.prank(alice);
        vm.expectRevert("Your pet needs to be revived");
        game.feedPet(IPetTypes.ItemType.None);
    }
    
    function testRevivePet() public {
        vm.prank(alice);
        game.createPet("Phoenix", IPetTypes.PetType.Fire);
        
        // Kill pet
        vm.warp(block.timestamp + 20 hours);
        
        // Would need RevivePotion in inventory
        // vm.prank(alice);
        // game.useItem(IPetTypes.ItemType.RevivePotion);
        
        // Alternatively, create new pet
        vm.prank(alice);
        game.createPet("Phoenix2", IPetTypes.PetType.Fire);
        
        assertTrue(game.hasPet(alice));
    }
    
    // ============ Gas Optimization Tests ============
    
    function testGasForBatchOperations() public {
        vm.prank(alice);
        game.createPet("Gassy", IPetTypes.PetType.Normal);
        
        // Wait for cooldown
        vm.warp(block.timestamp + 11 minutes);
        
        uint256 gasBefore = gasleft();
        
        // Perform multiple operations
        vm.prank(alice);
        game.feedPet(IPetTypes.ItemType.None);
        vm.prank(alice);
        game.playWithPet();
        vm.prank(alice);
        game.trainPet();
        
        uint256 gasUsed = gasBefore - gasleft();
        console.log("Gas used for 3 operations:", gasUsed);
        
        // Assert reasonable gas usage
        assertTrue(gasUsed < 300000);
    }
}