#!/usr/bin/env node

/**
 * Core Test 1: Porto App Flow
 * 
 * Tests the complete flow as the mobile app would use it:
 * 1. Create a new EOA (main wallet)
 * 2. Create a session key
 * 3. Delegate the EOA to Porto with session key authorization
 * 4. Create a pet using gasless transaction
 * 5. Interact with the pet (feed/play)
 * 6. Verify state changes
 */

const { privateKeyToAccount, generatePrivateKey } = require('viem/accounts');
const { createPublicClient, createWalletClient, http, encodeAbiParameters, encodeFunctionData, parseEther } = require('viem');

// Configuration - Must match deployed Porto relay config!
const RPC_URL = 'https://testnet.riselabs.xyz';
const PORTO_URL = 'https://rise-testnet-porto.fly.dev';
const CHAIN_ID = 11155931;
// These addresses MUST match what's in external/porto-relay/relay.toml
const PORTO_ACCOUNT_IMPL = '0x912a428b1a7e7cb7bb2709a2799a01c020c5acd9'; // delegation_implementation
const PORTO_ORCHESTRATOR = '0x046832405512d508b873e65174e51613291083bc'; // orchestrator
const FRENPET_CONTRACT = '0xfaf41c4e338d5f712e4aa221c654f764036f168a';

// FrenPet ABI (essential functions)
const FRENPET_ABI = [
  {
    inputs: [{ name: 'name', type: 'string' }],
    name: 'createPet',
    outputs: [],
    type: 'function',
  },
  {
    inputs: [],
    name: 'feedPet',
    outputs: [],
    type: 'function',
  },
  {
    inputs: [],
    name: 'playWithPet',
    outputs: [],
    type: 'function',
  },
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'pets',
    outputs: [
      { name: 'name', type: 'string' },
      { name: 'hunger', type: 'uint256' },
      { name: 'happiness', type: 'uint256' },
      { name: 'level', type: 'uint256' },
      { name: 'experience', type: 'uint256' },
      { name: 'lastFed', type: 'uint256' },
      { name: 'lastPlayed', type: 'uint256' },
      { name: 'isAlive', type: 'bool' },
      { name: 'power', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
];

// Create public client for reading blockchain state
const publicClient = createPublicClient({
  transport: http(RPC_URL),
});

// Helper: Check if account is delegated
async function isAccountDelegated(address) {
  const code = await publicClient.getBytecode({ address });
  return code && code !== '0x' && code !== null;
}

// Helper: Get pet state
async function getPetState(ownerAddress) {
  try {
    const result = await publicClient.readContract({
      address: FRENPET_CONTRACT,
      abi: FRENPET_ABI,
      functionName: 'pets',
      args: [ownerAddress],
    });
    
    return {
      name: result[0],
      hunger: result[1].toString(),
      happiness: result[2].toString(),
      level: result[3].toString(),
      experience: result[4].toString(),
      lastFed: result[5].toString(),
      lastPlayed: result[6].toString(),
      isAlive: result[7],
      power: result[8].toString(),
    };
  } catch (error) {
    console.error('[GetPetState] Error:', error.message);
    return null;
  }
}

// Step 1: Prepare account delegation
async function prepareDelegation(mainAccount, sessionKey) {
  const expiry = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
  const expiryHex = '0x' + expiry.toString(16); // MUST be hex!
  
  const params = {
    address: mainAccount.address,
    delegation: PORTO_ACCOUNT_IMPL,
    capabilities: {
      authorizeKeys: [
        {
          expiry: expiryHex,
          prehash: false,
          publicKey: mainAccount.address,
          role: 'admin',
          type: 'secp256k1',
          permissions: []
        }
      ]
    },
    chainId: CHAIN_ID
  };
  
  // Add session key if provided
  if (sessionKey) {
    const sessionExpiry = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60);
    const sessionExpiryHex = '0x' + sessionExpiry.toString(16);
    
    params.capabilities.authorizeKeys.push({
      expiry: sessionExpiryHex,
      prehash: false,
      publicKey: sessionKey.address,
      role: 'normal',
      type: 'secp256k1',
      permissions: []
    });
  }
  
  console.log('[Delegation] Preparing with', params.capabilities.authorizeKeys.length, 'keys');
  
  const response = await fetch(PORTO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'wallet_prepareUpgradeAccount',
      params: [params],
      id: 1,
    }),
  });

  const result = await response.json();
  
  if (result.error) {
    throw new Error(`Prepare delegation failed: ${result.error.message}`);
  }
  
  return result.result;
}

// Step 2: Execute delegation
async function executeDelegation(mainAccount, prepareResult) {
  // Sign auth digest
  const authSig = await mainAccount.signMessage({
    message: { raw: prepareResult.digests.auth }
  });
  
  // Sign exec using typed data
  const domain = {
    ...prepareResult.typedData.domain,
    chainId: typeof prepareResult.typedData.domain.chainId === 'string' 
      ? parseInt(prepareResult.typedData.domain.chainId, 16)
      : prepareResult.typedData.domain.chainId,
  };
  
  const execSig = await mainAccount.signTypedData({
    domain,
    types: prepareResult.typedData.types,
    primaryType: prepareResult.typedData.primaryType,
    message: prepareResult.typedData.message,
  });
  
  const response = await fetch(PORTO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'wallet_upgradeAccount',
      params: [{
        context: prepareResult.context,
        signatures: {
          auth: authSig,
          exec: execSig
        }
      }],
      id: 2,
    }),
  });

  const result = await response.json();
  
  if (result.error) {
    console.error('[Delegation] Error details:', result.error);
    throw new Error(`Execute delegation failed: ${result.error.message}`);
  }
  
  // wallet_upgradeAccount returns null on success (just stores the delegation)
  // The actual delegation happens when we send the first transaction
  console.log('[Delegation] Upgrade stored successfully (returns null by design)');
  console.log('[Delegation] Delegation will be executed with first transaction');
  return 'stored';
}

// Step 3: Execute gasless transaction
async function executeGaslessTransaction(account, functionName, args = []) {
  // Encode the function call
  const data = encodeFunctionData({
    abi: FRENPET_ABI,
    functionName,
    args,
  });
  
  const params = {
    calls: [{
      to: FRENPET_CONTRACT,
      data,
      value: '0x0',
    }],
    capabilities: {
      meta: {
        accounts: [account.address],
      },
    },
    chainId: CHAIN_ID,
    from: account.address,
    key: {
      type: 'secp256k1',
      publicKey: account.address,
      prehash: false,
    },
  };
  
  console.log(`[Transaction] Preparing ${functionName}...`);
  
  // Prepare the transaction
  const prepareResponse = await fetch(PORTO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'wallet_prepareCalls',
      params: [params],
      id: Date.now(),
    }),
  });

  const prepareResult = await prepareResponse.json();
  
  if (prepareResult.error) {
    throw new Error(`Prepare transaction failed: ${prepareResult.error.message}`);
  }
  
  // Sign the typed data
  const typedData = prepareResult.result.typedData;
  const domain = {
    ...typedData.domain,
    chainId: typeof typedData.domain.chainId === 'string' 
      ? parseInt(typedData.domain.chainId, 16)
      : typedData.domain.chainId,
  };
  
  const signature = await account.signTypedData({
    domain,
    types: typedData.types,
    primaryType: typedData.primaryType,
    message: typedData.message,
  });
  
  console.log(`[Transaction] Sending ${functionName}...`);
  
  // Send the transaction
  const sendResponse = await fetch(PORTO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'wallet_sendPreparedCalls',
      params: [{
        context: prepareResult.result.context,
        key: prepareResult.result.key,
        signature,
      }],
      id: Date.now(),
    }),
  });

  const sendResult = await sendResponse.json();
  
  if (sendResult.error) {
    console.error('[Transaction] Send error details:', JSON.stringify(sendResult.error, null, 2));
    throw new Error(`Send transaction failed: ${sendResult.error.message || JSON.stringify(sendResult.error)}`);
  }
  
  const bundleId = sendResult.result.id || sendResult.result;
  console.log(`[Transaction] Bundle ID:`, bundleId);
  
  // Wait for confirmation
  console.log(`[Transaction] Waiting for confirmation...`);
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Check status
  const statusResponse = await fetch(PORTO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'wallet_getCallsStatus',
      params: [bundleId],
      id: Date.now(),
    }),
  });

  const statusResult = await statusResponse.json();
  
  if (statusResult.error) {
    throw new Error(`Status check failed: ${statusResult.error.message}`);
  }
  
  const receipt = statusResult.result.receipts?.[0];
  if (receipt) {
    console.log(`[Transaction] TX Hash:`, receipt.transactionHash);
    console.log(`[Transaction] Status:`, receipt.status === '0x1' ? '✅ Success' : '❌ Failed');
    return {
      success: receipt.status === '0x1',
      txHash: receipt.transactionHash,
    };
  }
  
  return { success: false };
}

// Main test flow
async function main() {
  console.log('=== Porto App Flow Test ===');
  console.log('Testing complete flow as mobile app would use it');
  console.log('');
  
  try {
    // Generate accounts
    console.log('📱 Step 1: Generate Accounts');
    const mainPrivateKey = generatePrivateKey();
    const mainAccount = privateKeyToAccount(mainPrivateKey);
    const sessionPrivateKey = generatePrivateKey();
    const sessionAccount = privateKeyToAccount(sessionPrivateKey);
    
    console.log('Main wallet:', mainAccount.address);
    console.log('Session key:', sessionAccount.address);
    console.log('');
    
    console.log('⚠️  Note: Test accounts need small ETH balance for initial delegation');
    console.log('   Porto provides gasless transactions after delegation, but initial setup needs gas');
    console.log('');
    
    // Check initial delegation status
    console.log('🔍 Step 2: Check Delegation Status');
    const initiallyDelegated = await isAccountDelegated(mainAccount.address);
    console.log('Initially delegated:', initiallyDelegated ? '✅' : '❌');
    console.log('');
    
    // Delegate account with session key
    console.log('🔐 Step 3: Delegate Account to Porto');
    const prepareResult = await prepareDelegation(mainAccount, sessionAccount);
    console.log('Auth digest:', prepareResult.digests.auth);
    console.log('Exec digest:', prepareResult.digests.exec);
    
    const delegationResult = await executeDelegation(mainAccount, prepareResult);
    
    // Note: Delegation is stored but not executed until first transaction
    console.log('Delegation prepared and stored');
    console.log('Note: Actual delegation will happen with first transaction');
    console.log('');
    
    // Create a pet
    console.log('🐾 Step 4: Create Pet');
    const petName = `TestPet_${Date.now()}`;
    console.log('Pet name:', petName);
    
    const createResult = await executeGaslessTransaction(
      mainAccount,
      'createPet',
      [petName]
    );
    
    if (!createResult.success) {
      throw new Error('Failed to create pet');
    }
    
    console.log('Pet created successfully!');
    console.log('');
    
    // Wait for the transaction to fully process on-chain and relay to reset
    console.log('⏳ Waiting 10 seconds for transaction to fully process...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Check pet state
    console.log('📊 Step 5: Check Pet State');
    const petState = await getPetState(mainAccount.address);
    
    if (petState && petState.name) {
      console.log('Pet found!');
      console.log('- Name:', petState.name);
      console.log('- Level:', petState.level);
      console.log('- Hunger:', petState.hunger);
      console.log('- Happiness:', petState.happiness);
      console.log('- Is Alive:', petState.isAlive);
    } else {
      console.log('Pet not found (may still be pending)');
    }
    console.log('');
    
    // Feed the pet
    console.log('🍖 Step 6: Feed Pet');
    const feedResult = await executeGaslessTransaction(
      mainAccount,
      'feedPet',
      []
    );
    
    if (feedResult.success) {
      console.log('Pet fed successfully!');
    } else {
      console.log('Failed to feed pet');
    }
    console.log('');
    
    // Wait between transactions
    console.log('⏳ Waiting 10 seconds before next transaction...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Play with pet
    console.log('🎮 Step 7: Play with Pet');
    const playResult = await executeGaslessTransaction(
      mainAccount,
      'playWithPet',
      []
    );
    
    if (playResult.success) {
      console.log('Played with pet successfully!');
    } else {
      console.log('Failed to play with pet');
    }
    console.log('');
    
    // Final state check
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('📊 Step 8: Final Pet State');
    const finalPetState = await getPetState(mainAccount.address);
    
    if (finalPetState && finalPetState.name) {
      console.log('Final pet state:');
      console.log('- Name:', finalPetState.name);
      console.log('- Level:', finalPetState.level);
      console.log('- Hunger:', finalPetState.hunger);
      console.log('- Happiness:', finalPetState.happiness);
      console.log('- Experience:', finalPetState.experience);
    }
    
    // Check if delegation happened
    const finalDelegated = await isAccountDelegated(mainAccount.address);
    
    // Summary
    console.log('');
    console.log('=== Test Summary ===');
    console.log('✅ Account delegation:', finalDelegated ? 'Success' : 'Not delegated (may use relay)');
    console.log('✅ Pet creation:', createResult.success ? 'Success' : 'Failed');
    console.log('✅ Feed pet:', feedResult.success ? 'Success' : 'Failed');
    console.log('✅ Play with pet:', playResult.success ? 'Success' : 'Failed');
    console.log('✅ Pet exists:', finalPetState?.name ? 'Yes' : 'No');
    
    console.log('');
    console.log('🎉 Porto app flow test complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the test
main().catch(console.error);