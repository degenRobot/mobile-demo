#!/usr/bin/env node

/**
 * Porto Gasless Test - PreCalls Pattern
 * 
 * Implements the same pattern used by Dialog to bypass the relay's gas calculation bug.
 * Instead of letting the relay auto-add delegation deployment, we:
 * 1. Prepare the delegation deployment separately  
 * 2. Sign it and store as a preCall
 * 3. Include the signed preCall in subsequent transactions
 */

import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { encodeFunctionData } from 'viem';
import { CONFIG, makeRelayCall, createClient } from './lib/porto-utils-enhanced.js';
import FrenPetSimpleJson from '../contracts/out/FrenPetSimple.sol/FrenPetSimple.json' with { type: 'json' };

const FRENPET_SIMPLE_ADDRESS = '0x3fde139a94eef14c4eba229fdc80a54f7f5fbf25';
const ETH_ADDRESS = '0x0000000000000000000000000000000000000000';

async function testPreCallsPattern() {
  console.log('🚀 PORTO GASLESS TEST - PRECALLS PATTERN');
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
  
  await makeRelayCall('wallet_upgradeAccount', [{
    context: prepareResponse.context,
    signatures: { auth: authSig, exec: execSig }
  }]);
  
  console.log('  ✅ Delegation registered with Porto');
  
  // =====================================
  // STEP 2: Prepare Delegation Deployment as PreCall
  // =====================================
  console.log('\n📝 Step 2: Prepare Delegation Deployment as Signed PreCall');
  console.log('-'.repeat(40));
  console.log('  This is the key difference - we prepare and sign the delegation');
  console.log('  deployment separately, then include it as a preCall');
  
  // Prepare a dummy call to trigger delegation deployment
  const deployParams = {
    from: mainAccount.address,
    chainId: CONFIG.CHAIN_ID,
    calls: [{
      to: mainAccount.address,  // Self-transfer
      value: '0x0',
      data: '0x'
    }],
    capabilities: {
      meta: {
        feeToken: ETH_ADDRESS
      },
      preCall: false  // Don't auto-add preCalls
    }
  };
  
  const deployPrepare = await makeRelayCall('wallet_prepareCalls', [deployParams]);
  
  // Sign the deployment preparation
  const deploySignature = await sessionAccount.signMessage({
    message: { raw: deployPrepare.digest }
  });
  
  // Store this as our signed preCall
  const signedPreCall = {
    context: deployPrepare.context,
    signature: deploySignature
  };
  
  console.log('  ✅ Delegation deployment prepared and signed');
  console.log('  PreCall context quote:', deployPrepare.context.quote ? 'Present' : 'Missing');
  
  // =====================================
  // STEP 3: Execute Pet Creation with Signed PreCall
  // =====================================
  console.log('\n📝 Step 3: Create Pet with Delegation Deployment as PreCall');
  console.log('-'.repeat(40));
  
  const petName = `PreCallPet_${Date.now()}`;
  console.log('  Pet name:', petName);
  
  const createPetCalldata = encodeFunctionData({
    abi: FrenPetSimpleJson.abi,
    functionName: 'createPet',
    args: [petName]
  });
  
  // Include the signed preCall in our pet creation
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
      preCalls: [signedPreCall]  // Include our signed delegation deployment
    }
  };
  
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
    
    // If this fails, it might be because the relay doesn't accept
    // preCalls in the expected format. Let's try an alternative.
    console.log('\n  Trying alternative: Send delegation deployment first');
    
    try {
      // Send the prepared delegation deployment
      const deployResponse = await makeRelayCall('wallet_sendPreparedCalls', [{
        context: signedPreCall.context,
        key: {
          prehash: false,
          publicKey: sessionAccount.address,
          type: 'secp256k1'
        },
        signature: signedPreCall.signature
      }]);
      
      console.log('  ✅ Delegation deployment tx:', deployResponse.id);
      
      // Wait for confirmation
      await new Promise(r => setTimeout(r, 15000));
      
      // Now try pet creation without preCalls
      console.log('\n  Retrying pet creation...');
      
      const retryParams = {
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
      
      const retryPrepare = await makeRelayCall('wallet_prepareCalls', [retryParams]);
      const retrySignature = await sessionAccount.signMessage({
        message: { raw: retryPrepare.digest }
      });
      
      const retryResponse = await makeRelayCall('wallet_sendPreparedCalls', [{
        context: retryPrepare.context,
        key: {
          prehash: false,
          publicKey: sessionAccount.address,
          type: 'secp256k1'
        },
        signature: retrySignature
      }]);
      
      console.log('  ✅ Pet creation retry tx:', retryResponse.id);
      
    } catch (retryError) {
      console.log('  ❌ Retry also failed:', retryError.message);
    }
  }
  
  // Final balance check
  const finalBalance = await client.getBalance({ address: mainAccount.address });
  
  console.log('\n' + '=' .repeat(60));
  console.log('💰 FINAL RESULTS:');
  console.log('  Initial balance:', initialBalance.toString(), 'wei');
  console.log('  Final balance:', finalBalance.toString(), 'wei');
  console.log('  Gasless:', finalBalance <= initialBalance ? '✅ Yes!' : '❌ No');
  console.log('=' .repeat(60));
}

// Run test
testPreCallsPattern().catch(console.error);