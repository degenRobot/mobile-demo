/**
 * Test FrenPetV2 with Porto gasless transactions
 * Demonstrates Web2-like UX with no gas fees
 */

const { ethers } = require('ethers');
const FrenPetV2EnhancedABI = require('../contracts/out/FrenPetV2Enhanced.sol/FrenPetV2Enhanced.json').abi;

// Porto configuration
const PORTO_CONFIG = {
    relayUrl: 'https://rise-testnet-porto.fly.dev',
    orchestrator: '0x046832405512d508b873e65174e51613291083bc',
    proxy: '0xf463d5cbc64916caa2775a8e9b264f8c35f4b8a4',
    implementation: '0x912a428b1a7e7cb7bb2709a2799a01c020c5acd9',
    relayWallet: '0x584B5274765a7F7C78FDc960248f38e5Ad6b1EDb',
};

// Contract address (update after deployment)
const FRENPET_V2_ENHANCED = '0x...'; // Update after deployment

// RISE Testnet
const CHAIN_ID = 11155931;
const RPC_URL = 'https://testnet.riselabs.xyz';

// Pet types
const PetType = {
    Fire: 2,
    Water: 3,
    Grass: 4
};

/**
 * Setup Porto delegation for gasless transactions
 */
async function setupPortoDelegation(wallet, sessionKey) {
    console.log('🔧 Setting up Porto delegation...');
    
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    // Prepare upgrade account
    const prepareResponse = await fetch(PORTO_CONFIG.relayUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'wallet_prepareUpgradeAccount',
            params: [{
                account: wallet.address,
                contracts: {
                    implementation: PORTO_CONFIG.implementation,
                    orchestrator: PORTO_CONFIG.orchestrator,
                },
                capabilities: {
                    sessions: [{
                        publicKey: serializePublicKey(sessionKey.address),
                        role: 'admin',
                    }],
                },
            }],
        }),
    });
    
    const prepareResult = await prepareResponse.json();
    if (prepareResult.error) {
        throw new Error(`Prepare failed: ${prepareResult.error.message}`);
    }
    
    console.log('✅ Upgrade prepared');
    
    // Sign authorization
    const { authorization } = prepareResult.result;
    const signature = await wallet.signMessage(ethers.getBytes(authorization));
    
    // Upgrade account
    const upgradeResponse = await fetch(PORTO_CONFIG.relayUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: 2,
            method: 'wallet_upgradeAccount',
            params: [{
                account: wallet.address,
                authorization,
                signature,
            }],
        }),
    });
    
    const upgradeResult = await upgradeResponse.json();
    if (upgradeResult.error) {
        throw new Error(`Upgrade failed: ${upgradeResult.error.message}`);
    }
    
    console.log('✅ Account upgraded for gasless transactions');
    return upgradeResult.result;
}

/**
 * Execute gasless transaction
 */
async function executeGaslessTransaction(sessionKey, to, data) {
    const response = await fetch(PORTO_CONFIG.relayUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: Date.now(),
            method: 'eth_sendTransaction',
            params: [{
                from: sessionKey.address,
                to,
                data,
                gas: '0x100000',
                capabilities: {
                    meta: {
                        feeToken: '0x0000000000000000000000000000000000000000', // ETH
                    },
                },
            }],
        }),
    });
    
    const result = await response.json();
    if (result.error) {
        throw new Error(`Transaction failed: ${result.error.message}`);
    }
    
    return result.result;
}

/**
 * Serialize public key for Porto
 */
function serializePublicKey(address) {
    const cleanAddress = address.startsWith('0x') ? address.slice(2) : address;
    const padding = '0'.repeat(64 - cleanAddress.length);
    return `0x${padding}${cleanAddress}`;
}

async function main() {
    console.log('🎮 Testing FrenPetV2 with Gasless Transactions\n');
    
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    // Create main wallet (needs small ETH for delegation setup only)
    const mainWallet = ethers.Wallet.createRandom().connect(provider);
    console.log('Main Wallet:', mainWallet.address);
    
    // Create session key (never needs ETH)
    const sessionKey = ethers.Wallet.createRandom();
    console.log('Session Key:', sessionKey.address);
    
    // Setup contract interface
    const contractInterface = new ethers.Interface(FrenPetV2EnhancedABI);
    
    try {
        // Step 1: Setup Porto delegation
        console.log('\n📝 Step 1: Porto Delegation Setup');
        await setupPortoDelegation(mainWallet, sessionKey);
        
        // Step 2: Create pet (gasless)
        console.log('\n🐾 Step 2: Creating Pet (Gasless)...');
        
        const createPetData = contractInterface.encodeFunctionData('createPet', [
            'GaslessDragon',
            PetType.Fire
        ]);
        
        const createTxHash = await executeGaslessTransaction(
            sessionKey,
            FRENPET_V2_ENHANCED,
            createPetData
        );
        console.log(`✅ Pet created gaslessly! Tx: ${createTxHash}`);
        
        // Wait for confirmation
        await provider.waitForTransaction(createTxHash);
        
        // Step 3: Feed pet (gasless)
        console.log('\n🍎 Step 3: Feeding Pet (Gasless)...');
        
        const feedData = contractInterface.encodeFunctionData('feedPet', [0]);
        const feedTxHash = await executeGaslessTransaction(
            sessionKey,
            FRENPET_V2_ENHANCED,
            feedData
        );
        console.log(`✅ Pet fed gaslessly! Tx: ${feedTxHash}`);
        
        // Step 4: Play with pet (gasless)
        console.log('\n🎮 Step 4: Playing with Pet (Gasless)...');
        
        const playData = contractInterface.encodeFunctionData('playWithPet', []);
        const playTxHash = await executeGaslessTransaction(
            sessionKey,
            FRENPET_V2_ENHANCED,
            playData
        );
        console.log(`✅ Played with pet gaslessly! Tx: ${playTxHash}`);
        
        // Step 5: Check pet stats
        console.log('\n📊 Step 5: Checking Pet Stats...');
        
        const contract = new ethers.Contract(FRENPET_V2_ENHANCED, FrenPetV2EnhancedABI, provider);
        const stats = await contract.getPetStats(mainWallet.address);
        
        console.log(`Pet Name: ${stats.name}`);
        console.log(`Level: ${stats.level}`);
        console.log(`Experience: ${stats.experience}`);
        console.log(`Happiness: ${stats.happiness}`);
        console.log(`Hunger: ${stats.hunger}`);
        console.log(`Is Alive: ${stats.isAlive}`);
        
        // Step 6: Claim daily reward (gasless)
        console.log('\n🎁 Step 6: Claiming Daily Reward (Gasless)...');
        
        try {
            const rewardData = contractInterface.encodeFunctionData('claimEnhancedDailyReward', []);
            const rewardTxHash = await executeGaslessTransaction(
                sessionKey,
                FRENPET_V2_ENHANCED,
                rewardData
            );
            console.log(`✅ Daily reward claimed gaslessly! Tx: ${rewardTxHash}`);
        } catch (error) {
            if (error.message.includes('Already claimed')) {
                console.log('⏰ Daily reward already claimed');
            } else {
                throw error;
            }
        }
        
        // Step 7: Train pet (gasless)
        console.log('\n💪 Step 7: Training Pet (Gasless)...');
        
        // Wait for cooldown
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const trainData = contractInterface.encodeFunctionData('trainPet', []);
        const trainTxHash = await executeGaslessTransaction(
            sessionKey,
            FRENPET_V2_ENHANCED,
            trainData
        );
        console.log(`✅ Pet trained gaslessly! Tx: ${trainTxHash}`);
        
        console.log('\n🎉 Success! All operations completed without gas fees!');
        console.log('💡 This demonstrates true Web2-like UX on blockchain');
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error);
    }
}

// Run gasless tests
main().catch(console.error);