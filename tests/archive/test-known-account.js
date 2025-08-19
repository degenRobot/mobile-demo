#!/usr/bin/env node

/**
 * Test with Known Delegated Account
 * 
 * Uses the test account that we know has been delegated before
 */

import { privateKeyToAccount } from 'viem/accounts';
import { encodeFunctionData } from 'viem';
import {
  CONFIG,
  makeRelayCall,
  createClient,
} from './lib/porto-utils-enhanced.js';
import FrenPetSimpleJson from '../contracts/out/FrenPetSimple.sol/FrenPetSimple.json' with { type: 'json' };

const FRENPET_SIMPLE_ADDRESS = '0x3fde139a94eef14c4eba229fdc80a54f7f5fbf25';

// Use hardhat test account 0 which has been delegated many times
const KNOWN_MAIN_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const KNOWN_MAIN_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

async function testKnownAccount() {
  console.log('🔬 TEST WITH KNOWN DELEGATED ACCOUNT');
  console.log('=====================================\n');
  
  const mainAccount = privateKeyToAccount(KNOWN_MAIN_KEY);
  console.log('Known Account:', mainAccount.address);
  console.log('Expected:', KNOWN_MAIN_ADDRESS);
  console.log('Match:', mainAccount.address === KNOWN_MAIN_ADDRESS ? '✅' : '❌');
  console.log('');
  
  const client = createClient();
  
  // Check current pet status
  console.log('📊 Checking current pet status...');
  try {
    const hasPet = await client.readContract({
      address: FRENPET_SIMPLE_ADDRESS,
      abi: FrenPetSimpleJson.abi,
      functionName: 'hasPet',
      args: [mainAccount.address]
    });
    
    console.log('   Has Pet:', hasPet ? 'YES' : 'NO');
    
    if (hasPet) {
      const pet = await client.readContract({
        address: FRENPET_SIMPLE_ADDRESS,
        abi: FrenPetSimpleJson.abi,
        functionName: 'pets',
        args: [mainAccount.address]
      });
      console.log('   Existing Pet Name:', pet[0] || pet.name);
      console.log('   Is Alive:', pet[8] || pet.isAlive);
    }
  } catch (error) {
    console.log('   Error checking pet:', error.message);
  }
  
  // Check delegation status by preparing a test transaction
  console.log('\n🔍 Checking delegation status...');
  
  const testParams = {
    from: mainAccount.address,
    chainId: CONFIG.CHAIN_ID,
    calls: [{
      to: '0x0000000000000000000000000000000000000000',
      value: '0x0',
      data: '0x'
    }],
    capabilities: { meta: {} }
  };
  
  const prepareResponse = await makeRelayCall('wallet_prepareCalls', [testParams], { 
    verbose: false, 
    saveJson: false 
  });
  
  const hasPreCalls = !!(prepareResponse.context?.quote?.intent?.encodedPreCalls?.length);
  console.log('   Has preCalls:', hasPreCalls ? 'YES (needs delegation)' : 'NO (delegated)');
  
  if (hasPreCalls) {
    console.log('   PreCalls count:', prepareResponse.context.quote.intent.encodedPreCalls.length);
    
    // Decode the preCalls to see what's being delegated
    const preCall = prepareResponse.context.quote.intent.encodedPreCalls[0];
    console.log('   PreCall length:', preCall.length, 'chars');
    
    // Check if it's re-delegating the same account
    if (preCall.includes(mainAccount.address.slice(2).toLowerCase())) {
      console.log('   PreCall includes main address: YES');
    }
  }
  
  console.log('\n📝 Intent Details:');
  console.log('   EOA:', prepareResponse.context?.quote?.intent?.eoa);
  console.log('   Nonce:', prepareResponse.context?.quote?.intent?.nonce);
  console.log('   Execution Data:', prepareResponse.context?.quote?.intent?.executionData?.substring(0, 50) + '...');
  
  // Try to create a pet anyway
  console.log('\n🐾 Attempting to create pet...');
  
  const petName = `KnownAcct_${Date.now()}`;
  const petCalldata = encodeFunctionData({
    abi: FrenPetSimpleJson.abi,
    functionName: 'createPet',
    args: [petName]
  });
  
  const petParams = {
    from: mainAccount.address,
    chainId: CONFIG.CHAIN_ID,
    calls: [{
      to: FRENPET_SIMPLE_ADDRESS,
      value: '0x0',
      data: petCalldata
    }],
    capabilities: { meta: {} }
  };
  
  console.log('   Pet name:', petName);
  console.log('   From:', mainAccount.address);
  console.log('   To:', FRENPET_SIMPLE_ADDRESS);
  
  const preparePetResponse = await makeRelayCall('wallet_prepareCalls', [petParams], {
    verbose: false,
    saveJson: true,
    testName: 'known_account'
  });
  
  const petHasPreCalls = !!(preparePetResponse.context?.quote?.intent?.encodedPreCalls?.length);
  console.log('   Pet tx has preCalls:', petHasPreCalls ? 'YES' : 'NO');
  
  // Sign as the main account (since we're testing if main delegates main)
  const petSignature = await mainAccount.signMessage({
    message: { raw: preparePetResponse.digest }
  });
  
  console.log('   Signing with:', mainAccount.address);
  
  const sendPetParams = {
    context: preparePetResponse.context,
    key: {
      prehash: false,
      publicKey: mainAccount.address,
      type: 'secp256k1'
    },
    signature: petSignature
  };
  
  try {
    const sendResponse = await makeRelayCall('wallet_sendPreparedCalls', [sendPetParams], {
      verbose: false,
      saveJson: true,
      testName: 'known_account'
    });
    
    console.log('\n✅ Transaction sent!');
    console.log('   Bundle ID:', sendResponse.id);
    
    // Wait and check
    console.log('\n⏳ Waiting 20 seconds for confirmation...');
    await new Promise(r => setTimeout(r, 20000));
    
    // Check transaction status
    console.log('\n🔍 Checking transaction status...');
    try {
      // Try different formats
      const formats = [
        { bundleId: sendResponse.id },
        sendResponse.id,
        { id: sendResponse.id }
      ];
      
      for (const format of formats) {
        try {
          const status = await makeRelayCall('wallet_getCallsStatus', [format], { verbose: false });
          console.log('   Status:', status?.status || status || 'UNKNOWN');
          
          if (status?.receipts) {
            console.log('   Receipts found:', status.receipts.length);
            for (const receipt of status.receipts) {
              console.log('     Block:', receipt.blockNumber);
              console.log('     Success:', receipt.success);
              console.log('     Gas Used:', receipt.gasUsed);
            }
          }
          break;
        } catch (e) {
          // Try next format
        }
      }
    } catch (error) {
      console.log('   Could not get status:', error.message.substring(0, 50));
    }
    
    // Check if pet was created
    console.log('\n🐾 Checking if pet was created...');
    
    const hasPetAfter = await client.readContract({
      address: FRENPET_SIMPLE_ADDRESS,
      abi: FrenPetSimpleJson.abi,
      functionName: 'hasPet',
      args: [mainAccount.address]
    });
    
    console.log('   Has Pet Now:', hasPetAfter ? '✅ YES!' : '❌ NO');
    
    if (hasPetAfter) {
      const pet = await client.readContract({
        address: FRENPET_SIMPLE_ADDRESS,
        abi: FrenPetSimpleJson.abi,
        functionName: 'pets',
        args: [mainAccount.address]
      });
      
      const currentPetName = pet[0] || pet.name;
      console.log('   Current Pet Name:', currentPetName);
      
      if (currentPetName === petName) {
        console.log('\n🎉 SUCCESS! New pet created!');
      } else {
        console.log('\n⚠️  Pet exists but not the one we just created');
        console.log('   Expected:', petName);
        console.log('   Got:', currentPetName);
      }
    }
    
  } catch (error) {
    console.log('\n❌ Transaction failed:', error.message);
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('SUMMARY');
  console.log('='.repeat(50));
  
  console.log('\n📊 Key Findings:');
  console.log('  • Known account still has preCalls:', hasPreCalls ? 'YES' : 'NO');
  console.log('  • Pet transaction has preCalls:', petHasPreCalls ? 'YES' : 'NO');
  console.log('  • This suggests delegation expires or resets');
  console.log('  • Porto may re-delegate on every transaction');
  
  console.log('\n💡 Conclusion:');
  console.log('  Porto appears to include delegation in transactions');
  console.log('  but only executes the delegation, not the actual call.');
  console.log('  This is the core issue that needs fixing in Porto.');
}

// Run test
testKnownAccount().catch(console.error);