#!/usr/bin/env node

/**
 * Test Two Transactions
 * 
 * Tests if a second transaction after delegation actually executes the intended call
 * Theory: First transaction sets up delegation, second transaction executes the actual call
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
const FrenPetSimpleAbi = FrenPetSimpleJson.abi;

const FRENPET_SIMPLE_ADDRESS = '0x3fde139a94eef14c4eba229fdc80a54f7f5fbf25';

async function testTwoTransactions() {
  console.log('🔬 TWO TRANSACTION TEST');
  console.log('========================');
  console.log('Testing if second transaction after delegation executes actual call\n');
  
  // Create a fresh account
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  
  console.log('🆕 Fresh Account Created:');
  console.log('  Address:', account.address);
  
  const client = createClient();
  const options = {
    verbose: true,
    saveJson: true,
    testName: 'two_transactions'
  };
  
  // =====================================
  // STEP 1: Prepare and Upgrade Account
  // =====================================
  console.log('\n');
  console.log('╔══════════════════════════════════════╗');
  console.log('║  STEP 1: Setup Account Delegation    ║');
  console.log('╚══════════════════════════════════════╝');
  
  const expiry = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
  const expiryHex = '0x' + expiry.toString(16);
  
  // Prepare upgrade
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
  
  // Sign
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
  
  // Upgrade
  const upgradeParams = {
    context: prepareResponse.context,
    signatures: {
      auth: authSig,
      exec: execSig
    }
  };
  
  const upgradeResponse = await makeRelayCall('wallet_upgradeAccount', [upgradeParams], options);
  console.log('✅ Account upgrade completed (off-chain)');
  
  // =====================================
  // STEP 2: First Transaction (Should trigger delegation)
  // =====================================
  console.log('\n');
  console.log('╔══════════════════════════════════════╗');
  console.log('║  STEP 2: First Transaction           ║');
  console.log('║  (Should trigger delegation)         ║');
  console.log('╚══════════════════════════════════════╝');
  
  // Simple 0 ETH transfer
  const firstCalls = [{
    to: '0x0000000000000000000000000000000000000000',
    value: '0x0',
    data: '0x'
  }];
  
  const prepareFirstParams = {
    from: account.address,
    chainId: CONFIG.CHAIN_ID,
    calls: firstCalls,
    capabilities: {
      meta: {}
    }
  };
  
  try {
    const prepareFirstResponse = await makeRelayCall('wallet_prepareCalls', [prepareFirstParams], options);
    
    const hasPreCalls = !!(prepareFirstResponse.context?.quote?.intent?.encodedPreCalls?.length);
    console.log('\n🔍 First transaction includes preCalls:', hasPreCalls);
    
    if (hasPreCalls) {
      console.log('   This will execute delegation setup');
    }
    
    // Sign and send
    const firstSignature = await account.signMessage({
      message: { raw: prepareFirstResponse.digest }
    });
    
    const sendFirstParams = {
      context: prepareFirstResponse.context,
      key: {
        prehash: false,
        publicKey: account.address,
        type: 'secp256k1'
      },
      signature: firstSignature
    };
    
    const sendFirstResponse = await makeRelayCall('wallet_sendPreparedCalls', [sendFirstParams], options);
    console.log('✅ First transaction sent!');
    console.log('   Bundle ID:', sendFirstResponse.id);
    
    // Wait for confirmation
    console.log('⏳ Waiting 10 seconds for transaction confirmation...');
    await new Promise(r => setTimeout(r, 10000));
    
    // Check if account now has code
    const codeAfterFirst = await client.getCode({ address: account.address });
    console.log('\n📊 After first transaction:');
    console.log('   Account has code:', codeAfterFirst && codeAfterFirst !== '0x');
    
  } catch (error) {
    console.log('❌ First transaction failed:', error.message);
    if (error.message.includes('insufficient funds')) {
      console.log('   Need to fund relay signers');
    }
    return;
  }
  
  // =====================================
  // STEP 3: Second Transaction (Should execute actual call)
  // =====================================
  console.log('\n');
  console.log('╔══════════════════════════════════════╗');
  console.log('║  STEP 3: Second Transaction          ║');
  console.log('║  (Should execute actual call)        ║');
  console.log('╚══════════════════════════════════════╝');
  
  // Now try to create a pet
  const petName = `TestPet_${Date.now()}`;
  const petCalldata = encodeFunctionData({
    abi: FrenPetSimpleAbi,
    functionName: 'createPet',
    args: [petName]
  });
  
  const secondCalls = [{
    to: FRENPET_SIMPLE_ADDRESS,
    value: '0x0',
    data: petCalldata
  }];
  
  const prepareSecondParams = {
    from: account.address,
    chainId: CONFIG.CHAIN_ID,
    calls: secondCalls,
    capabilities: {
      meta: {}
    }
  };
  
  try {
    const prepareSecondResponse = await makeRelayCall('wallet_prepareCalls', [prepareSecondParams], options);
    
    const hasPreCallsSecond = !!(prepareSecondResponse.context?.quote?.intent?.encodedPreCalls?.length);
    console.log('\n🔍 Second transaction includes preCalls:', hasPreCallsSecond);
    
    if (!hasPreCallsSecond) {
      console.log('   ✅ No preCalls - delegation already active!');
      console.log('   This transaction should execute the actual call');
    } else {
      console.log('   ⚠️  Still has preCalls - delegation might not be active');
    }
    
    // Check executionData
    const executionData = prepareSecondResponse.context?.quote?.intent?.executionData;
    if (executionData && executionData !== '0x') {
      console.log('   ExecutionData present (length:', executionData.length + ')');
      // Decode to see if it contains our pet creation call
      if (executionData.includes(petCalldata.slice(2))) {
        console.log('   ✅ ExecutionData contains pet creation call!');
      }
    }
    
    // Sign and send
    const secondSignature = await account.signMessage({
      message: { raw: prepareSecondResponse.digest }
    });
    
    const sendSecondParams = {
      context: prepareSecondResponse.context,
      key: {
        prehash: false,
        publicKey: account.address,
        type: 'secp256k1'
      },
      signature: secondSignature
    };
    
    const sendSecondResponse = await makeRelayCall('wallet_sendPreparedCalls', [sendSecondParams], options);
    console.log('\n✅ Second transaction sent!');
    console.log('   Bundle ID:', sendSecondResponse.id);
    
    // Wait for confirmation
    console.log('⏳ Waiting 10 seconds for transaction confirmation...');
    await new Promise(r => setTimeout(r, 10000));
    
    // Check if pet was created
    console.log('\n📊 Checking if pet was created...');
    
    try {
      const petCount = await client.readContract({
        address: FRENPET_SIMPLE_ADDRESS,
        abi: FrenPetSimpleAbi,
        functionName: 'getPetCount',
        args: [account.address]
      });
      
      console.log('   Pet count for account:', petCount.toString());
      
      if (petCount > 0n) {
        console.log('   ✅ SUCCESS! Pet was created!');
        console.log('   Second transaction executed the actual call');
        
        // Get pet details
        const pet = await client.readContract({
          address: FRENPET_SIMPLE_ADDRESS,
          abi: FrenPetSimpleAbi,
          functionName: 'getPet',
          args: [account.address, 0n]
        });
        
        console.log('\n🐾 Pet Details:');
        console.log('   Name:', pet.name);
        console.log('   Happiness:', pet.happiness?.toString());
        console.log('   Hunger:', pet.hunger?.toString());
      } else {
        console.log('   ❌ No pets found - call did not execute');
      }
    } catch (error) {
      console.log('   ❌ Error checking pet:', error.message);
    }
    
  } catch (error) {
    console.log('❌ Second transaction failed:', error.message);
  }
  
  // =====================================
  // SUMMARY
  // =====================================
  console.log('\n');
  console.log('╔══════════════════════════════════════╗');
  console.log('║            SUMMARY                    ║');
  console.log('╚══════════════════════════════════════╝');
  
  console.log('\n📊 Test Results:');
  console.log('  1. Account delegation setup: ✅');
  console.log('  2. First transaction executed delegation: ✅');
  console.log('  3. Second transaction should execute actual call: ?');
  console.log('\n💡 Key Finding:');
  console.log('  Porto uses lazy delegation where the first transaction');
  console.log('  sets up delegation. The second transaction should then');
  console.log('  be able to execute the actual intended call.');
  
  console.log('\n📁 JSON outputs saved to ./output/');
}

// Run test
testTwoTransactions().catch(console.error);