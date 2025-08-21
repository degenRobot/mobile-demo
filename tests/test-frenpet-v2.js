/**
 * Test script for FrenPetV2 contracts
 * Tests all major functionality including battles, items, and evolution
 */

const { ethers } = require('ethers');
const FrenPetV2ABI = require('../contracts/out/FrenPetV2.sol/FrenPetV2.json').abi;
const FrenPetV2EnhancedABI = require('../contracts/out/FrenPetV2Enhanced.sol/FrenPetV2Enhanced.json').abi;
const ItemManagerABI = require('../contracts/out/ItemManager.sol/ItemManager.json').abi;

// Contract addresses (update after deployment)
const CONTRACTS = {
    FrenPetV2: '0x...', // Update after deployment
    FrenPetV2Enhanced: '0x...', // Update after deployment
    ItemManager: '0x...', // Update after deployment
};

// RISE Testnet configuration
const RPC_URL = 'https://testnet.riselabs.xyz';
const CHAIN_ID = 11155931;

// Pet types enum
const PetType = {
    None: 0,
    Normal: 1,
    Fire: 2,
    Water: 3,
    Grass: 4,
    Electric: 5,
    Dragon: 6
};

// Battle moves enum
const BattleMove = {
    None: 0,
    Attack: 1,
    Defend: 2,
    Special: 3
};

// Item IDs
const Items = {
    WOODEN_SWORD: 1,
    IRON_SWORD: 2,
    DRAGON_BLADE: 3,
    LEATHER_ARMOR: 4,
    STEEL_ARMOR: 5,
    HEALTH_POTION: 6,
    STRENGTH_ELIXIR: 7,
    SPEED_BOOTS: 8,
    LUCKY_CHARM: 9,
    FIRE_STONE: 10
};

async function main() {
    console.log('🎮 Testing FrenPetV2 Contracts on RISE Testnet\n');
    
    // Setup provider and wallets
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    // Test wallets (fund these with testnet ETH)
    const wallet1 = new ethers.Wallet(process.env.TEST_WALLET_1 || ethers.Wallet.createRandom().privateKey, provider);
    const wallet2 = new ethers.Wallet(process.env.TEST_WALLET_2 || ethers.Wallet.createRandom().privateKey, provider);
    
    console.log('Test Wallet 1:', wallet1.address);
    console.log('Test Wallet 2:', wallet2.address);
    
    // Connect to contracts
    const frenPetV2 = new ethers.Contract(CONTRACTS.FrenPetV2, FrenPetV2ABI, wallet1);
    const frenPetEnhanced = new ethers.Contract(CONTRACTS.FrenPetV2Enhanced, FrenPetV2EnhancedABI, wallet1);
    const itemManager = new ethers.Contract(CONTRACTS.ItemManager, ItemManagerABI, wallet1);
    
    try {
        // Test 1: Create Pets
        console.log('\n📝 Test 1: Creating Pets...');
        
        const tx1 = await frenPetEnhanced.createPet('Flamey', PetType.Fire);
        await tx1.wait();
        console.log('✅ Player 1 created Fire pet: Flamey');
        
        const frenPetEnhanced2 = frenPetEnhanced.connect(wallet2);
        const tx2 = await frenPetEnhanced2.createPet('Aqua', PetType.Water);
        await tx2.wait();
        console.log('✅ Player 2 created Water pet: Aqua');
        
        // Test 2: Check Pet Stats
        console.log('\n📊 Test 2: Checking Pet Stats...');
        
        const stats1 = await frenPetEnhanced.getPetStats(wallet1.address);
        console.log(`Player 1 Pet: ${stats1.name} | Level: ${stats1.level} | Type: ${stats1.petType}`);
        
        const stats2 = await frenPetEnhanced.getPetStats(wallet2.address);
        console.log(`Player 2 Pet: ${stats2.name} | Level: ${stats2.level} | Type: ${stats2.petType}`);
        
        // Test 3: Feed and Play
        console.log('\n🍎 Test 3: Feeding and Playing...');
        
        const feedTx = await frenPetEnhanced.feedPet(0); // Basic feeding
        await feedTx.wait();
        console.log('✅ Fed pet');
        
        const playTx = await frenPetEnhanced.playWithPet();
        await playTx.wait();
        console.log('✅ Played with pet');
        
        // Test 4: Training
        console.log('\n💪 Test 4: Training Pet...');
        
        // Wait for cooldown
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const trainTx = await frenPetEnhanced.trainPet();
        await trainTx.wait();
        console.log('✅ Trained pet');
        
        // Test 5: Claim Daily Reward
        console.log('\n🎁 Test 5: Claiming Daily Reward...');
        
        try {
            const rewardTx = await frenPetEnhanced.claimDailyReward();
            await rewardTx.wait();
            console.log('✅ Claimed daily reward');
        } catch (error) {
            if (error.message.includes('Already claimed')) {
                console.log('⏰ Daily reward already claimed');
            } else {
                throw error;
            }
        }
        
        // Test 6: Get Inventory
        console.log('\n🎒 Test 6: Checking Inventory...');
        
        const inventory = await frenPetEnhanced.getInventory(wallet1.address);
        console.log(`Coins: ${inventory.coins}`);
        console.log(`Basic Food: ${inventory.basicFood}`);
        console.log(`Health Potions: ${inventory.healthPotions}`);
        
        // Test 7: Equip Item (if available)
        console.log('\n⚔️ Test 7: Equipment System...');
        
        // Give player an item for testing
        const itemTx = await itemManager.addItemToInventory(wallet1.address, Items.WOODEN_SWORD, 1);
        await itemTx.wait();
        console.log('✅ Added Wooden Sword to inventory');
        
        const equipTx = await frenPetEnhanced.equipItemToPet(Items.WOODEN_SWORD);
        await equipTx.wait();
        console.log('✅ Equipped Wooden Sword');
        
        // Test 8: Battle System
        console.log('\n⚔️ Test 8: Battle System...');
        
        // Create battle challenge
        const challengeTx = await frenPetEnhanced.createBattleChallenge(wallet2.address);
        await challengeTx.wait();
        console.log('✅ Created battle challenge');
        
        // Get battle ID
        const battleId = await frenPetEnhanced.activeBattles(wallet1.address);
        console.log(`Battle ID: ${battleId}`);
        
        // Submit moves
        const move1Tx = await frenPetEnhanced.submitBattleMove(BattleMove.Attack);
        await move1Tx.wait();
        console.log('✅ Player 1 chose Attack');
        
        const move2Tx = await frenPetEnhanced2.submitBattleMove(BattleMove.Defend);
        await move2Tx.wait();
        console.log('✅ Player 2 chose Defend');
        
        // Check battle result
        const battle = await frenPetEnhanced.battles(battleId);
        console.log(`Battle Winner: ${battle.winner}`);
        
        // Test 9: Enhanced Stats with Items
        console.log('\n📈 Test 9: Enhanced Stats...');
        
        const enhancedStats = await frenPetEnhanced.getEnhancedPetStats(wallet1.address);
        console.log(`Enhanced Attack: ${enhancedStats.attack}`);
        console.log(`Enhanced Defense: ${enhancedStats.defense}`);
        console.log(`Enhanced Speed: ${enhancedStats.speed}`);
        
        // Test 10: Evolution Check
        console.log('\n🦋 Test 10: Evolution System...');
        
        const canEvolve = await frenPetEnhanced.canEvolve(wallet1.address);
        console.log(`Can evolve: ${canEvolve}`);
        
        if (canEvolve) {
            const evolveTx = await frenPetEnhanced.evolvePet();
            await evolveTx.wait();
            console.log('✅ Pet evolved!');
        } else {
            console.log('📊 Pet needs level 10 to evolve');
        }
        
        console.log('\n✅ All tests completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error);
    }
}

// Run tests
main().catch(console.error);