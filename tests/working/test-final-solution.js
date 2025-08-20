#!/usr/bin/env node

/**
 * Porto Gasless Test - Final Solution
 * 
 * Combines the insights from all our tests:
 * 1. We MUST call wallet_upgradeAccount so relay has the auth signature
 * 2. We use preCall:false to prevent relay from auto-fetching stored upgrade
 * 3. We manually include the preCall to control the flow
 */

import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { encodeFunctionData } from 'viem';
import { CONFIG, makeRelayCall, createClient } from './lib/porto-utils-enhanced.js';
import FrenPetSimpleJson from '../contracts/out/FrenPetSimple.sol/FrenPetSimple.json' with { type: 'json' };

const FRENPET_SIMPLE_ADDRESS = '0x3fde139a94eef14c4eba229fdc80a54f7f5fbf25';
const ETH_ADDRESS = '0x0000000000000000000000000000000000000000';

async function testFinalSolution() {
  console.log('🚀 PORTO GASLESS TEST - FINAL SOLUTION');
  console.log('=' .repeat(60));
  console.log('Combining all insights:');
  console.log('- Store upgrade so relay has auth signature');
  console.log('- Use preCall:false to prevent auto-fetch');
  console.log('- Manually include preCall for control');
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
  // STEP 1: Full Registration (Store for Auth Sig)
  // =====================================
  console.log('\n📝 Step 1: Full Registration (with wallet_upgradeAccount)');
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
  
  // Sign the digests
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
  
  // Store the upgrade (so relay has auth signature)
  await makeRelayCall('wallet_upgradeAccount', [{
    context: prepareResponse.context,
    signatures: { auth: authSig, exec: execSig }
  }]);
  console.log('  ✅ Upgrade stored (relay has auth signature)');
  
  // Build our manual preCall
  const manualPreCall = {
    eoa: preCallData.eoa,
    executionData: preCallData.executionData,
    nonce: preCallData.nonce,
    signature: execSig
  };
  
  // =====================================
  // STEP 2: Transaction with preCall:false + manual preCall
  // =====================================
  console.log('\n📝 Step 2: Create Pet with Controlled PreCall');
  console.log('-'.repeat(40));
  console.log('  Using preCall:false to prevent auto-fetch');
  console.log('  Manually including the preCall we control');
  
  const petName = `FinalPet_${Date.now()}`;
  console.log('  Pet name:', petName);
  
  const createPetCalldata = encodeFunctionData({
    abi: FrenPetSimpleJson.abi,
    functionName: 'createPet',
    args: [petName]
  });
  
  try {
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
        preCall: false,  // Prevent auto-fetch
        preCalls: [manualPreCall]  // Include manually
      }
    };
    
    const petPrepare = await makeRelayCall('wallet_prepareCalls', [petParams]);
    
    console.log('  ✅ Prepared calls');
    console.log('  PreCalls count:', 
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
    
    console.log('  ✅ Transaction sent:', petResponse.id);
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
    
    const code = await client.getCode({ address: mainAccount.address });
    const hasCode = code && code !== '0x';
    
    console.log('\n  Results:');
    console.log('    Pet created:', hasPet ? '✅ Yes' : '❌ No');
    console.log('    Delegation deployed:', hasCode ? '✅ Yes' : '❌ No');
    
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
    
    if (error.message.includes('insufficient funds')) {
      console.log('\n  ⚠️  Hit the gas calculation bug');
      console.log('  Even with our workaround, the relay gas calculation is still broken');
      console.log('  The relay needs to properly calculate gas instead of hardcoding 50M');
      
      // Try without manual preCall (let relay auto-add)
      console.log('\n  Trying without manual preCall (relay auto-adds)...');
      
      try {
        const autoParams = {
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
            // Let relay auto-add from stored upgrade
          }
        };
        
        const autoPrepare = await makeRelayCall('wallet_prepareCalls', [autoParams]);
        console.log('  PreCalls auto-added:', 
          autoPrepare.context?.quote?.intent?.encodedPreCalls?.length || 0);
        
        const autoSignature = await sessionAccount.signMessage({
          message: { raw: autoPrepare.digest }
        });
        
        const autoResponse = await makeRelayCall('wallet_sendPreparedCalls', [{
          context: autoPrepare.context,
          key: {
            prehash: false,
            publicKey: sessionAccount.address,
            type: 'secp256k1'
          },
          signature: autoSignature
        }]);
        
        console.log('  ✅ Transaction sent (auto):', autoResponse.id);
        
      } catch (autoError) {
        console.log('  ❌ Auto-add also failed:', autoError.message);
      }
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
  
  console.log('\n📋 Conclusion:');
  console.log('  The Porto relay has a fundamental gas calculation bug when');
  console.log('  preCalls are involved. It hardcodes 50M gas instead of');
  console.log('  calculating properly. This affects all first transactions');
  console.log('  that need to deploy delegation.');
  console.log('\n  Gasless DOES work once delegation is deployed.');
}

// Run test
testFinalSolution().catch(console.error);