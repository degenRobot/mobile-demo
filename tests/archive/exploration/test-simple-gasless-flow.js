#!/usr/bin/env node

/**
 * Simple gasless flow test - pet creation only
 * Uses an account that already has delegation setup
 */

import { privateKeyToAccount } from 'viem/accounts';
import { encodeFunctionData } from 'viem';
import { CONFIG, makeRelayCall, createClient } from './lib/porto-utils-enhanced.js';
import FrenPetSimpleJson from '../contracts/out/FrenPetSimple.sol/FrenPetSimple.json' with { type: 'json' };

const FRENPET_SIMPLE_ADDRESS = '0x3fde139a94eef14c4eba229fdc80a54f7f5fbf25';
const ETH_ADDRESS = '0x0000000000000000000000000000000000000000';

// Use the account from our previous successful test
const EXISTING_MAIN_KEY = '0xd4697fb44e9ebe7c46f2a31e3bc2c1e52c3bb8e8b1a8f9d32f1a2e3d4b5c6d7e';
const EXISTING_SESSION_KEY = '0xe5798gc55f0fcf8d57g3b42f4cd3d2f63d4cc9f9c2b9g0e43g2b3f4e5c6d7e8f';

async function testSimpleGaslessFlow() {
  console.log('🚀 SIMPLE GASLESS FLOW TEST');
  console.log('=' .repeat(60));
  console.log('Testing pet creation with account that has delegation setup');
  console.log('=' .repeat(60));
  
  // Use existing accounts from successful test
  const mainAccount = privateKeyToAccount(EXISTING_MAIN_KEY);
  const sessionAccount = privateKeyToAccount(EXISTING_SESSION_KEY);
  
  console.log('\n🔑 Using Existing Accounts:');
  console.log('  Main EOA:', mainAccount.address);
  console.log('  Session Key:', sessionAccount.address);
  
  // Check balances
  const client = createClient();
  const mainBalance = await client.getBalance({ address: mainAccount.address });
  const sessionBalance = await client.getBalance({ address: sessionAccount.address });
  
  console.log('\n💰 Initial Balances:');
  console.log('  Main EOA:', mainBalance.toString(), 'wei');
  console.log('  Session Key:', sessionBalance.toString(), 'wei');
  
  // =====================================
  // Create Pet (No delegation needed)
  // =====================================
  console.log('\n' + '=' .repeat(60));
  console.log('CREATE PET TRANSACTION');
  console.log('=' .repeat(60));
  
  const petName = `SimpleGaslessPet_${Date.now()}`;
  console.log('🐾 Creating pet:', petName);
  
  const petCalldata = encodeFunctionData({
    abi: FrenPetSimpleJson.abi,
    functionName: 'createPet',
    args: [petName]
  });
  
  // Test with different capability configurations
  const configs = [
    {
      name: 'Config 1: Just meta',
      capabilities: { meta: {} }
    },
    {
      name: 'Config 2: Meta with feeToken',
      capabilities: { meta: { feeToken: ETH_ADDRESS } }
    },
    {
      name: 'Config 3: Meta with feeToken and feePayer',
      capabilities: { 
        meta: { 
          feeToken: ETH_ADDRESS,
          feePayer: mainAccount.address
        }
      }
    }
  ];
  
  for (const config of configs) {
    console.log(`\n🧪 Testing ${config.name}...`);
    
    const petParams = {
      from: mainAccount.address,
      chainId: CONFIG.CHAIN_ID,
      calls: [{
        to: FRENPET_SIMPLE_ADDRESS,
        value: '0x0',
        data: petCalldata
      }],
      capabilities: config.capabilities
    };
    
    try {
      console.log('📤 Preparing pet creation...');
      const preparePetResponse = await makeRelayCall('wallet_prepareCalls', [petParams]);
      
      // Check if there are preCalls
      const hasPreCalls = !!(preparePetResponse.context?.quote?.intent?.encodedPreCalls?.length);
      console.log('  Has preCalls:', hasPreCalls ? 'YES' : 'NO');
      
      if (hasPreCalls) {
        console.log('  ⚠️ Unexpected preCalls detected - delegation might not be setup');
        console.log('  PreCalls:', preparePetResponse.context.quote.intent.encodedPreCalls);
      }
      
      const petSignature = await sessionAccount.signMessage({
        message: { raw: preparePetResponse.digest }
      });
      
      console.log('📤 Sending pet creation...');
      const sendPetResponse = await makeRelayCall('wallet_sendPreparedCalls', [{
        context: preparePetResponse.context,
        key: {
          prehash: false,
          publicKey: sessionAccount.address,
          type: 'secp256k1'
        },
        signature: petSignature
      }]);
      
      console.log('  ✅ SUCCESS! Bundle ID:', sendPetResponse.id);
      console.log('  View: https://sepolia.basescan.org/tx/' + sendPetResponse.id);
      
      // Wait for confirmation
      console.log('  ⏳ Waiting 15 seconds...');
      await new Promise(r => setTimeout(r, 15000));
      
      // Check final balances
      const finalMainBalance = await client.getBalance({ address: mainAccount.address });
      const finalSessionBalance = await client.getBalance({ address: sessionAccount.address });
      
      console.log('\n💰 Final Balances:');
      console.log('  Main EOA:', finalMainBalance.toString(), 'wei');
      console.log('  Session Key:', finalSessionBalance.toString(), 'wei');
      
      if (finalMainBalance === mainBalance && finalSessionBalance === sessionBalance) {
        console.log('  ✅ No ETH spent - truly gasless!');
      }
      
      break; // Success, no need to try other configs
      
    } catch (error) {
      console.log('  ❌ FAILED:', error.message);
      
      if (error.message.includes('insufficient funds')) {
        const match = error.message.match(/have (\d+) want (\d+)/);
        if (match) {
          const shortfall = BigInt(match[2]) - BigInt(match[1]);
          console.log('  Gas shortfall:', (Number(shortfall) / 1e18).toFixed(18), 'ETH');
        }
      }
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('✨ TEST COMPLETE');
  console.log('=' .repeat(60));
}

// Run test
testSimpleGaslessFlow().catch(console.error);