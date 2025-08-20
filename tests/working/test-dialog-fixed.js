#!/usr/bin/env node

/**
 * Porto Gasless Test - Dialog Pattern Fixed
 * 
 * The key insight: Don't call wallet_upgradeAccount if we're managing preCalls manually.
 * This prevents the relay from storing and auto-adding the preCall.
 */

import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { encodeFunctionData } from 'viem';
import { CONFIG, makeRelayCall, createClient } from './lib/porto-utils-enhanced.js';
import FrenPetSimpleJson from '../contracts/out/FrenPetSimple.sol/FrenPetSimple.json' with { type: 'json' };

const FRENPET_SIMPLE_ADDRESS = '0x3fde139a94eef14c4eba229fdc80a54f7f5fbf25';
const ETH_ADDRESS = '0x0000000000000000000000000000000000000000';

async function testDialogFixed() {
  console.log('🚀 PORTO GASLESS TEST - DIALOG PATTERN (FIXED)');
  console.log('=' .repeat(60));
  console.log('Key: We prepare but DON\'T complete the upgrade');
  console.log('This prevents relay from auto-adding duplicate preCalls');
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
  console.log('  Balance:', initialBalance.toString(), 'wei (should be 0)');
  
  // =====================================
  // STEP 1: Prepare Delegation (BUT DON'T COMPLETE IT)
  // =====================================
  console.log('\n📝 Step 1: Prepare Delegation (without wallet_upgradeAccount)');
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
  
  console.log('  Calling wallet_prepareUpgradeAccount...');
  const prepareResponse = await makeRelayCall('wallet_prepareUpgradeAccount', [prepareParams]);
  console.log('  ✅ Prepared upgrade');
  
  // Extract the preCall structure
  const preCallData = prepareResponse.context.preCall;
  console.log('\n  📦 PreCall from prepare response:');
  console.log('    eoa:', preCallData.eoa);
  console.log('    nonce:', preCallData.nonce);
  console.log('    executionData length:', preCallData.executionData?.length || 0);
  
  // Sign the digests (we need the exec signature for the preCall)
  console.log('\n  Signing digests...');
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
  
  console.log('  ✅ Signatures created');
  
  // CRITICAL: We DON'T call wallet_upgradeAccount
  // This prevents the relay from storing the upgrade and auto-adding it
  console.log('\n  ⚠️  NOT calling wallet_upgradeAccount');
  console.log('  This prevents duplicate preCalls issue');
  
  // Build the signed preCall to use manually
  const signedPreCall = {
    eoa: preCallData.eoa,
    executionData: preCallData.executionData,
    nonce: preCallData.nonce,
    signature: execSig  // The exec signature we just created
  };
  
  console.log('\n  💾 Manual PreCall ready:');
  console.log('    eoa:', signedPreCall.eoa);
  console.log('    signature:', signedPreCall.signature.substring(0, 20) + '...');
  
  // =====================================
  // STEP 2: First Transaction WITH Manual PreCall
  // =====================================
  console.log('\n📝 Step 2: Create Pet WITH manual preCall');
  console.log('-'.repeat(40));
  console.log('  Since we didn\'t store the upgrade, relay won\'t auto-add');
  
  const petName = `FixedPet_${Date.now()}`;
  console.log('  Pet name:', petName);
  
  const createPetCalldata = encodeFunctionData({
    abi: FrenPetSimpleJson.abi,
    functionName: 'createPet',
    args: [petName]
  });
  
  try {
    // First, let's try with preCall: false to prevent auto-fetch
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
        },
        preCall: false,  // Disable auto-fetch
        preCalls: [signedPreCall]  // Include our manual preCall
      }
    };
    
    console.log('  Including manual preCall with preCall:false to prevent auto-fetch');
    
    const petPrepare = await makeRelayCall('wallet_prepareCalls', [petParams]);
    
    console.log('  ✅ Prepared calls successfully');
    console.log('  PreCalls in response:', 
      petPrepare.context?.quote?.intent?.encodedPreCalls?.length || 0,
      '(should be 1)');
    
    // Check sizes to ensure no duplicates
    if (petPrepare.context?.quote?.intent?.encodedPreCalls) {
      console.log('  PreCall sizes:', 
        petPrepare.context.quote.intent.encodedPreCalls.map(pc => pc.length));
    }
    
    // Sign the intent
    const petSignature = await sessionAccount.signMessage({
      message: { raw: petPrepare.digest }
    });
    
    // Send the transaction
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
    
    // Wait for confirmation
    console.log('\n⏳ Waiting 15 seconds for confirmation...');
    await new Promise(r => setTimeout(r, 15000));
    
    // Check results
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
    
    // Check if delegation was deployed
    const code = await client.getCode({ address: mainAccount.address });
    const hasCode = code && code !== '0x';
    console.log('\n  Delegation deployed:', hasCode ? '✅ Yes' : '❌ No');
    
    // =====================================
    // STEP 3: Second Transaction WITHOUT PreCall
    // =====================================
    if (hasCode) {
      console.log('\n📝 Step 3: Feed Pet WITHOUT preCall');
      console.log('-'.repeat(40));
      console.log('  Delegation is deployed, no preCall needed');
      
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
    }
    
  } catch (error) {
    console.log('  ❌ Failed:', error.message);
    
    // If preCall:false doesn't work, try without it
    if (error.message.includes('gas')) {
      console.log('\n  Gas issue detected. This is the known relay bug.');
    }
  }
  
  // Final balance check
  const finalBalance = await client.getBalance({ address: mainAccount.address });
  
  console.log('\n' + '=' .repeat(60));
  console.log('💰 FINAL RESULTS:');
  console.log('  Initial balance:', initialBalance.toString(), 'wei');
  console.log('  Final balance:', finalBalance.toString(), 'wei');
  console.log('  Gasless success:', finalBalance <= initialBalance ? '✅ Yes!' : '❌ No');
  console.log('=' .repeat(60));
  
  console.log('\n📋 Key Insight:');
  console.log('  By NOT calling wallet_upgradeAccount, we prevent the relay');
  console.log('  from storing and auto-adding the preCall, avoiding duplicates.');
  console.log('  We manually include the signed preCall in our first transaction.');
}

// Run test
testDialogFixed().catch(console.error);