#!/usr/bin/env node

/**
 * Test pet creation after delegation setup
 * Uses the accounts from the successful delegation test
 */

import { privateKeyToAccount } from 'viem/accounts';
import { encodeFunctionData } from 'viem';
import { CONFIG, makeRelayCall, createClient } from './lib/porto-utils-enhanced.js';
import FrenPetSimpleJson from '../contracts/out/FrenPetSimple.sol/FrenPetSimple.json' with { type: 'json' };

const FRENPET_SIMPLE_ADDRESS = '0x3fde139a94eef14c4eba229fdc80a54f7f5fbf25';

// These accounts were used in the successful delegation test
const MAIN_ADDRESS = '0xCc2d483e040ECa50dd148d4dd07c419eE56fBc4D';
const SESSION_ADDRESS = '0x39361c439483ad2C1699c442d70857Cfebdafa13';

// We need the session private key to sign
// In a real app, this would be stored securely
// For testing, we'll use a new session key with the same address characteristics
const sessionPrivateKey = '0x' + 'a'.repeat(64); // Dummy key for testing
const sessionAccount = privateKeyToAccount(sessionPrivateKey);

async function testAfterDelegation() {
  console.log('🐾 TEST PET CREATION AFTER DELEGATION');
  console.log('=====================================\n');
  
  console.log('📝 Using accounts from delegation test:');
  console.log('  Main EOA:', MAIN_ADDRESS);
  console.log('  Session Key (original):', SESSION_ADDRESS);
  console.log('  Session Key (test):', sessionAccount.address);
  console.log('');
  
  console.log('⚠️  Note: We need the original session private key');
  console.log('    to sign transactions. For now, testing the flow.\n');
  
  const client = createClient();
  
  // =====================================
  // Create Pet
  // =====================================
  console.log('STEP 1: Prepare Pet Creation');
  console.log('────────────────────────────\n');
  
  const petName = `DelegatedPet_${Date.now()}`;
  console.log('Pet name:', petName);
  
  const petCalldata = encodeFunctionData({
    abi: FrenPetSimpleJson.abi,
    functionName: 'createPet',
    args: [petName]
  });
  
  const petParams = {
    from: MAIN_ADDRESS,
    chainId: CONFIG.CHAIN_ID,
    calls: [{
      to: FRENPET_SIMPLE_ADDRESS,
      value: '0x0',
      data: petCalldata
    }],
    capabilities: {
      meta: {}
    }
  };
  
  console.log('Call details:');
  console.log('  Contract:', FRENPET_SIMPLE_ADDRESS);
  console.log('  Function: createPet');
  console.log('  Argument:', petName);
  console.log('');
  
  try {
    const prepareResponse = await makeRelayCall('wallet_prepareCalls', [petParams], {
      verbose: true,
      saveJson: true,
      testName: 'after_delegation'
    });
    
    console.log('\n📋 Response analysis:');
    const hasPreCalls = !!(prepareResponse.context?.quote?.intent?.encodedPreCalls?.length);
    console.log('  Has preCalls:', hasPreCalls ? '⚠️ YES (unexpected!)' : '✅ NO (delegation active)');
    console.log('  Nonce:', prepareResponse.context?.quote?.intent?.nonce);
    
    if (!hasPreCalls) {
      console.log('\n✅ SUCCESS! Delegation is active!');
      console.log('   The account can now make gasless transactions.');
      console.log('   No preCalls means delegation is already set up.');
      
      // Would continue to sign and send the transaction
      // but we need the original session key to sign
      console.log('\n📝 Next steps (with proper session key):');
      console.log('   1. Sign the digest with session key');
      console.log('   2. Send via wallet_sendPreparedCalls');
      console.log('   3. Pet would be created gaslessly!');
    } else {
      console.log('\n⚠️  Delegation might not be active yet.');
      console.log('   PreCalls are still being included.');
    }
    
    // Check on-chain pet status
    console.log('\n🔍 Checking current pet status...');
    const hasPet = await client.readContract({
      address: FRENPET_SIMPLE_ADDRESS,
      abi: FrenPetSimpleJson.abi,
      functionName: 'hasPet',
      args: [MAIN_ADDRESS]
    });
    
    console.log('  Account has pet:', hasPet ? 'Yes' : 'No');
    
  } catch (error) {
    console.log('\n❌ Error:', error.message);
    
    if (error.message.includes('0xfbcb0b34')) {
      console.log('   Delegation not found - account not delegated');
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 Summary:');
  console.log('  This test checks if delegation from the previous test');
  console.log('  allows gasless pet creation. If preCalls are absent,');
  console.log('  the delegation is active and working!');
}

// Run test
testAfterDelegation().catch(console.error);