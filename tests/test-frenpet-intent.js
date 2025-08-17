#!/usr/bin/env node

/**
 * Test FrenPet Intent Creation
 * Verify the transaction data is correct
 */

const { encodeFunctionData } = require('viem');

const PORTO_URL = 'https://rise-testnet-porto.fly.dev';
const FRENPET_ADDRESS = '0xfaf41c4e338d5f712e4aa221c654f764036f168a';
const MAIN_WALLET = '0x6999c3aeD0a9241C07CdF2c8fBD38d858476b44f';

// FrenPet ABI (simplified)
const FRENPET_ABI = [
  {
    name: 'createPet',
    type: 'function',
    inputs: [{ name: 'name', type: 'string' }],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    name: 'feedPet',
    type: 'function',
    inputs: [],
    outputs: [],
    stateMutability: 'payable'
  },
  {
    name: 'playWithPet',
    type: 'function',
    inputs: [],
    outputs: [],
    stateMutability: 'payable'
  },
  {
    name: 'getPetStats',
    type: 'function',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [
      { name: 'name', type: 'string' },
      { name: 'level', type: 'uint256' },
      { name: 'experience', type: 'uint256' },
      { name: 'happiness', type: 'uint256' },
      { name: 'hunger', type: 'uint256' },
      { name: 'isAlive', type: 'bool' },
      { name: 'winStreak', type: 'uint256' }
    ],
    stateMutability: 'view'
  }
];

async function testCreatePetIntent() {
  console.log('\n🐾 Testing Create Pet Intent');
  console.log('---');
  
  // Encode createPet function call
  const data = encodeFunctionData({
    abi: FRENPET_ABI,
    functionName: 'createPet',
    args: ['TestPet']
  });
  
  console.log('Function: createPet("TestPet")');
  console.log('Encoded data:', data);
  console.log('');
  
  // Prepare the call for Porto
  const request = {
    calls: [{
      to: FRENPET_ADDRESS,
      data: data,
      value: '0x0'  // No value for createPet
    }],
    capabilities: {
      meta: {
        accounts: [MAIN_WALLET]
      }
    },
    chainId: 11155931,
    from: MAIN_WALLET,
    key: {
      type: 'secp256k1',
      publicKey: MAIN_WALLET,
      prehash: false
    }
  };
  
  console.log('Porto request:', JSON.stringify(request, null, 2));
  
  try {
    const response = await fetch(PORTO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'wallet_prepareCalls',
        params: [request],
        id: 1
      })
    });

    const result = await response.json();
    
    if (result.error) {
      console.log(`❌ Error: ${result.error.message}`);
      if (result.error.data) {
        console.log(`   Details: ${result.error.data}`);
      }
    } else {
      console.log(`✅ Intent prepared successfully!`);
      console.log('Digest:', result.result.digest);
      
      // Show the typed data that would be signed
      if (result.result.typedData) {
        console.log('\nTyped data to sign:');
        console.log('Domain:', result.result.typedData.domain);
        console.log('Message calls:', result.result.typedData.message.calls);
      }
    }
  } catch (error) {
    console.log(`❌ Network error: ${error.message}`);
  }
}

async function testFeedPetIntent() {
  console.log('\n🍎 Testing Feed Pet Intent');
  console.log('---');
  
  // Encode feedPet function call
  const data = encodeFunctionData({
    abi: FRENPET_ABI,
    functionName: 'feedPet',
    args: []
  });
  
  const value = '0x38d7ea4c68000'; // 0.001 RISE in hex
  
  console.log('Function: feedPet()');
  console.log('Encoded data:', data);
  console.log('Value: 0.001 RISE (', value, ')');
  console.log('');
  
  // Prepare the call for Porto
  const request = {
    calls: [{
      to: FRENPET_ADDRESS,
      data: data,
      value: value  // 0.001 RISE for feeding
    }],
    capabilities: {
      meta: {
        accounts: [MAIN_WALLET]
      }
    },
    chainId: 11155931,
    from: MAIN_WALLET,
    key: {
      type: 'secp256k1',
      publicKey: MAIN_WALLET,
      prehash: false
    }
  };
  
  try {
    const response = await fetch(PORTO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'wallet_prepareCalls',
        params: [request],
        id: 2
      })
    });

    const result = await response.json();
    
    if (result.error) {
      console.log(`❌ Error: ${result.error.message}`);
    } else {
      console.log(`✅ Intent prepared successfully!`);
      console.log('Digest:', result.result.digest);
    }
  } catch (error) {
    console.log(`❌ Network error: ${error.message}`);
  }
}

async function main() {
  console.log('🔍 FrenPet Intent Testing');
  console.log('=========================');
  console.log('Contract:', FRENPET_ADDRESS);
  console.log('Main Wallet:', MAIN_WALLET);
  console.log('');
  
  await testCreatePetIntent();
  await testFeedPetIntent();
  
  console.log('\n=========================');
  console.log('📊 Summary:');
  console.log('');
  console.log('If intents prepare successfully, the issue is likely:');
  console.log('1. Wrong wallet being used (session vs main)');
  console.log('2. Account not delegated');
  console.log('3. Signature mismatch');
  console.log('');
  console.log('The app should now use MAIN wallet for Porto.');
}

main().catch(console.error);