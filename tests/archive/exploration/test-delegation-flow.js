#!/usr/bin/env node

/**
 * Test Delegation Flow
 * 
 * Tests the proper two-transaction flow:
 * 1. First transaction: Delegation only (empty call)
 * 2. Check delegation status
 * 3. Second transaction: Create pet
 */

import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { formatEther, encodeFunctionData } from 'viem';
import {
  CONFIG,
  makeRelayCall,
  getBalance,
  createClient,
  saveToJson
} from './lib/porto-utils-enhanced.js';
import FrenPetSimpleJson from '../contracts/out/FrenPetSimple.sol/FrenPetSimple.json' with { type: 'json' };

const FRENPET_SIMPLE_ADDRESS = '0x3fde139a94eef14c4eba229fdc80a54f7f5fbf25';

async function testDelegationFlow() {
  console.log('🔬 DELEGATION FLOW TEST');
  console.log('========================');
  console.log('Testing proper two-transaction flow for Porto\n');
  
  // Create a fresh account for clean testing
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  
  console.log('🆕 Fresh Account Created:');
  console.log('  Address:', account.address);
  console.log('  Private Key:', privateKey.substring(0, 10) + '...\n');
  
  const client = createClient();
  const options = {
    verbose: false, // Less verbose for cleaner output
    saveJson: true,
    testName: 'delegation_flow'
  };
  
  // =====================================
  // STEP 1: Account Setup (Off-chain)
  // =====================================
  console.log('╔══════════════════════════════════════╗');
  console.log('║  STEP 1: Account Setup (Off-chain)   ║');
  console.log('╚══════════════════════════════════════╝\n');
  
  const expiry = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
  const expiryHex = '0x' + expiry.toString(16);
  
  console.log('📝 Preparing account upgrade...');
  
  const prepareParams = {
    address: account.address,
    delegation: CONFIG.PORTO_IMPLEMENTATION,
    capabilities: {
      authorizeKeys: [{
        expiry: expiryHex,
        prehash: false,
        publicKey: account.address,
        role: 'admin',
        type: 'secp256k1',
        permissions: []
      }]
    },
    chainId: CONFIG.CHAIN_ID
  };
  
  const prepareResponse = await makeRelayCall('wallet_prepareUpgradeAccount', [prepareParams], options);
  console.log('✅ Prepare completed\n');
  
  // Sign the authorization
  console.log('🖊️  Signing authorization...');
  const authSig = await account.signMessage({
    message: { raw: prepareResponse.digests.auth }
  });
  
  const domain = {
    ...prepareResponse.typedData.domain,
    chainId: typeof prepareResponse.typedData.domain.chainId === 'string' 
      ? parseInt(prepareResponse.typedData.domain.chainId, 16)
      : prepareResponse.typedData.domain.chainId,
  };
  
  const execSig = await account.signTypedData({
    domain,
    types: prepareResponse.typedData.types,
    primaryType: prepareResponse.typedData.primaryType,
    message: prepareResponse.typedData.message,
  });
  console.log('✅ Signatures created\n');
  
  // Upgrade account (off-chain)
  console.log('📤 Upgrading account (stores data off-chain)...');
  const upgradeParams = {
    context: prepareResponse.context,
    signatures: {
      auth: authSig,
      exec: execSig
    }
  };
  
  await makeRelayCall('wallet_upgradeAccount', [upgradeParams], options);
  console.log('✅ Account upgrade stored (off-chain only)\n');
  
  // =====================================
  // STEP 2: Delegation Transaction
  // =====================================
  console.log('╔══════════════════════════════════════╗');
  console.log('║  STEP 2: Delegation Transaction      ║');
  console.log('╚══════════════════════════════════════╝\n');
  
  console.log('📤 Sending EMPTY transaction to trigger delegation...');
  console.log('   (This should execute the delegation on-chain)\n');
  
  // Empty call to trigger delegation
  const delegationCalls = [{
    to: '0x0000000000000000000000000000000000000000',
    value: '0x0',
    data: '0x'
  }];
  
  const prepareDelegationParams = {
    from: account.address,
    chainId: CONFIG.CHAIN_ID,
    calls: delegationCalls,
    capabilities: {
      meta: {}
    }
  };
  
  const prepareDelegationResponse = await makeRelayCall('wallet_prepareCalls', [prepareDelegationParams], options);
  
  // Check for preCalls
  const hasPreCalls = !!(prepareDelegationResponse.context?.quote?.intent?.encodedPreCalls?.length);
  console.log('🔍 Transaction includes preCalls:', hasPreCalls);
  
  if (hasPreCalls) {
    const numPreCalls = prepareDelegationResponse.context.quote.intent.encodedPreCalls.length;
    console.log('   Number of preCalls:', numPreCalls);
    console.log('   ✅ This will execute delegation setup\n');
  } else {
    console.log('   ⚠️  No preCalls - delegation might already be active\n');
  }
  
  // Sign and send delegation transaction
  const delegationSignature = await account.signMessage({
    message: { raw: prepareDelegationResponse.digest }
  });
  
  const sendDelegationParams = {
    context: prepareDelegationResponse.context,
    key: {
      prehash: false,
      publicKey: account.address,
      type: 'secp256k1'
    },
    signature: delegationSignature
  };
  
  let delegationTxId;
  try {
    const sendDelegationResponse = await makeRelayCall('wallet_sendPreparedCalls', [sendDelegationParams], options);
    delegationTxId = sendDelegationResponse.id;
    console.log('✅ Delegation transaction sent!');
    console.log('   Bundle ID:', delegationTxId);
    console.log('\n⏳ Waiting 15 seconds for confirmation...\n');
    await new Promise(r => setTimeout(r, 15000));
    
  } catch (error) {
    console.log('❌ Delegation transaction failed:', error.message);
    return;
  }
  
  // =====================================
  // STEP 3: Check Delegation Status
  // =====================================
  console.log('╔══════════════════════════════════════╗');
  console.log('║  STEP 3: Check Delegation Status     ║');
  console.log('╚══════════════════════════════════════╝\n');
  
  // Check transaction status
  try {
    const statusResponse = await makeRelayCall('wallet_getCallsStatus', [{
      bundleId: delegationTxId
    }], { verbose: false });
    
    console.log('📊 Transaction Status:');
    console.log('   Status:', statusResponse.status || 'PENDING');
    
    if (statusResponse.receipts && statusResponse.receipts.length > 0) {
      const receipt = statusResponse.receipts[0];
      console.log('   Block Number:', receipt.blockNumber);
      console.log('   Gas Used:', receipt.gasUsed);
      console.log('   Success:', receipt.success ? '✅' : '❌');
      
      if (receipt.logs && receipt.logs.length > 0) {
        console.log('   Events Emitted:', receipt.logs.length);
      }
    }
  } catch (error) {
    console.log('⚠️  Could not fetch status:', error.message);
  }
  
  // Check if account has code (delegation)
  const codeAfterDelegation = await client.getCode({ address: account.address });
  console.log('\n🔍 Account State After Delegation:');
  console.log('   Has Code:', codeAfterDelegation && codeAfterDelegation !== '0x');
  console.log('   Code Length:', codeAfterDelegation ? codeAfterDelegation.length : 0);
  
  if (codeAfterDelegation && codeAfterDelegation !== '0x') {
    console.log('   ✅ Account has delegated code!');
  } else {
    console.log('   📝 Note: Porto uses meta-transactions, EOA may not show code directly\n');
  }
  
  // =====================================
  // STEP 4: Create Pet Transaction
  // =====================================
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║  STEP 4: Create Pet Transaction      ║');
  console.log('╚══════════════════════════════════════╝\n');
  
  const petName = `TestPet_${Date.now()}`;
  console.log('🐾 Creating pet:', petName);
  
  const petCalldata = encodeFunctionData({
    abi: FrenPetSimpleJson.abi,
    functionName: 'createPet',
    args: [petName]
  });
  
  const petCalls = [{
    to: FRENPET_SIMPLE_ADDRESS,
    value: '0x0',
    data: petCalldata
  }];
  
  const preparePetParams = {
    from: account.address,
    chainId: CONFIG.CHAIN_ID,
    calls: petCalls,
    capabilities: {
      meta: {}
    }
  };
  
  const preparePetResponse = await makeRelayCall('wallet_prepareCalls', [preparePetParams], options);
  
  // Check for preCalls in second transaction
  const hasPreCallsSecond = !!(preparePetResponse.context?.quote?.intent?.encodedPreCalls?.length);
  console.log('\n🔍 Second transaction includes preCalls:', hasPreCallsSecond);
  
  if (!hasPreCallsSecond) {
    console.log('   ✅ No preCalls - delegation is active!');
    console.log('   This transaction should execute pet creation\n');
  } else {
    console.log('   ⚠️  Still has preCalls - unexpected\n');
  }
  
  // Sign and send pet creation transaction
  const petSignature = await account.signMessage({
    message: { raw: preparePetResponse.digest }
  });
  
  const sendPetParams = {
    context: preparePetResponse.context,
    key: {
      prehash: false,
      publicKey: account.address,
      type: 'secp256k1'
    },
    signature: petSignature
  };
  
  let petTxId;
  try {
    const sendPetResponse = await makeRelayCall('wallet_sendPreparedCalls', [sendPetParams], options);
    petTxId = sendPetResponse.id;
    console.log('✅ Pet creation transaction sent!');
    console.log('   Bundle ID:', petTxId);
    console.log('\n⏳ Waiting 15 seconds for confirmation...\n');
    await new Promise(r => setTimeout(r, 15000));
    
  } catch (error) {
    console.log('❌ Pet creation transaction failed:', error.message);
    if (error.message.includes('insufficient funds')) {
      console.log('   Need to fund relay signers with more ETH');
    }
    return;
  }
  
  // =====================================
  // STEP 5: Verify Pet Creation
  // =====================================
  console.log('╔══════════════════════════════════════╗');
  console.log('║  STEP 5: Verify Pet Creation         ║');
  console.log('╚══════════════════════════════════════╝\n');
  
  // Check transaction status
  try {
    const petStatusResponse = await makeRelayCall('wallet_getCallsStatus', [{
      bundleId: petTxId
    }], { verbose: false });
    
    console.log('📊 Pet Creation Transaction Status:');
    console.log('   Status:', petStatusResponse.status || 'PENDING');
    
    if (petStatusResponse.receipts && petStatusResponse.receipts.length > 0) {
      const receipt = petStatusResponse.receipts[0];
      console.log('   Block Number:', receipt.blockNumber);
      console.log('   Gas Used:', receipt.gasUsed);
      console.log('   Success:', receipt.success ? '✅' : '❌');
    }
  } catch (error) {
    console.log('⚠️  Could not fetch status:', error.message);
  }
  
  // Check if pet was created
  console.log('\n🐾 Checking pet on-chain...');
  
  try {
    // Check if user has a pet
    const hasPet = await client.readContract({
      address: FRENPET_SIMPLE_ADDRESS,
      abi: FrenPetSimpleJson.abi,
      functionName: 'hasPet',
      args: [account.address]
    });
    
    console.log('   Has Pet:', hasPet ? '✅ YES' : '❌ NO');
    
    if (hasPet) {
      // Get pet details
      const pet = await client.readContract({
        address: FRENPET_SIMPLE_ADDRESS,
        abi: FrenPetSimpleJson.abi,
        functionName: 'pets',
        args: [account.address]
      });
      
      console.log('\n🎉 SUCCESS! Pet was created on-chain!');
      console.log('   Name:', pet[0] || pet.name);
      console.log('   Level:', pet[1]?.toString() || pet.level?.toString());
      console.log('   Is Alive:', pet[8] || pet.isAlive);
      
      console.log('\n✅ Two-transaction flow works correctly!');
      console.log('   1. First transaction: Executed delegation');
      console.log('   2. Second transaction: Created pet successfully');
    } else {
      console.log('\n❌ Pet was not created');
      console.log('   The transaction may have succeeded but not executed the call');
    }
  } catch (error) {
    console.log('❌ Error checking pet:', error.message);
  }
  
  // =====================================
  // SUMMARY
  // =====================================
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║            TEST SUMMARY               ║');
  console.log('╚══════════════════════════════════════╝\n');
  
  console.log('📊 Results:');
  console.log('  1. Account setup: ✅ (off-chain)');
  console.log('  2. Delegation transaction: ' + (delegationTxId ? '✅' : '❌'));
  console.log('  3. Pet creation transaction: ' + (petTxId ? '✅' : '❌'));
  console.log('  4. Pet exists on-chain: Will check above');
  
  console.log('\n💡 Key Learning:');
  console.log('  Porto requires two transactions for new accounts:');
  console.log('  - First: Sets up delegation (empty call)');
  console.log('  - Second: Executes actual operation');
  
  console.log('\n📁 JSON outputs saved to ./output/');
}

// Run test
testDelegationFlow().catch(console.error);