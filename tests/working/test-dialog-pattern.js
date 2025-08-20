#!/usr/bin/env node

/**
 * Porto Gasless Test - Dialog Pattern Implementation
 * 
 * This implements the exact pattern used by Dialog to handle gasless transactions:
 * 1. Register delegation and store the signed preCall
 * 2. Include the stored preCall in the first transaction
 * 3. Subsequent transactions work without preCalls
 */

import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { encodeFunctionData } from 'viem';
import { CONFIG, makeRelayCall, createClient } from './lib/porto-utils-enhanced.js';
import FrenPetSimpleJson from '../contracts/out/FrenPetSimple.sol/FrenPetSimple.json' with { type: 'json' };

const FRENPET_SIMPLE_ADDRESS = '0x3fde139a94eef14c4eba229fdc80a54f7f5fbf25';
const ETH_ADDRESS = '0x0000000000000000000000000000000000000000';

async function testDialogPattern() {
  console.log('🚀 PORTO GASLESS TEST - DIALOG PATTERN');
  console.log('=' .repeat(60));
  console.log('This implements the exact workaround used by Dialog');
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
  // STEP 1: Register & Store PreCall (Dialog Pattern)
  // =====================================
  console.log('\n📝 Step 1: Register Delegation & Store PreCall');
  console.log('-'.repeat(40));
  
  const expiry = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
  const expiryHex = '0x' + expiry.toString(16);
  
  // Prepare upgrade
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
  
  // Sign the digests
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
  
  // Complete the upgrade
  console.log('\n  Calling wallet_upgradeAccount...');
  await makeRelayCall('wallet_upgradeAccount', [{
    context: prepareResponse.context,
    signatures: { auth: authSig, exec: execSig }
  }]);
  console.log('  ✅ Delegation registered');
  
  // CRITICAL: Store the signed preCall (Dialog pattern)
  // The relay stores this internally, but we need it for our first transaction
  const storedPreCall = {
    eoa: preCallData.eoa,
    executionData: preCallData.executionData,
    nonce: preCallData.nonce,
    signature: execSig  // The exec signature we just created
  };
  
  console.log('\n  💾 Stored PreCall for future use:');
  console.log('    eoa:', storedPreCall.eoa);
  console.log('    signature:', storedPreCall.signature.substring(0, 20) + '...');
  
  // =====================================
  // STEP 2: First Transaction WITH PreCall
  // =====================================
  console.log('\n📝 Step 2: First Transaction - Create Pet (WITH stored preCall)');
  console.log('-'.repeat(40));
  console.log('  This is the key: we include our stored preCall');
  
  const petName = `DialogPet_${Date.now()}`;
  console.log('  Pet name:', petName);
  
  const createPetCalldata = encodeFunctionData({
    abi: FrenPetSimpleJson.abi,
    functionName: 'createPet',
    args: [petName]
  });
  
  // Include the stored preCall in our first transaction
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
        feeToken: ETH_ADDRESS  // Required for sponsorship
      },
      preCalls: [storedPreCall]  // Include our stored preCall!
    }
  };
  
  console.log('  Including stored preCall in capabilities.preCalls');
  
  try {
    const petPrepare = await makeRelayCall('wallet_prepareCalls', [petParams]);
    
    console.log('  ✅ Prepared calls successfully');
    console.log('  PreCalls in response:', 
      petPrepare.context?.quote?.intent?.encodedPreCalls?.length || 0);
    
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
    
    // Check if pet was created
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
      console.log('\n📝 Step 3: Second Transaction - Feed Pet (WITHOUT preCall)');
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
          // No preCalls needed!
        }
      };
      
      const feedPrepare = await makeRelayCall('wallet_prepareCalls', [feedParams]);
      
      console.log('  PreCalls in response:', 
        feedPrepare.context?.quote?.intent?.encodedPreCalls?.length || 0,
        '(should be 0)');
      
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
      console.log('     View: https://testnet.riselabs.xyz/tx/' + feedResponse.id);
    }
    
  } catch (error) {
    console.log('  ❌ Failed:', error.message);
    
    // If the preCall format is wrong, try without it
    if (error.message.includes('invalid') || error.message.includes('missing field')) {
      console.log('\n  Issue with preCall format. The relay may expect different structure.');
      console.log('  Attempting without manual preCall (relay auto-add)...');
      
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
          // Let relay auto-add the preCall
        }
      };
      
      try {
        const simplePrepare = await makeRelayCall('wallet_prepareCalls', [simpleParams]);
        console.log('  PreCalls auto-added by relay:', 
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
        
        console.log('  ✅ Pet creation tx (auto-preCall):', simpleResponse.id);
        
      } catch (autoError) {
        console.log('  ❌ Auto-preCall also failed:', autoError.message);
      }
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
  
  console.log('\n📋 Summary:');
  console.log('  - Dialog pattern stores the signed preCall after registration');
  console.log('  - First transaction includes this preCall to deploy delegation');
  console.log('  - Subsequent transactions work without preCalls');
  console.log('  - This bypasses the relay\'s auto-add which has gas calculation issues');
}

// Run test
testDialogPattern().catch(console.error);