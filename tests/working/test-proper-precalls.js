#!/usr/bin/env node

/**
 * Porto Gasless Test - Proper PreCalls Format
 * 
 * Uses the correct PreCall structure expected by the relay:
 * - eoa: Address
 * - execution_data: String (hex encoded calls)
 * - nonce: U256
 * - signature: String
 */

import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { encodeFunctionData } from 'viem';
import { CONFIG, makeRelayCall, createClient } from './lib/porto-utils-enhanced.js';
import FrenPetSimpleJson from '../contracts/out/FrenPetSimple.sol/FrenPetSimple.json' with { type: 'json' };

const FRENPET_SIMPLE_ADDRESS = '0x3fde139a94eef14c4eba229fdc80a54f7f5fbf25';
const ETH_ADDRESS = '0x0000000000000000000000000000000000000000';

async function testProperPreCalls() {
  console.log('🚀 PORTO GASLESS TEST - PROPER PRECALLS FORMAT');
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
  console.log('  Balance:', initialBalance.toString(), 'wei (should be 0)');
  
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
  
  const upgradeResponse = await makeRelayCall('wallet_upgradeAccount', [{
    context: prepareResponse.context,
    signatures: { auth: authSig, exec: execSig }
  }]);
  
  console.log('  ✅ Delegation registered with Porto');
  console.log('  Stored preCall available:', upgradeResponse.context?.preCall ? 'Yes' : 'No');
  
  // Extract the preCall from the upgrade response
  const storedPreCall = upgradeResponse.context?.preCall;
  if (storedPreCall) {
    console.log('\n  📦 Stored PreCall Structure:');
    console.log('    eoa:', storedPreCall.eoa);
    console.log('    nonce:', storedPreCall.nonce);
    console.log('    execution_data length:', storedPreCall.executionData?.length || 0);
    console.log('    signature:', storedPreCall.signature);
  }
  
  // =====================================
  // STEP 2: Create Pet with Proper PreCall
  // =====================================
  console.log('\n📝 Step 2: Create Pet (with proper preCall if available)');
  console.log('-'.repeat(40));
  
  const petName = `ProperPet_${Date.now()}`;
  console.log('  Pet name:', petName);
  
  const createPetCalldata = encodeFunctionData({
    abi: FrenPetSimpleJson.abi,
    functionName: 'createPet',
    args: [petName]
  });
  
  // Build params with or without preCalls based on what we have
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
  
  // If we have a stored preCall, include it in the proper format
  if (storedPreCall) {
    petParams.capabilities.preCalls = [{
      eoa: storedPreCall.eoa,
      executionData: storedPreCall.executionData,
      nonce: storedPreCall.nonce,
      signature: storedPreCall.signature
    }];
    console.log('  Including stored preCall in transaction');
  }
  
  try {
    const petPrepare = await makeRelayCall('wallet_prepareCalls', [petParams]);
    
    console.log('  PreCalls in response:', 
      petPrepare.context?.quote?.intent?.encodedPreCalls?.length || 0);
    
    const petSignature = await sessionAccount.signMessage({
      message: { raw: petPrepare.digest }
    });
    
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
    
    // Wait and verify
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
    console.log('  ❌ Failed:', error.message);
    
    // Try without preCalls (let relay auto-add them)
    console.log('\n  Trying without manual preCalls (relay auto-adds)...');
    
    const simpleParams = {
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
    
    try {
      const simplePrepare = await makeRelayCall('wallet_prepareCalls', [simpleParams]);
      
      console.log('  PreCalls auto-added:', 
        simplePrepare.context?.quote?.intent?.encodedPreCalls?.length || 0);
      
      const simpleSignature = await sessionAccount.signMessage({
        message: { raw: simplePrepare.digest }
      });
      
      const simpleResponse = await makeRelayCall('wallet_sendPreparedCalls', [{
        context: simplePrepare.context,
        key: {
          prehash: false,
          publicKey: sessionAccount.address,
          type: 'secp256k1'
        },
        signature: simpleSignature
      }]);
      
      console.log('  ✅ Pet creation tx (auto preCalls):', simpleResponse.id);
      
    } catch (simpleError) {
      console.log('  ❌ Auto-preCalls also failed:', simpleError.message);
    }
  }
  
  // Final balance check
  const finalBalance = await client.getBalance({ address: mainAccount.address });
  
  console.log('\n' + '=' .repeat(60));
  console.log('💰 FINAL RESULTS:');
  console.log('  Initial balance:', initialBalance.toString(), 'wei');
  console.log('  Final balance:', finalBalance.toString(), 'wei');
  console.log('  Gasless:', finalBalance <= initialBalance ? '✅ Yes!' : '❌ No');
  
  // Check if delegation was deployed
  const code = await client.getCode({ address: mainAccount.address });
  const hasCode = code && code !== '0x';
  console.log('  Delegation deployed:', hasCode ? '✅ Yes' : '❌ No');
  console.log('=' .repeat(60));
}

// Run test
testProperPreCalls().catch(console.error);