#!/usr/bin/env node

/**
 * Porto Gasless Transaction Test - Fixed Version
 * 
 * Based on analysis of porto-relay, porto-rise, and test-chat-app implementations.
 * This version ensures proper preCall inclusion for key authorization.
 */

import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { encodeFunctionData } from 'viem';
import { CONFIG, makeRelayCall, createClient } from './lib/porto-utils-enhanced.js';
import FrenPetSimpleJson from '../contracts/out/FrenPetSimple.sol/FrenPetSimple.json' with { type: 'json' };

const FRENPET_SIMPLE_ADDRESS = '0x3fde139a94eef14c4eba229fdc80a54f7f5fbf25';
const ETH_ADDRESS = '0x0000000000000000000000000000000000000000';

async function testGaslessFix() {
  console.log('🚀 PORTO GASLESS TRANSACTION TEST - FIXED VERSION');
  console.log('=' .repeat(60));
  console.log('Based on analysis of:');
  console.log('  - porto-relay wallet handler (preCalls logic)');
  console.log('  - porto-rise dialog mode (automatic preCall handling)');
  console.log('  - test-chat-app (working passkey implementation)');
  console.log('=' .repeat(60));
  
  // Generate fresh accounts
  const mainPrivateKey = generatePrivateKey();
  const mainAccount = privateKeyToAccount(mainPrivateKey);
  
  const sessionPrivateKey = generatePrivateKey();
  const sessionAccount = privateKeyToAccount(sessionPrivateKey);
  
  console.log('\n🔑 Accounts:');
  console.log('  Main EOA:', mainAccount.address);
  console.log('  Session Key:', sessionAccount.address);
  
  const client = createClient();
  const initialBalance = await client.getBalance({ address: mainAccount.address });
  console.log('  Balance:', initialBalance.toString(), 'wei (should be 0)');
  
  // =====================================
  // STEP 1: Register Delegation + Keys
  // =====================================
  console.log('\n📝 Step 1: Register Delegation with Session Key');
  console.log('-'.repeat(40));
  console.log('The relay will store this data for automatic inclusion as preCalls');
  
  const expiry = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30 days
  const expiryHex = '0x' + expiry.toString(16);
  
  // Prepare upgrade with session key authorization
  const prepareParams = {
    address: mainAccount.address,
    delegation: CONFIG.PORTO_IMPLEMENTATION,
    capabilities: {
      authorizeKeys: [
        {
          expiry: expiryHex,
          prehash: false,
          publicKey: sessionAccount.address,
          role: 'session',
          type: 'secp256k1',
          permissions: []
        }
      ]
    },
    chainId: CONFIG.CHAIN_ID
  };
  
  console.log('  Preparing upgrade with session key authorization...');
  const prepareResponse = await makeRelayCall('wallet_prepareUpgradeAccount', [prepareParams]);
  console.log('  ✅ Prepared upgrade');
  console.log('  Auth digest:', prepareResponse.digests.auth.substring(0, 20) + '...');
  console.log('  Exec digest:', prepareResponse.digests.exec.substring(0, 20) + '...');
  
  // Important: Check if preCall data was generated
  if (prepareResponse.context?.preCall) {
    console.log('  ✅ PreCall data generated:');
    console.log('    - EOA:', prepareResponse.context.preCall.eoa);
    console.log('    - Execution data length:', prepareResponse.context.preCall.execution_data?.length || 0);
    console.log('    - This contains the key authorization calls');
  }
  
  // Sign with main EOA
  const authSig = await mainAccount.sign({ hash: prepareResponse.digests.auth });
  const execSig = await mainAccount.sign({ hash: prepareResponse.digests.exec });
  
  // Complete the upgrade - this stores data in relay DB
  console.log('  Upgrading account (storing in relay DB)...');
  await makeRelayCall('wallet_upgradeAccount', [{
    context: prepareResponse.context,
    signatures: { auth: authSig, exec: execSig }
  }]);
  
  console.log('  ✅ Upgrade data stored in relay (key: upgrade:' + mainAccount.address + ')');
  
  // Verify keys are registered off-chain
  console.log('\n  Verifying off-chain key registration...');
  try {
    const keysResponse = await makeRelayCall('wallet_getKeys', [{
      address: mainAccount.address,
      chain_id: CONFIG.CHAIN_ID
    }]);
    console.log('  ✅ Keys registered off-chain:', keysResponse.length);
    if (keysResponse.length > 0) {
      const key = keysResponse[0];
      const publicKey = key.base?.base?.publicKey || key.publicKey || key.key?.publicKey;
      console.log('    Session key found:', publicKey === sessionAccount.address ? '✅' : '❌');
    }
  } catch (error) {
    console.log('  ⚠️  Could not verify keys:', error.message);
  }
  
  // =====================================
  // STEP 2: First Transaction (with preCalls)
  // =====================================
  console.log('\n📝 Step 2: First Transaction - Deploy Delegation + Create Pet');
  console.log('-'.repeat(40));
  console.log('The relay should automatically include stored upgrade data as preCalls');
  
  const petName = `GaslessPet_${Date.now()}`;
  console.log('  Pet name:', petName);
  
  const createPetCalldata = encodeFunctionData({
    abi: FrenPetSimpleJson.abi,
    functionName: 'createPet',
    args: [petName]
  });
  
  // First transaction - relay should auto-include preCalls
  const callParams = {
    from: mainAccount.address,
    chainId: CONFIG.CHAIN_ID,
    calls: [{
      to: FRENPET_SIMPLE_ADDRESS,
      data: createPetCalldata,
      value: '0x0'
    }],
    capabilities: {
      meta: {
        feeToken: ETH_ADDRESS
      }
    }
  };
  
  console.log('\n  Preparing first transaction...');
  const prepareCallsResponse = await makeRelayCall('wallet_prepareCalls', [callParams]);
  
  console.log('  ✅ Prepared calls');
  
  // Check preCalls
  const preCallCount = prepareCallsResponse.context?.quote?.intent?.encodedPreCalls?.length || 0;
  console.log('\n  📋 PreCall Analysis:');
  console.log('    PreCalls included:', preCallCount);
  
  if (preCallCount > 0) {
    console.log('    ✅ PreCalls detected! Transaction will:');
    console.log('       1. Deploy EIP-7702 delegation');
    console.log('       2. Authorize session key on-chain');
    console.log('       3. Execute pet creation');
    
    // Check who's funding
    const paymentSigner = prepareCallsResponse.context?.quote?.paymentSignature;
    if (paymentSigner) {
      console.log('    💰 Gas sponsored by relay');
    }
  } else {
    console.log('    ⚠️  No preCalls - relay may not have found upgrade data');
    console.log('    This transaction might fail if delegation isn\'t deployed');
  }
  
  // Sign with main account (it owns the delegation deployment)
  console.log('\n  Signing with main EOA (owns delegation)...');
  const callSignature = await mainAccount.sign({
    hash: prepareCallsResponse.digest
  });
  
  // Send the transaction
  console.log('  Sending transaction...');
  try {
    const sendResponse = await makeRelayCall('wallet_sendPreparedCalls', [{
      context: prepareCallsResponse.context,
      key: {
        prehash: false,
        publicKey: mainAccount.address,
        type: 'secp256k1'
      },
      signature: callSignature
    }]);
    
    console.log('  ✅ Transaction sent:', sendResponse.id);
    console.log('     View: https://testnet.riselabs.xyz/tx/' + sendResponse.id);
    
    // Wait for confirmation
    console.log('\n⏳ Waiting 15 seconds for confirmation...');
    await new Promise(r => setTimeout(r, 15000));
    
    // Check transaction status
    try {
      const statusResponse = await makeRelayCall('wallet_getCallsStatus', [sendResponse.id]);
      console.log('  Transaction status:', statusResponse.status);
      if (statusResponse.receipts && statusResponse.receipts[0]) {
        const receipt = statusResponse.receipts[0];
        console.log('  Receipt status:', receipt.status === '0x1' ? '✅ Success' : '❌ Failed');
      }
    } catch (error) {
      console.log('  Could not get status:', error.message);
    }
    
  } catch (error) {
    console.log('  ❌ Transaction failed:', error.message);
    
    if (error.message.includes('insufficient funds')) {
      console.log('\n  💡 Gas calculation issue detected');
      console.log('  The relay has a known bug with preCall gas estimation');
      console.log('  Workaround: Fund account with 0.001 ETH for delegation only');
    }
  }
  
  // =====================================
  // STEP 3: Verify Results
  // =====================================
  console.log('\n📝 Step 3: Verify Results');
  console.log('-'.repeat(40));
  
  // Check balance
  const finalBalance = await client.getBalance({ address: mainAccount.address });
  console.log('  Final balance:', finalBalance.toString(), 'wei');
  console.log('  Gasless achieved:', finalBalance <= initialBalance ? '✅ Yes' : '❌ No');
  
  // Check delegation
  const code = await client.getCode({ address: mainAccount.address });
  const hasDelegation = code && code !== '0x';
  console.log('  Delegation deployed:', hasDelegation ? '✅ Yes' : '❌ No');
  
  // Check on-chain keys
  if (hasDelegation) {
    console.log('\n  Checking on-chain key authorization...');
    try {
      const keysAfter = await makeRelayCall('wallet_getKeys', [{
        address: mainAccount.address,
        chain_id: CONFIG.CHAIN_ID
      }]);
      console.log('  Keys on-chain:', keysAfter.length);
      if (keysAfter.length > 0) {
        const key = keysAfter[0];
        const publicKey = key.base?.base?.publicKey || key.publicKey || key.key?.publicKey;
        console.log('  Session key authorized:', publicKey === sessionAccount.address ? '✅' : '❌');
      } else {
        console.log('  ⚠️  No keys found - authorization may have failed');
      }
    } catch (error) {
      console.log('  Error checking keys:', error.message);
    }
  }
  
  // Check pet
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
    }
  } catch (error) {
    console.log('  Pet check failed:', error.message);
  }
  
  // =====================================
  // STEP 4: Second Transaction with Session Key
  // =====================================
  if (hasDelegation && !await client.readContract({
    address: FRENPET_SIMPLE_ADDRESS,
    abi: FrenPetSimpleJson.abi,
    functionName: 'hasPet',
    args: [mainAccount.address]
  })) {
    console.log('\n📝 Step 4: Retry with Session Key');
    console.log('-'.repeat(40));
    console.log('  Delegation deployed, using session key for retry...');
    
    const retryCalldata = encodeFunctionData({
      abi: FrenPetSimpleJson.abi,
      functionName: 'createPet',
      args: [`Retry_${Date.now()}`]
    });
    
    const retryParams = {
      from: mainAccount.address,
      chainId: CONFIG.CHAIN_ID,
      calls: [{
        to: FRENPET_SIMPLE_ADDRESS,
        data: retryCalldata,
        value: '0x0'
      }],
      capabilities: {
        meta: {
          feeToken: ETH_ADDRESS
        }
      }
    };
    
    try {
      const retryPrepare = await makeRelayCall('wallet_prepareCalls', [retryParams]);
      
      // Now use session key since delegation is deployed
      console.log('  Signing with session key...');
      const retrySignature = await sessionAccount.sign({
        hash: retryPrepare.digest
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
      
      console.log('  ✅ Retry sent:', retryResponse.id);
      
      await new Promise(r => setTimeout(r, 10000));
      
      const retryHasPet = await client.readContract({
        address: FRENPET_SIMPLE_ADDRESS,
        abi: FrenPetSimpleJson.abi,
        functionName: 'hasPet',
        args: [mainAccount.address]
      });
      
      console.log('  Pet created with session key:', retryHasPet ? '✅ Yes' : '❌ No');
      
    } catch (error) {
      console.log('  ❌ Session key transaction failed:', error.message);
      console.log('  This confirms keys aren\'t properly authorized on-chain');
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('🎯 SUMMARY');
  console.log('  Gasless achieved:', finalBalance <= initialBalance ? '✅' : '❌');
  console.log('  Delegation deployed:', hasDelegation ? '✅' : '❌');
  console.log('  Keys authorized on-chain:', '🔍 Check above');
  console.log('=' .repeat(60));
  
  console.log('\n📚 Key Findings:');
  console.log('  1. Relay stores upgrade data in DB under key: upgrade:{address}');
  console.log('  2. First prepareCalls should retrieve and include this as preCall');
  console.log('  3. PreCall contains both delegation deployment + key authorization');
  console.log('  4. After successful transaction, upgrade data is cleared from DB');
  console.log('  5. Dialog mode handles this automatically, direct RPC needs explicit handling');
}

// Run test
testGaslessFix().catch(console.error);