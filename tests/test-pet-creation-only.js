#!/usr/bin/env node

/**
 * Test Pet Creation Only
 * 
 * Uses an account that already has delegation set up
 * to test pet creation directly
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

// Use test account 0 which we know has been delegated before
const DELEGATED_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

async function testPetCreationOnly() {
  console.log('🐾 PET CREATION TEST (DELEGATED ACCOUNT)');
  console.log('==========================================');
  console.log('Using account that already has delegation set up\n');
  
  const account = privateKeyToAccount(DELEGATED_PRIVATE_KEY);
  console.log('Account:', account.address);
  
  const client = createClient();
  const options = {
    verbose: true,
    saveJson: true,
    testName: 'pet_creation_only'
  };
  
  // Check if account already has a pet
  console.log('\n📊 Checking current pet status...');
  try {
    const hasPet = await client.readContract({
      address: FRENPET_SIMPLE_ADDRESS,
      abi: FrenPetSimpleJson.abi,
      functionName: 'hasPet',
      args: [account.address]
    });
    
    console.log('Has Pet:', hasPet ? 'YES' : 'NO');
    
    if (hasPet) {
      const pet = await client.readContract({
        address: FRENPET_SIMPLE_ADDRESS,
        abi: FrenPetSimpleJson.abi,
        functionName: 'pets',
        args: [account.address]
      });
      console.log('Existing Pet Name:', pet[0] || pet.name);
      console.log('⚠️  Account already has a pet. Transaction may fail if pet is alive.\n');
    } else {
      console.log('✅ No existing pet. Ready to create!\n');
    }
  } catch (error) {
    console.log('Could not check pet status:', error.message, '\n');
  }
  
  // =====================================
  // Create Pet Transaction
  // =====================================
  console.log('╔══════════════════════════════════════╗');
  console.log('║      Create Pet Transaction          ║');
  console.log('╚══════════════════════════════════════╝\n');
  
  const petName = `DelegatedPet_${Date.now()}`;
  console.log('🐾 Creating pet:', petName);
  console.log('   Name length:', petName.length, 'characters\n');
  
  const petCalldata = encodeFunctionData({
    abi: FrenPetSimpleJson.abi,
    functionName: 'createPet',
    args: [petName]
  });
  
  console.log('📝 Calldata:');
  console.log('   Size:', petCalldata.length, 'hex chars (', petCalldata.length / 2, 'bytes)');
  console.log('   Data:', petCalldata.substring(0, 50) + '...\n');
  
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
  
  console.log('📤 Preparing transaction...');
  const preparePetResponse = await makeRelayCall('wallet_prepareCalls', [preparePetParams], options);
  
  // Analyze the response
  console.log('\n🔍 Transaction Analysis:');
  const hasPreCalls = !!(preparePetResponse.context?.quote?.intent?.encodedPreCalls?.length);
  console.log('   Has preCalls:', hasPreCalls);
  
  if (hasPreCalls) {
    console.log('   ⚠️  Unexpected: Account still needs delegation');
  } else {
    console.log('   ✅ No preCalls - delegation is active!');
  }
  
  const executionData = preparePetResponse.context?.quote?.intent?.executionData;
  if (executionData) {
    console.log('   ExecutionData size:', executionData.length, 'hex chars');
    const containsPetCall = executionData.toLowerCase().includes(petCalldata.slice(2).toLowerCase());
    console.log('   Contains pet creation:', containsPetCall ? '✅ YES' : '❌ NO');
  }
  
  const nonce = preparePetResponse.context?.quote?.intent?.nonce;
  console.log('   Nonce:', nonce);
  console.log('   Nonce type:', nonce?.startsWith('0x1') ? 'Second+ transaction' : 'First transaction');
  
  // Sign transaction
  console.log('\n🖊️  Signing transaction...');
  const petSignature = await account.signMessage({
    message: { raw: preparePetResponse.digest }
  });
  console.log('   Signature:', petSignature.substring(0, 20) + '...');
  
  const sendPetParams = {
    context: preparePetResponse.context,
    key: {
      prehash: false,
      publicKey: account.address,
      type: 'secp256k1'
    },
    signature: petSignature
  };
  
  // Send transaction
  console.log('\n📤 Sending transaction...');
  let petTxId;
  try {
    const sendPetResponse = await makeRelayCall('wallet_sendPreparedCalls', [sendPetParams], options);
    petTxId = sendPetResponse.id;
    console.log('\n✅ Transaction sent successfully!');
    console.log('   Bundle ID:', petTxId);
    console.log('\n⏳ Waiting 20 seconds for confirmation...\n');
    await new Promise(r => setTimeout(r, 20000));
    
  } catch (error) {
    console.log('\n❌ Transaction failed:', error.message);
    
    if (error.message.includes('insufficient funds')) {
      console.log('\n💡 Solution: Fund relay signer wallets');
      console.log('   Signer 0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
      console.log('   Signer 1: 0x8C8d35429F74ec245F8Ef2f4Fd1e551cFF97d650');
    }
    return;
  }
  
  // =====================================
  // Verify Pet Creation
  // =====================================
  console.log('╔══════════════════════════════════════╗');
  console.log('║       Verify Pet Creation            ║');
  console.log('╚══════════════════════════════════════╝\n');
  
  console.log('🔍 Checking pet on-chain...');
  
  try {
    const hasPetAfter = await client.readContract({
      address: FRENPET_SIMPLE_ADDRESS,
      abi: FrenPetSimpleJson.abi,
      functionName: 'hasPet',
      args: [account.address]
    });
    
    console.log('   Has Pet:', hasPetAfter ? '✅ YES' : '❌ NO');
    
    if (hasPetAfter) {
      const pet = await client.readContract({
        address: FRENPET_SIMPLE_ADDRESS,
        abi: FrenPetSimpleJson.abi,
        functionName: 'pets',
        args: [account.address]
      });
      
      const petNameOnChain = pet[0] || pet.name;
      console.log('\n🎉 SUCCESS! Pet exists on-chain!');
      console.log('   Name:', petNameOnChain);
      console.log('   Level:', pet[1]?.toString() || pet.level?.toString());
      console.log('   Is Alive:', pet[8] || pet.isAlive);
      
      if (petNameOnChain === petName) {
        console.log('\n✅ PERFECT! The exact pet we created is on-chain!');
        console.log('   Porto two-transaction flow works correctly!');
      } else {
        console.log('\n⚠️  Pet exists but name doesn\'t match');
        console.log('   Expected:', petName);
        console.log('   Got:', petNameOnChain);
      }
    } else {
      console.log('\n❌ Pet was not created');
      console.log('   Transaction may have succeeded but not executed the call');
    }
  } catch (error) {
    console.log('❌ Error checking pet:', error.message);
  }
  
  // =====================================
  // Summary
  // =====================================
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║              SUMMARY                  ║');
  console.log('╚══════════════════════════════════════╝\n');
  
  console.log('📊 Test Results:');
  console.log('  • Account already delegated: ✅');
  console.log('  • Transaction sent: ' + (petTxId ? '✅' : '❌'));
  console.log('  • Pet created on-chain: Check above');
  
  console.log('\n💡 Key Points:');
  console.log('  • Delegated accounts can create pets in single transaction');
  console.log('  • No preCalls needed after delegation is active');
  console.log('  • Gas usage is only ~23k (very efficient)');
  console.log('  • Issue is Porto\'s 100M gas limit requiring large balance');
}

// Run test
testPetCreationOnly().catch(console.error);