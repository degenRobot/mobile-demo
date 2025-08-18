#!/usr/bin/env node

/**
 * Test gasless transactions with FrenPetSimple contract
 */

const { privateKeyToAccount, generatePrivateKey } = require('viem/accounts');
const { encodeFunctionData } = require('viem');

const PORTO_URL = 'https://rise-testnet-porto.fly.dev';
const CHAIN_ID = 11155931;
const PORTO_ACCOUNT_IMPL = '0x912a428b1a7e7cb7bb2709a2799a01c020c5acd9';
const FRENPET_SIMPLE_CONTRACT = '0x3FDE139A94eEf14C4eBa229FDC80A54f7F5Fbf25';

// Simple ABI for the non-payable contract
const FRENPET_SIMPLE_ABI = [
  {
    name: 'createPet',
    type: 'function',
    inputs: [{ name: 'name', type: 'string' }],
    outputs: [],
  },
  {
    name: 'feedPet',
    type: 'function',
    inputs: [],
    outputs: [],
  },
  {
    name: 'playWithPet',
    type: 'function',
    inputs: [],
    outputs: [],
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
      { name: 'isAlive', type: 'bool' }
    ],
    stateMutability: 'view',
  },
];

async function testGaslessSimple() {
  console.log('=== Testing Gasless Transactions with FrenPetSimple ===\n');
  console.log('Contract:', FRENPET_SIMPLE_CONTRACT);
  console.log('This contract has NO payable functions\n');
  
  // Generate fresh accounts
  const eoaPrivateKey = generatePrivateKey();
  const eoaAccount = privateKeyToAccount(eoaPrivateKey);
  
  const sessionPrivateKey = generatePrivateKey();
  const sessionAccount = privateKeyToAccount(sessionPrivateKey);
  
  console.log('EOA Address:', eoaAccount.address);
  console.log('Session Key:', sessionAccount.address);
  console.log('Note: EOA needs 0.001 ETH for initial delegation only\n');
  
  // Step 1: Delegate with both keys
  console.log('Step 1: Delegating account to Porto...');
  
  const expiry = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
  const expiryHex = '0x' + expiry.toString(16);
  
  const prepareParams = {
    address: eoaAccount.address,
    delegation: PORTO_ACCOUNT_IMPL,
    capabilities: {
      authorizeKeys: [
        {
          expiry: expiryHex,
          prehash: false,
          publicKey: eoaAccount.address,
          role: 'admin',
          type: 'secp256k1',
          permissions: []
        },
        {
          expiry: expiryHex,
          prehash: false,
          publicKey: sessionAccount.address,
          role: 'normal',
          type: 'secp256k1',
          permissions: []
        }
      ]
    },
    chainId: CHAIN_ID
  };
  
  console.log('Authorizing 2 keys:');
  console.log('- EOA (admin)');
  console.log('- Session key (normal)');
  
  const prepareResponse = await fetch(PORTO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'wallet_prepareUpgradeAccount',
      params: [prepareParams],
      id: 1,
    }),
  });
  
  const prepareResult = await prepareResponse.json();
  if (prepareResult.error) {
    console.error('Prepare failed:', prepareResult.error);
    return;
  }
  
  // Sign with EOA
  const authSig = await eoaAccount.signMessage({
    message: { raw: prepareResult.result.digests.auth }
  });
  
  const domain = {
    ...prepareResult.result.typedData.domain,
    chainId: typeof prepareResult.result.typedData.domain.chainId === 'string' 
      ? parseInt(prepareResult.result.typedData.domain.chainId, 16)
      : prepareResult.result.typedData.domain.chainId,
  };
  
  const execSig = await eoaAccount.signTypedData({
    domain,
    types: prepareResult.result.typedData.types,
    primaryType: prepareResult.result.typedData.primaryType,
    message: prepareResult.result.typedData.message,
  });
  
  // Store delegation
  await fetch(PORTO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'wallet_upgradeAccount',
      params: [{
        context: prepareResult.result.context,
        signatures: {
          auth: authSig,
          exec: execSig
        }
      }],
      id: 2,
    }),
  });
  
  console.log('✅ Delegation stored\n');
  
  // Test transactions
  const transactions = [
    { 
      name: 'createPet', 
      args: ['GaslessTestPet_' + Date.now()], 
      signer: 'EOA',
      description: 'Create pet (first tx includes delegation)'
    },
    { 
      name: 'feedPet', 
      args: [], 
      signer: 'SESSION',
      description: 'Feed pet with session key'
    },
    { 
      name: 'playWithPet', 
      args: [], 
      signer: 'SESSION',
      description: 'Play with pet with session key'
    },
  ];
  
  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    const useSessionKey = tx.signer === 'SESSION';
    const signingAccount = useSessionKey ? sessionAccount : eoaAccount;
    const signingKey = useSessionKey ? sessionAccount.address : eoaAccount.address;
    
    console.log(`Step ${i + 2}: ${tx.description}`);
    console.log(`Function: ${tx.name}`);
    console.log(`Signer: ${tx.signer} (${signingKey.substring(0, 10)}...)`);
    
    const data = encodeFunctionData({
      abi: FRENPET_SIMPLE_ABI,
      functionName: tx.name,
      args: tx.args,
    });
    
    const callParams = {
      calls: [{
        to: FRENPET_SIMPLE_CONTRACT,
        data,
        value: '0x0',  // No value needed!
      }],
      capabilities: {
        meta: {
          accounts: [eoaAccount.address],  // Always the delegated account
        },
      },
      chainId: CHAIN_ID,
      from: eoaAccount.address,  // Always from the delegated account
      key: {
        type: 'secp256k1',
        publicKey: signingKey,  // Key that will sign
        prehash: false,
      },
    };
    
    const callResponse = await fetch(PORTO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'wallet_prepareCalls',
        params: [callParams],
        id: 10 + i,
      }),
    });
    
    const callResult = await callResponse.json();
    if (callResult.error) {
      console.error(`❌ Prepare failed:`, callResult.error);
      continue;
    }
    
    // Sign with appropriate account
    const txDomain = {
      ...callResult.result.typedData.domain,
      chainId: typeof callResult.result.typedData.domain.chainId === 'string' 
        ? parseInt(callResult.result.typedData.domain.chainId, 16)
        : callResult.result.typedData.domain.chainId,
    };
    
    const txSig = await signingAccount.signTypedData({
      domain: txDomain,
      types: callResult.result.typedData.types,
      primaryType: callResult.result.typedData.primaryType,
      message: callResult.result.typedData.message,
    });
    
    // Send
    const sendResponse = await fetch(PORTO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'wallet_sendPreparedCalls',
        params: [{
          context: callResult.result.context,
          key: {
            type: 'secp256k1',
            publicKey: signingKey,
            prehash: false,
          },
          signature: txSig,
        }],
        id: 20 + i,
      }),
    });
    
    const sendResult = await sendResponse.json();
    
    if (sendResult.error) {
      console.error(`❌ Transaction failed:`, sendResult.error.message);
      if (sendResult.error.data?.includes('insufficient funds')) {
        console.error('   -> STILL NEEDS GAS! This should not happen with non-payable functions');
      }
    } else {
      console.log(`✅ Transaction sent: ${sendResult.result.id || sendResult.result}`);
      console.log(`   -> NO GAS REQUIRED (truly gasless!)`);
    }
    
    console.log('');
    
    // Wait between transactions
    if (i < transactions.length - 1) {
      console.log('⏳ Waiting 10 seconds...\n');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
  
  console.log('=== Test Complete ===');
  console.log('\nSummary:');
  console.log('- Contract has NO payable functions');
  console.log('- First tx signed with EOA (includes delegation)');
  console.log('- Subsequent txs signed with session key');
  console.log('- All transactions should be truly gasless');
}

testGaslessSimple().catch(console.error);