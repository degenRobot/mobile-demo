#!/usr/bin/env node

/**
 * Debug Intent Data
 * Check what's actually being sent vs what should be sent
 */

const { encodeFunctionData, parseEther, toHex } = require('viem');

console.log('🔍 Debugging Intent Data');
console.log('========================\n');

const FRENPET_ADDRESS = '0xfaf41c4e338d5f712e4aa221c654f764036f168a';

// Minimal ABI for testing
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
  }
];

console.log('1️⃣ Encoding FrenPet Functions\n');

// Test createPet
const createPetData = encodeFunctionData({
  abi: FRENPET_ABI,
  functionName: 'createPet',
  args: ['Fluffy']
});

console.log('createPet("Fluffy"):');
console.log('  Encoded:', createPetData);
console.log('  Length:', createPetData.length);
console.log('');

// Test feedPet
const feedPetData = encodeFunctionData({
  abi: FRENPET_ABI,
  functionName: 'feedPet',
  args: []
});

console.log('feedPet():');
console.log('  Encoded:', feedPetData);
console.log('  Value: 0.001 RISE =', toHex(parseEther('0.001')));
console.log('');

// Test playWithPet
const playData = encodeFunctionData({
  abi: FRENPET_ABI,
  functionName: 'playWithPet',
  args: []
});

console.log('playWithPet():');
console.log('  Encoded:', playData);
console.log('  Value: 0.0005 RISE =', toHex(parseEther('0.0005')));
console.log('');

console.log('2️⃣ Complete Porto Request Format\n');

// Show complete request format
const completeRequest = {
  calls: [{
    to: FRENPET_ADDRESS,
    data: createPetData,
    value: '0x0'
  }],
  capabilities: {
    meta: {
      accounts: ['0x6999c3aeD0a9241C07CdF2c8fBD38d858476b44f']
    }
  },
  chainId: 11155931,
  from: '0x6999c3aeD0a9241C07CdF2c8fBD38d858476b44f',
  key: {
    type: 'secp256k1',
    publicKey: '0x6999c3aeD0a9241C07CdF2c8fBD38d858476b44f',
    prehash: false
  }
};

console.log('Complete Porto request for createPet:');
console.log(JSON.stringify(completeRequest, null, 2));
console.log('');

console.log('3️⃣ Common Issues\n');

console.log('❌ Wrong value format:');
console.log('  Bad:  value: 0.001');
console.log('  Bad:  value: "0.001"');
console.log('  Good: value: "0x38d7ea4c68000"');
console.log('');

console.log('❌ Wrong data encoding:');
console.log('  Bad:  data: "createPet"');
console.log('  Bad:  data: "0xcreateData"');
console.log('  Good: data: "0x7065cb48..."');
console.log('');

console.log('❌ Wrong account in capabilities:');
console.log('  Bad:  accounts: [sessionKey] when using mainWallet');
console.log('  Good: accounts: [mainWallet] when from: mainWallet');
console.log('');

console.log('4️⃣ Testing with Porto\n');

const PORTO_URL = 'https://rise-testnet-porto.fly.dev';

async function testWithPorto() {
  try {
    const response = await fetch(PORTO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'wallet_prepareCalls',
        params: [completeRequest],
        id: 1
      })
    });

    const result = await response.json();
    
    if (result.error) {
      console.log(`❌ Porto error: ${result.error.message}`);
      if (result.error.data) {
        console.log(`   Details: ${result.error.data}`);
      }
    } else {
      console.log(`✅ Request format is correct!`);
      console.log('   Digest:', result.result.digest);
      
      // Show what Porto expects for signing
      if (result.result.typedData && result.result.typedData.message) {
        console.log('\n   Porto expects to sign:');
        console.log('   - EOA:', result.result.typedData.message.eoa);
        console.log('   - Calls:', result.result.typedData.message.calls);
        console.log('   - Nonce:', result.result.typedData.message.nonce);
      }
    }
  } catch (error) {
    console.log(`❌ Network error: ${error.message}`);
  }
}

testWithPorto().then(() => {
  console.log('\n========================');
  console.log('📋 Checklist for Mobile App:\n');
  console.log('☐ Use viem encodeFunctionData for encoding');
  console.log('☐ Convert ETH values to hex with toHex(parseEther(amount))');
  console.log('☐ Match from address with accounts in capabilities');
  console.log('☐ Use correct chain ID (11155931 for Porto)');
  console.log('☐ Include all required fields in key object');
});