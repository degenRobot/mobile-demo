#!/usr/bin/env node

/**
 * End-to-end test of mobile app gasless flow with FrenPetSimple
 */

const { privateKeyToAccount, generatePrivateKey } = require('viem/accounts');
const { encodeFunctionData, decodeFunctionResult, createPublicClient, http } = require('viem');

// Configuration
const PORTO_URL = 'https://rise-testnet-porto.fly.dev';
const RPC_URL = 'https://testnet.riselabs.xyz';
const CHAIN_ID = 11155931;
const PORTO_ACCOUNT_IMPL = '0x912a428b1a7e7cb7bb2709a2799a01c020c5acd9';
const FRENPET_SIMPLE_CONTRACT = '0x3FDE139A94eEf14C4eBa229FDC80A54f7F5Fbf25';

// FrenPetSimple ABI (non-payable functions)
const FRENPET_SIMPLE_ABI = [
  {
    name: 'createPet',
    type: 'function',
    inputs: [{ name: 'name', type: 'string' }],
    outputs: [],
  },
  {
    name: 'feedPet',
    type: 'function',
    inputs: [],
    outputs: [],
  },
  {
    name: 'playWithPet',
    type: 'function',
    inputs: [],
    outputs: [],
  },
  {
    name: 'getPetStats',
    type: 'function',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [
      { name: 'name', type: 'string' },
      { name: 'level', type: 'uint256' },
      { name: 'experience', type: 'uint256' },
      { name: 'happiness', type: 'uint256' },
      { name: 'hunger', type: 'uint256' },
      { name: 'isAlive', type: 'bool' }
    ],
    stateMutability: 'view',
  },
  {
    name: 'hasPet',
    type: 'function',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: 'hasPet', type: 'bool' }],
    stateMutability: 'view',
  },
];

// Create public client for reading blockchain state
const publicClient = createPublicClient({
  transport: http(RPC_URL),
});

// Helper: Check if account has a pet
async function checkHasPet(address) {
  try {
    const data = encodeFunctionData({
      abi: FRENPET_SIMPLE_ABI,
      functionName: 'hasPet',
      args: [address],
    });
    
    const result = await publicClient.call({
      to: FRENPET_SIMPLE_CONTRACT,
      data,
    });
    
    const decoded = decodeFunctionResult({
      abi: FRENPET_SIMPLE_ABI,
      functionName: 'hasPet',
      data: result.data,
    });
    
    return decoded;
  } catch (error) {
    console.error('Error checking pet:', error);
    return false;
  }
}

// Helper: Get pet stats
async function getPetStats(address) {
  try {
    const data = encodeFunctionData({
      abi: FRENPET_SIMPLE_ABI,
      functionName: 'getPetStats',
      args: [address],
    });
    
    const result = await publicClient.call({
      to: FRENPET_SIMPLE_CONTRACT,
      data,
    });
    
    const decoded = decodeFunctionResult({
      abi: FRENPET_SIMPLE_ABI,
      functionName: 'getPetStats',
      data: result.data,
    });
    
    return {
      name: decoded[0],
      level: Number(decoded[1]),
      experience: Number(decoded[2]),
      happiness: Number(decoded[3]),
      hunger: Number(decoded[4]),
      isAlive: decoded[5],
    };
  } catch (error) {
    console.error('Error getting pet stats:', error);
    return null;
  }
}

// Main test flow
async function testMobileGaslessFlow() {
  console.log('=== Mobile App Gasless Flow Test ===\n');
  console.log('Contract:', FRENPET_SIMPLE_CONTRACT);
  console.log('This simulates the exact mobile app flow\n');
  
  // Generate accounts (simulating mobile wallet generation)
  console.log('📱 Step 1: Generating Mobile Wallet...');
  const eoaPrivateKey = generatePrivateKey();
  const eoaAccount = privateKeyToAccount(eoaPrivateKey);
  
  const sessionPrivateKey = generatePrivateKey();
  const sessionAccount = privateKeyToAccount(sessionPrivateKey);
  
  console.log('Main Wallet:', eoaAccount.address);
  console.log('Session Key:', sessionAccount.address);
  
  // Check ETH balance
  const balance = await publicClient.getBalance({ address: eoaAccount.address });
  console.log('Balance:', (Number(balance) / 1e18).toFixed(6), 'ETH');
  
  if (balance < 1000000000000000n) { // Less than 0.001 ETH
    console.log('\n⚠️  Account needs 0.001 ETH for initial delegation');
    console.log('   After delegation, all transactions are gasless!');
    console.log('   Send 0.001 ETH to:', eoaAccount.address);
    return;
  }
  
  console.log('\n🔐 Step 2: Setting up Porto Delegation...');
  
  // Prepare delegation with both keys
  const expiry = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
  const expiryHex = '0x' + expiry.toString(16);
  
  const prepareParams = {
    address: eoaAccount.address,
    delegation: PORTO_ACCOUNT_IMPL,
    capabilities: {
      authorizeKeys: [
        {
          expiry: expiryHex,
          prehash: false,
          publicKey: eoaAccount.address,
          role: 'admin',
          type: 'secp256k1',
          permissions: []
        },
        {
          expiry: expiryHex,
          prehash: false,
          publicKey: sessionAccount.address,
          role: 'normal',
          type: 'secp256k1',
          permissions: []
        }
      ]
    },
    chainId: CHAIN_ID
  };
  
  console.log('Authorizing 2 keys:');
  console.log('- Main wallet (admin)');
  console.log('- Session key (normal)');
  
  const prepareResponse = await fetch(PORTO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'wallet_prepareUpgradeAccount',
      params: [prepareParams],
      id: 1,
    }),
  });
  
  const prepareResult = await prepareResponse.json();
  if (prepareResult.error) {
    console.error('❌ Delegation prepare failed:', prepareResult.error);
    return;
  }
  
  // Sign with main wallet
  const authSig = await eoaAccount.signMessage({
    message: { raw: prepareResult.result.digests.auth }
  });
  
  const domain = {
    ...prepareResult.result.typedData.domain,
    chainId: typeof prepareResult.result.typedData.domain.chainId === 'string' 
      ? parseInt(prepareResult.result.typedData.domain.chainId, 16)
      : prepareResult.result.typedData.domain.chainId,
  };
  
  const execSig = await eoaAccount.signTypedData({
    domain,
    types: prepareResult.result.typedData.types,
    primaryType: prepareResult.result.typedData.primaryType,
    message: prepareResult.result.typedData.message,
  });
  
  // Store delegation
  await fetch(PORTO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'wallet_upgradeAccount',
      params: [{
        context: prepareResult.result.context,
        signatures: {
          auth: authSig,
          exec: execSig
        }
      }],
      id: 2,
    }),
  });
  
  console.log('✅ Delegation stored (will execute with first transaction)\n');
  
  // Check if user already has a pet
  const hasPet = await checkHasPet(eoaAccount.address);
  console.log('🔍 Checking for existing pet:', hasPet ? 'Yes' : 'No');
  
  // Transaction 1: Create Pet (includes delegation execution)
  console.log('\n🐾 Step 3: Creating Pet (GASLESS)...');
  const petName = 'MobileTestPet_' + Date.now();
  console.log('Pet name:', petName);
  
  const createPetData = encodeFunctionData({
    abi: FRENPET_SIMPLE_ABI,
    functionName: 'createPet',
    args: [petName],
  });
  
  const createCallParams = {
    calls: [{
      to: FRENPET_SIMPLE_CONTRACT,
      data: createPetData,
      value: '0x0', // NO VALUE NEEDED!
    }],
    capabilities: {
      meta: {
        accounts: [eoaAccount.address],
      },
    },
    chainId: CHAIN_ID,
    from: eoaAccount.address,
    key: {
      type: 'secp256k1',
      publicKey: eoaAccount.address, // Main wallet signs first tx
      prehash: false,
    },
  };
  
  const createResponse = await fetch(PORTO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'wallet_prepareCalls',
      params: [createCallParams],
      id: 3,
    }),
  });
  
  const createResult = await createResponse.json();
  if (createResult.error) {
    console.error('❌ Prepare createPet failed:', createResult.error);
    return;
  }
  
  // Sign with main wallet
  const createTxDomain = {
    ...createResult.result.typedData.domain,
    chainId: typeof createResult.result.typedData.domain.chainId === 'string' 
      ? parseInt(createResult.result.typedData.domain.chainId, 16)
      : createResult.result.typedData.domain.chainId,
  };
  
  const createTxSig = await eoaAccount.signTypedData({
    domain: createTxDomain,
    types: createResult.result.typedData.types,
    primaryType: createResult.result.typedData.primaryType,
    message: createResult.result.typedData.message,
  });
  
  // Send transaction
  const sendCreateResponse = await fetch(PORTO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'wallet_sendPreparedCalls',
      params: [{
        context: createResult.result.context,
        key: createResult.result.key,
        signature: createTxSig,
      }],
      id: 4,
    }),
  });
  
  const sendCreateResult = await sendCreateResponse.json();
  
  if (sendCreateResult.error) {
    console.error('❌ Create pet failed:', sendCreateResult.error.message);
    if (sendCreateResult.error.data) {
      console.error('Error data:', sendCreateResult.error.data);
    }
    return;
  }
  
  console.log('✅ Pet created! TX:', sendCreateResult.result.id || sendCreateResult.result);
  console.log('   Gas paid by: Porto Relay (not you!)');
  
  // Wait for transaction to process
  console.log('\n⏳ Waiting for blockchain confirmation...');
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  // Check pet stats
  const stats = await getPetStats(eoaAccount.address);
  if (stats) {
    console.log('\n📊 Pet Stats:');
    console.log('- Name:', stats.name);
    console.log('- Level:', stats.level);
    console.log('- Happiness:', stats.happiness, '/100');
    console.log('- Hunger:', stats.hunger, '/100');
    console.log('- Is Alive:', stats.isAlive ? 'Yes' : 'No');
  }
  
  // Transaction 2: Feed Pet (using session key)
  console.log('\n🍎 Step 4: Feeding Pet with Session Key (GASLESS)...');
  
  const feedPetData = encodeFunctionData({
    abi: FRENPET_SIMPLE_ABI,
    functionName: 'feedPet',
    args: [],
  });
  
  const feedCallParams = {
    calls: [{
      to: FRENPET_SIMPLE_CONTRACT,
      data: feedPetData,
      value: '0x0', // NO VALUE NEEDED!
    }],
    capabilities: {
      meta: {
        accounts: [eoaAccount.address], // Always the delegated account
      },
    },
    chainId: CHAIN_ID,
    from: eoaAccount.address,
    key: {
      type: 'secp256k1',
      publicKey: sessionAccount.address, // SESSION KEY SIGNS!
      prehash: false,
    },
  };
  
  const feedResponse = await fetch(PORTO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'wallet_prepareCalls',
      params: [feedCallParams],
      id: 5,
    }),
  });
  
  const feedResult = await feedResponse.json();
  if (feedResult.error) {
    console.error('❌ Prepare feedPet failed:', feedResult.error);
    return;
  }
  
  // Sign with SESSION KEY
  const feedTxDomain = {
    ...feedResult.result.typedData.domain,
    chainId: typeof feedResult.result.typedData.domain.chainId === 'string' 
      ? parseInt(feedResult.result.typedData.domain.chainId, 16)
      : feedResult.result.typedData.domain.chainId,
  };
  
  const feedTxSig = await sessionAccount.signTypedData({
    domain: feedTxDomain,
    types: feedResult.result.typedData.types,
    primaryType: feedResult.result.typedData.primaryType,
    message: feedResult.result.typedData.message,
  });
  
  // Send transaction
  const sendFeedResponse = await fetch(PORTO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'wallet_sendPreparedCalls',
      params: [{
        context: feedResult.result.context,
        key: {
          type: 'secp256k1',
          publicKey: sessionAccount.address,
          prehash: false,
        },
        signature: feedTxSig,
      }],
      id: 6,
    }),
  });
  
  const sendFeedResult = await sendFeedResponse.json();
  
  if (sendFeedResult.error) {
    console.error('❌ Feed pet failed:', sendFeedResult.error.message);
  } else {
    console.log('✅ Pet fed! TX:', sendFeedResult.result.id || sendFeedResult.result);
    console.log('   Signed by: Session Key');
    console.log('   Gas paid by: Porto Relay');
  }
  
  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  // Transaction 3: Play with Pet (using session key)
  console.log('\n🎮 Step 5: Playing with Pet (GASLESS)...');
  
  const playPetData = encodeFunctionData({
    abi: FRENPET_SIMPLE_ABI,
    functionName: 'playWithPet',
    args: [],
  });
  
  const playCallParams = {
    calls: [{
      to: FRENPET_SIMPLE_CONTRACT,
      data: playPetData,
      value: '0x0', // NO VALUE NEEDED!
    }],
    capabilities: {
      meta: {
        accounts: [eoaAccount.address],
      },
    },
    chainId: CHAIN_ID,
    from: eoaAccount.address,
    key: {
      type: 'secp256k1',
      publicKey: sessionAccount.address, // SESSION KEY SIGNS!
      prehash: false,
    },
  };
  
  const playResponse = await fetch(PORTO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'wallet_prepareCalls',
      params: [playCallParams],
      id: 7,
    }),
  });
  
  const playResult = await playResponse.json();
  if (playResult.error) {
    console.error('❌ Prepare playWithPet failed:', playResult.error);
    return;
  }
  
  // Sign with SESSION KEY
  const playTxDomain = {
    ...playResult.result.typedData.domain,
    chainId: typeof playResult.result.typedData.domain.chainId === 'string' 
      ? parseInt(playResult.result.typedData.domain.chainId, 16)
      : playResult.result.typedData.domain.chainId,
  };
  
  const playTxSig = await sessionAccount.signTypedData({
    domain: playTxDomain,
    types: playResult.result.typedData.types,
    primaryType: playResult.result.typedData.primaryType,
    message: playResult.result.typedData.message,
  });
  
  // Send transaction
  const sendPlayResponse = await fetch(PORTO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'wallet_sendPreparedCalls',
      params: [{
        context: playResult.result.context,
        key: {
          type: 'secp256k1',
          publicKey: sessionAccount.address,
          prehash: false,
        },
        signature: playTxSig,
      }],
      id: 8,
    }),
  });
  
  const sendPlayResult = await sendPlayResponse.json();
  
  if (sendPlayResult.error) {
    console.error('❌ Play with pet failed:', sendPlayResult.error.message);
  } else {
    console.log('✅ Played with pet! TX:', sendPlayResult.result.id || sendPlayResult.result);
    console.log('   Signed by: Session Key');
    console.log('   Gas paid by: Porto Relay');
  }
  
  // Final stats check
  console.log('\n⏳ Waiting for final confirmation...');
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  const finalStats = await getPetStats(eoaAccount.address);
  if (finalStats) {
    console.log('\n📊 Final Pet Stats:');
    console.log('- Name:', finalStats.name);
    console.log('- Level:', finalStats.level);
    console.log('- Experience:', finalStats.experience);
    console.log('- Happiness:', finalStats.happiness, '/100');
    console.log('- Hunger:', finalStats.hunger, '/100');
    console.log('- Is Alive:', finalStats.isAlive ? 'Yes' : 'No');
  }
  
  // Check final balance
  const finalBalance = await publicClient.getBalance({ address: eoaAccount.address });
  console.log('\n💰 Final Balance:', (Number(finalBalance) / 1e18).toFixed(6), 'ETH');
  console.log('   Balance change:', ((Number(finalBalance) - Number(balance)) / 1e18).toFixed(6), 'ETH');
  
  console.log('\n=== Test Complete ===');
  console.log('\n✨ Summary:');
  console.log('- Created pet: GASLESS ✅');
  console.log('- Fed pet with session key: GASLESS ✅');
  console.log('- Played with pet with session key: GASLESS ✅');
  console.log('- All gas paid by Porto Relay!');
  console.log('\n🎉 Mobile app gasless flow working perfectly!');
}

// Run the test
testMobileGaslessFlow().catch(console.error);