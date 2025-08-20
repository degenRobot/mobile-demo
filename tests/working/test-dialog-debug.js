#!/usr/bin/env node

/**
 * Porto Gasless Test - Dialog Pattern Debug Version
 * 
 * Enhanced with debugging to understand the preCall handling
 */

import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { encodeFunctionData } from 'viem';
import { CONFIG, makeRelayCall, createClient } from './lib/porto-utils-enhanced.js';
import FrenPetSimpleJson from '../contracts/out/FrenPetSimple.sol/FrenPetSimple.json' with { type: 'json' };

const FRENPET_SIMPLE_ADDRESS = '0x3fde139a94eef14c4eba229fdc80a54f7f5fbf25';
const ETH_ADDRESS = '0x0000000000000000000000000000000000000000';

async function testDialogDebug() {
  console.log('🚀 PORTO GASLESS TEST - DIALOG PATTERN (DEBUG)');
  console.log('=' .repeat(60));
  
  // Generate fresh accounts
  const mainPrivateKey = generatePrivateKey();
  const mainAccount = privateKeyToAccount(mainPrivateKey);
  
  const sessionPrivateKey = generatePrivateKey();
  const sessionAccount = privateKeyToAccount(sessionPrivateKey);
  
  console.log('\n🔑 Accounts:');
  console.log('  Main EOA:', mainAccount.address);
  console.log('  Session:', sessionAccount.address);
  
  const client = createClient();
  const initialBalance = await client.getBalance({ address: mainAccount.address });
  console.log('  Balance:', initialBalance.toString(), 'wei');
  
  // =====================================
  // STEP 1: Register Delegation
  // =====================================
  console.log('\n📝 Step 1: Register Delegation');
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
  
  const preCallData = prepareResponse.context.preCall;
  console.log('\n  📦 PreCall structure:');
  console.log('    eoa:', preCallData.eoa);
  console.log('    nonce:', preCallData.nonce);
  console.log('    executionData:', preCallData.executionData?.substring(0, 50) + '...');
  
  // Sign
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
  console.log('  ✅ Delegation registered');
  
  // Store the signed preCall
  const storedPreCall = {
    eoa: preCallData.eoa,
    executionData: preCallData.executionData,
    nonce: preCallData.nonce,
    signature: execSig
  };
  
  // =====================================
  // STEP 2: Test Different Approaches
  // =====================================
  
  // Test 1: Without any preCalls (let relay auto-add)
  console.log('\n📝 Test 1: WITHOUT manual preCalls (relay auto-adds)');
  console.log('-'.repeat(40));
  
  const petName1 = `Test1_${Date.now()}`;
  const createPetCalldata1 = encodeFunctionData({
    abi: FrenPetSimpleJson.abi,
    functionName: 'createPet',
    args: [petName1]
  });
  
  try {
    const params1 = {
      from: mainAccount.address,
      chainId: CONFIG.CHAIN_ID,
      calls: [{
        to: FRENPET_SIMPLE_ADDRESS,
        value: '0x0',
        data: createPetCalldata1
      }],
      capabilities: {
        meta: {
          feeToken: ETH_ADDRESS
        }
        // No preCalls - relay auto-adds
      }
    };
    
    const prepare1 = await makeRelayCall('wallet_prepareCalls', [params1]);
    console.log('  PreCalls added by relay:', 
      prepare1.context?.quote?.intent?.encodedPreCalls?.length || 0);
    
    // Check what's in the preCalls
    if (prepare1.context?.quote?.intent?.encodedPreCalls) {
      console.log('  PreCall sizes:', 
        prepare1.context.quote.intent.encodedPreCalls.map(pc => pc.length));
    }
    
    const signature1 = await sessionAccount.signMessage({
      message: { raw: prepare1.digest }
    });
    
    const response1 = await makeRelayCall('wallet_sendPreparedCalls', [{
      context: prepare1.context,
      key: {
        prehash: false,
        publicKey: sessionAccount.address,
        type: 'secp256k1'
      },
      signature: signature1
    }]);
    
    console.log('  ✅ TX (auto-preCall):', response1.id);
    
  } catch (error) {
    console.log('  ❌ Failed:', error.message);
  }
  
  // Wait a bit
  await new Promise(r => setTimeout(r, 3000));
  
  // Test 2: With manual preCall
  console.log('\n📝 Test 2: WITH manual preCall (Dialog pattern)');
  console.log('-'.repeat(40));
  
  const petName2 = `Test2_${Date.now()}`;
  const createPetCalldata2 = encodeFunctionData({
    abi: FrenPetSimpleJson.abi,
    functionName: 'createPet',
    args: [petName2]
  });
  
  try {
    const params2 = {
      from: mainAccount.address,
      chainId: CONFIG.CHAIN_ID,
      calls: [{
        to: FRENPET_SIMPLE_ADDRESS,
        value: '0x0',
        data: createPetCalldata2
      }],
      capabilities: {
        meta: {
          feeToken: ETH_ADDRESS
        },
        preCalls: [storedPreCall]  // Include our stored preCall
      }
    };
    
    const prepare2 = await makeRelayCall('wallet_prepareCalls', [params2]);
    console.log('  PreCalls in response:', 
      prepare2.context?.quote?.intent?.encodedPreCalls?.length || 0);
    
    // Check what's in the preCalls
    if (prepare2.context?.quote?.intent?.encodedPreCalls) {
      console.log('  PreCall sizes:', 
        prepare2.context.quote.intent.encodedPreCalls.map(pc => pc.length));
    }
    
    const signature2 = await sessionAccount.signMessage({
      message: { raw: prepare2.digest }
    });
    
    const response2 = await makeRelayCall('wallet_sendPreparedCalls', [{
      context: prepare2.context,
      key: {
        prehash: false,
        publicKey: sessionAccount.address,
        type: 'secp256k1'
      },
      signature: signature2
    }]);
    
    console.log('  ✅ TX (manual preCall):', response2.id);
    
  } catch (error) {
    console.log('  ❌ Failed:', error.message);
  }
  
  // Wait a bit
  await new Promise(r => setTimeout(r, 3000));
  
  // Test 3: Explicitly disable preCalls
  console.log('\n📝 Test 3: Explicitly disable preCalls');
  console.log('-'.repeat(40));
  
  try {
    const params3 = {
      from: mainAccount.address,
      chainId: CONFIG.CHAIN_ID,
      calls: [{
        to: FRENPET_SIMPLE_ADDRESS,
        value: '0x0',
        data: createPetCalldata2
      }],
      capabilities: {
        meta: {
          feeToken: ETH_ADDRESS
        },
        preCall: false  // Explicitly disable
      }
    };
    
    const prepare3 = await makeRelayCall('wallet_prepareCalls', [params3]);
    console.log('  PreCalls in response:', 
      prepare3.context?.quote?.intent?.encodedPreCalls?.length || 0);
    
    const signature3 = await sessionAccount.signMessage({
      message: { raw: prepare3.digest }
    });
    
    const response3 = await makeRelayCall('wallet_sendPreparedCalls', [{
      context: prepare3.context,
      key: {
        prehash: false,
        publicKey: sessionAccount.address,
        type: 'secp256k1'
      },
      signature: signature3
    }]);
    
    console.log('  ✅ TX (no preCalls):', response3.id);
    
  } catch (error) {
    console.log('  ❌ Failed:', error.message);
  }
  
  // Wait for all transactions
  console.log('\n⏳ Waiting 15 seconds for confirmations...');
  await new Promise(r => setTimeout(r, 15000));
  
  // Final checks
  const finalBalance = await client.getBalance({ address: mainAccount.address });
  const hasPet = await client.readContract({
    address: FRENPET_SIMPLE_ADDRESS,
    abi: FrenPetSimpleJson.abi,
    functionName: 'hasPet',
    args: [mainAccount.address]
  });
  const code = await client.getCode({ address: mainAccount.address });
  const hasCode = code && code !== '0x';
  
  console.log('\n' + '=' .repeat(60));
  console.log('💰 FINAL RESULTS:');
  console.log('  Initial balance:', initialBalance.toString(), 'wei');
  console.log('  Final balance:', finalBalance.toString(), 'wei');
  console.log('  Pet created:', hasPet ? '✅ Yes' : '❌ No');
  console.log('  Delegation deployed:', hasCode ? '✅ Yes' : '❌ No');
  console.log('  Gasless:', finalBalance <= initialBalance ? '✅ Yes!' : '❌ No');
  console.log('=' .repeat(60));
}

// Run test
testDialogDebug().catch(console.error);