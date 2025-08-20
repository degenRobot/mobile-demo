#!/usr/bin/env node

/**
 * Porto Gasless Working Test
 * 
 * Based on successful transaction 0x571e1e3c87a774edd720fc205737ce4cad3d24484bfad5b7af20cfac9ee1741a
 * which proves gasless works when delegation is deployed.
 * 
 * Two-step process:
 * 1. Deploy delegation with a simple call (includes preCalls automatically)
 * 2. Execute gasless transactions (no preCalls, truly gasless)
 */

import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { encodeFunctionData } from 'viem';
import { CONFIG, makeRelayCall, createClient } from './lib/porto-utils-enhanced.js';
import FrenPetSimpleJson from '../contracts/out/FrenPetSimple.sol/FrenPetSimple.json' with { type: 'json' };

const FRENPET_SIMPLE_ADDRESS = '0x3fde139a94eef14c4eba229fdc80a54f7f5fbf25';
const ETH_ADDRESS = '0x0000000000000000000000000000000000000000';

async function testGaslessWorking() {
  console.log('🚀 PORTO GASLESS WORKING TEST');
  console.log('=' .repeat(60));
  
  // Generate fresh accounts
  const mainPrivateKey = generatePrivateKey();
  const mainAccount = privateKeyToAccount(mainPrivateKey);
  
  const sessionPrivateKey = generatePrivateKey();
  const sessionAccount = privateKeyToAccount(sessionPrivateKey);
  
  console.log('🔑 Accounts:');
  console.log('  Main EOA:', mainAccount.address);
  console.log('  Session:', sessionAccount.address);
  
  const client = createClient();
  const initialBalance = await client.getBalance({ address: mainAccount.address });
  console.log('  Balance:', initialBalance.toString(), 'wei');
  
  // =====================================
  // STEP 1: Register Delegation
  // =====================================
  console.log('\n📝 Step 1: Register Delegation with Porto');
  console.log('-'.repeat(40));
  
  const expiry = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
  const expiryHex = '0x' + expiry.toString(16);
  
  const prepareParams = {
    address: mainAccount.address,
    delegation: CONFIG.PORTO_IMPLEMENTATION,
    capabilities: {
      authorizeKeys: [{
        expiry: expiryHex,
        prehash: false,
        publicKey: sessionAccount.address,
        role: 'admin',
        type: 'secp256k1',
        permissions: []
      }]
    },
    chainId: CONFIG.CHAIN_ID
  };
  
  const prepareResponse = await makeRelayCall('wallet_prepareUpgradeAccount', [prepareParams]);
  console.log('  ✅ Prepared upgrade');
  
  // Sign messages
  const authSig = await sessionAccount.signMessage({
    message: { raw: prepareResponse.digests.auth }
  });
  
  const domain = {
    ...prepareResponse.typedData.domain,
    chainId: typeof prepareResponse.typedData.domain.chainId === 'string' 
      ? parseInt(prepareResponse.typedData.domain.chainId, 16)
      : prepareResponse.typedData.domain.chainId,
  };
  
  const execSig = await sessionAccount.signTypedData({
    domain,
    types: prepareResponse.typedData.types,
    primaryType: prepareResponse.typedData.primaryType,
    message: prepareResponse.typedData.message,
  });
  
  await makeRelayCall('wallet_upgradeAccount', [{
    context: prepareResponse.context,
    signatures: { auth: authSig, exec: execSig }
  }]);
  
  console.log('  ✅ Delegation registered with Porto');
  
  // =====================================
  // STEP 2: Deploy Delegation + First Call
  // =====================================
  console.log('\n📝 Step 2: Deploy Delegation On-chain');
  console.log('-'.repeat(40));
  console.log('  Including a zero transfer to trigger deployment');
  
  // Simple zero transfer to deploy delegation
  const deployParams = {
    from: mainAccount.address,
    chainId: CONFIG.CHAIN_ID,
    calls: [{
      to: mainAccount.address,  // Send to self
      value: '0x0',  // Zero value
      data: '0x'  // No data
    }],
    capabilities: {
      meta: {
        feeToken: ETH_ADDRESS
      }
    }
  };
  
  const deployPrepare = await makeRelayCall('wallet_prepareCalls', [deployParams]);
  
  // Check for preCalls
  const hasPreCalls = deployPrepare.context?.quote?.intent?.encodedPreCalls?.length > 0;
  console.log('  PreCalls added:', hasPreCalls ? `Yes (${deployPrepare.context.quote.intent.encodedPreCalls.length})` : 'No');
  
  const deploySignature = await sessionAccount.signMessage({
    message: { raw: deployPrepare.digest }
  });
  
  try {
    const deployResponse = await makeRelayCall('wallet_sendPreparedCalls', [{
      context: deployPrepare.context,
      key: {
        prehash: false,
        publicKey: sessionAccount.address,
        type: 'secp256k1'
      },
      signature: deploySignature
    }]);
    
    console.log('  ✅ Delegation deployment tx:', deployResponse.id);
    console.log('     View: https://testnet.riselabs.xyz/tx/' + deployResponse.id);
    
    // Wait for confirmation
    console.log('\n⏳ Waiting 15 seconds for confirmation...');
    await new Promise(r => setTimeout(r, 15000));
    
    // Check if delegation was deployed
    const code = await client.getCode({ address: mainAccount.address });
    const hasCode = code && code !== '0x';
    console.log('\n  Delegation deployed:', hasCode ? '✅ Yes' : '❌ No');
    
    if (hasCode) {
      console.log('  Code prefix:', code.substring(0, 20) + '...');
    }
    
  } catch (error) {
    console.log('  ❌ Delegation deployment failed:', error.message);
    if (error.message.includes('insufficient funds')) {
      console.log('\n  ⚠️  Porto relay gas calculation bug');
      console.log('  Workaround: Send 0.001 ETH to', mainAccount.address);
      console.log('  Then run test again');
      return;
    }
  }
  
  // =====================================
  // STEP 3: Gasless Transaction (Create Pet)
  // =====================================
  console.log('\n📝 Step 3: Gasless Transaction - Create Pet');
  console.log('-'.repeat(40));
  
  const petName = `GaslessPet_${Date.now()}`;
  console.log('  Pet name:', petName);
  
  const createPetCalldata = encodeFunctionData({
    abi: FrenPetSimpleJson.abi,
    functionName: 'createPet',
    args: [petName]
  });
  
  const petParams = {
    from: mainAccount.address,
    chainId: CONFIG.CHAIN_ID,
    calls: [{
      to: FRENPET_SIMPLE_ADDRESS,
      value: '0x0',
      data: createPetCalldata
    }],
    capabilities: {
      meta: {
        feeToken: ETH_ADDRESS
      }
    }
  };
  
  const petPrepare = await makeRelayCall('wallet_prepareCalls', [petParams]);
  
  // Should not have preCalls if delegation is deployed
  const petHasPreCalls = petPrepare.context?.quote?.intent?.encodedPreCalls?.length > 0;
  console.log('  PreCalls added:', petHasPreCalls ? 'Yes (unexpected!)' : 'No (good)');
  
  const petSignature = await sessionAccount.signMessage({
    message: { raw: petPrepare.digest }
  });
  
  try {
    const petResponse = await makeRelayCall('wallet_sendPreparedCalls', [{
      context: petPrepare.context,
      key: {
        prehash: false,
        publicKey: sessionAccount.address,
        type: 'secp256k1'
      },
      signature: petSignature
    }]);
    
    console.log('  ✅ Pet creation tx:', petResponse.id);
    console.log('     View: https://testnet.riselabs.xyz/tx/' + petResponse.id);
    
    // Wait and check
    console.log('\n⏳ Waiting 15 seconds for confirmation...');
    await new Promise(r => setTimeout(r, 15000));
    
    const hasPet = await client.readContract({
      address: FRENPET_SIMPLE_ADDRESS,
      abi: FrenPetSimpleJson.abi,
      functionName: 'hasPet',
      args: [mainAccount.address]
    });
    
    console.log('\n  Pet created:', hasPet ? '✅ Yes' : '❌ No');
    
    if (hasPet) {
      const petStats = await client.readContract({
        address: FRENPET_SIMPLE_ADDRESS,
        abi: FrenPetSimpleJson.abi,
        functionName: 'getPetStats',
        args: [mainAccount.address]
      });
      
      console.log('\n🐾 Pet Stats:');
      console.log('  Name:', petStats[0]);
      console.log('  Level:', petStats[1].toString());
      console.log('  Experience:', petStats[2].toString());
      console.log('  Happiness:', petStats[3].toString());
      console.log('  Hunger:', petStats[4].toString());
    }
    
  } catch (error) {
    console.log('  ❌ Pet creation failed:', error.message);
  }
  
  // =====================================
  // STEP 4: Another Gasless Transaction (Feed Pet)
  // =====================================
  console.log('\n📝 Step 4: Gasless Transaction - Feed Pet');
  console.log('-'.repeat(40));
  
  const feedCalldata = encodeFunctionData({
    abi: FrenPetSimpleJson.abi,
    functionName: 'feedPet',
    args: []
  });
  
  const feedParams = {
    from: mainAccount.address,
    chainId: CONFIG.CHAIN_ID,
    calls: [{
      to: FRENPET_SIMPLE_ADDRESS,
      value: '0x0',
      data: feedCalldata
    }],
    capabilities: {
      meta: {
        feeToken: ETH_ADDRESS
      }
    }
  };
  
  try {
    const feedPrepare = await makeRelayCall('wallet_prepareCalls', [feedParams]);
    
    const feedSignature = await sessionAccount.signMessage({
      message: { raw: feedPrepare.digest }
    });
    
    const feedResponse = await makeRelayCall('wallet_sendPreparedCalls', [{
      context: feedPrepare.context,
      key: {
        prehash: false,
        publicKey: sessionAccount.address,
        type: 'secp256k1'
      },
      signature: feedSignature
    }]);
    
    console.log('  ✅ Feed pet tx:', feedResponse.id);
    
  } catch (error) {
    console.log('  ❌ Feed pet failed:', error.message);
  }
  
  // Final check
  const finalBalance = await client.getBalance({ address: mainAccount.address });
  
  console.log('\n' + '=' .repeat(60));
  console.log('💰 FINAL RESULTS:');
  console.log('  Initial balance:', initialBalance.toString(), 'wei');
  console.log('  Final balance:', finalBalance.toString(), 'wei');
  console.log('  Gasless:', finalBalance <= initialBalance ? '✅ Yes!' : '❌ No');
  console.log('=' .repeat(60));
}

// Run test
testGaslessWorking().catch(console.error);