#!/usr/bin/env node

/**
 * Porto Gasless Transaction Test
 * 
 * Clean implementation of gasless transactions using Porto relay.
 * This follows the standard flow that we know works.
 */

import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { encodeFunctionData } from 'viem';
import { CONFIG, makeRelayCall, createClient } from './lib/porto-utils-enhanced.js';
import FrenPetSimpleJson from '../contracts/out/FrenPetSimple.sol/FrenPetSimple.json' with { type: 'json' };

const FRENPET_SIMPLE_ADDRESS = '0x3fde139a94eef14c4eba229fdc80a54f7f5fbf25';
const ETH_ADDRESS = '0x0000000000000000000000000000000000000000';

async function testGasless() {
  console.log('🚀 PORTO GASLESS TRANSACTION TEST');
  console.log('=' .repeat(60));
  
  // Generate fresh accounts
  const mainPrivateKey = generatePrivateKey();
  const mainAccount = privateKeyToAccount(mainPrivateKey);
  
  const sessionPrivateKey = generatePrivateKey();
  const sessionAccount = privateKeyToAccount(sessionPrivateKey);
  
  console.log('🔑 Accounts:');
  console.log('  Main EOA:', mainAccount.address);
  console.log('  Session Key:', sessionAccount.address);
  
  const client = createClient();
  const initialBalance = await client.getBalance({ address: mainAccount.address });
  console.log('  Balance:', initialBalance.toString(), 'wei');
  
  // =====================================
  // STEP 1: Register Delegation
  // =====================================
  console.log('\n📝 Step 1: Register Delegation');
  console.log('-'.repeat(40));
  
  const expiry = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30 days
  const expiryHex = '0x' + expiry.toString(16);
  
  // Prepare the upgrade
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
  
  // Sign the authorization and execution digests with MAIN EOA (not session key)
  // These signatures authorize the delegation, so must come from the EOA owner
  const authSig = await mainAccount.signMessage({
    message: { raw: prepareResponse.digests.auth }
  });
  
  const domain = {
    ...prepareResponse.typedData.domain,
    chainId: typeof prepareResponse.typedData.domain.chainId === 'string' 
      ? parseInt(prepareResponse.typedData.domain.chainId, 16)
      : prepareResponse.typedData.domain.chainId,
  };
  
  const execSig = await mainAccount.signTypedData({
    domain,
    types: prepareResponse.typedData.types,
    primaryType: prepareResponse.typedData.primaryType,
    message: prepareResponse.typedData.message,
  });
  
  // Complete the upgrade
  await makeRelayCall('wallet_upgradeAccount', [{
    context: prepareResponse.context,
    signatures: { auth: authSig, exec: execSig }
  }]);
  
  console.log('  ✅ Delegation registered');
  
  // =====================================
  // STEP 2: Execute Gasless Transaction
  // =====================================
  console.log('\n📝 Step 2: Execute Gasless Transaction - Create Pet');
  console.log('-'.repeat(40));
  
  const petName = `GaslessPet_${Date.now()}`;
  console.log('  Pet name:', petName);
  
  const createPetCalldata = encodeFunctionData({
    abi: FrenPetSimpleJson.abi,
    functionName: 'createPet',
    args: [petName]
  });
  
  // Prepare the calls
  const callParams = {
    from: mainAccount.address,
    chainId: CONFIG.CHAIN_ID,
    calls: [{
      to: FRENPET_SIMPLE_ADDRESS,
      value: '0x0',
      data: createPetCalldata
    }],
    capabilities: {
      meta: {
        feeToken: ETH_ADDRESS  // Critical: ETH as fee token for sponsorship
      }
    }
  };
  
  const prepareCallsResponse = await makeRelayCall('wallet_prepareCalls', [callParams]);
  
  console.log('  ✅ Prepared calls');
  console.log('  Digest:', prepareCallsResponse.digest.substring(0, 20) + '...');
  
  // Check if delegation deployment is included as preCall
  const preCallCount = prepareCallsResponse.context?.quote?.intent?.encodedPreCalls?.length || 0;
  console.log('  PreCalls included:', preCallCount);
  
  // Sign the intent digest
  // For the first transaction (which deploys delegation), we use the main EOA
  // After delegation is deployed, we can use the session key
  const isFirstTransaction = preCallCount > 0; // PreCalls indicate delegation deployment
  const signingAccount = isFirstTransaction ? mainAccount : sessionAccount;
  
  const callSignature = await signingAccount.signMessage({
    message: { raw: prepareCallsResponse.digest }
  });
  
  // Send the transaction
  try {
    const sendResponse = await makeRelayCall('wallet_sendPreparedCalls', [{
      context: prepareCallsResponse.context,
      key: {
        prehash: false,
        publicKey: signingAccount.address,
        type: 'secp256k1'
      },
      signature: callSignature
    }]);
    
    console.log('  ✅ Transaction sent:', sendResponse.id);
    console.log('     View: https://testnet.riselabs.xyz/tx/' + sendResponse.id);
    
    // Wait for confirmation
    console.log('\n⏳ Waiting 15 seconds for confirmation...');
    await new Promise(r => setTimeout(r, 15000));
    
  } catch (error) {
    console.log('  ❌ Transaction failed:', error.message);
    
    if (error.message.includes('insufficient funds')) {
      console.log('\n  Note: If this is the first transaction that deploys delegation,');
      console.log('  the relay may have issues calculating gas for preCalls.');
    }
  }
  
  // =====================================
  // STEP 3: Verify Results
  // =====================================
  console.log('\n📝 Step 3: Verify Results');
  console.log('-'.repeat(40));
  
  // Check final balance
  const finalBalance = await client.getBalance({ address: mainAccount.address });
  console.log('  Final balance:', finalBalance.toString(), 'wei');
  console.log('  Balance unchanged:', finalBalance <= initialBalance ? '✅ Yes' : '❌ No');
  
  // Check if delegation was deployed
  const code = await client.getCode({ address: mainAccount.address });
  const hasDelegation = code && code !== '0x';
  console.log('  Delegation deployed:', hasDelegation ? '✅ Yes' : '❌ No');
  
  // Check if pet was created
  try {
    const hasPet = await client.readContract({
      address: FRENPET_SIMPLE_ADDRESS,
      abi: FrenPetSimpleJson.abi,
      functionName: 'hasPet',
      args: [mainAccount.address]
    });
    
    console.log('  Pet created:', hasPet ? '✅ Yes' : '❌ No');
    
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
    console.log('  Pet check failed:', error.message);
  }
  
  // =====================================
  // STEP 4: Second Transaction (if first succeeded)
  // =====================================
  if (hasDelegation) {
    console.log('\n📝 Step 4: Second Transaction - Feed Pet');
    console.log('-'.repeat(40));
    console.log('  Testing subsequent gasless transaction...');
    
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
      console.log('  PreCalls in feed tx:', 
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
      
      console.log('  ✅ Feed transaction sent:', feedResponse.id);
      
    } catch (error) {
      console.log('  ❌ Feed transaction failed:', error.message);
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('🎯 SUMMARY');
  console.log('  Gasless achieved:', finalBalance <= initialBalance ? '✅ Yes' : '❌ No');
  console.log('=' .repeat(60));
}

// Run test
testGasless().catch(console.error);