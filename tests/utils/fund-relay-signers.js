#!/usr/bin/env node

/**
 * Fund Relay Signers
 * 
 * Transfers ETH from funded signer to unfunded signers
 */

import { createWalletClient, http, parseEther, formatEther, defineChain } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';

const MNEMONIC = 'test test test test test test test test test test test junk';
const RPC_URL = 'https://testnet.riselabs.xyz';

// Define RISE testnet chain
const riseTestnet = defineChain({
  id: 11155931, // Same chain ID as Sepolia for compatibility
  name: 'RISE Testnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: [RPC_URL] }
  }
});

async function fundRelaySigners() {
  console.log('💰 FUNDING RELAY SIGNERS');
  console.log('========================\n');
  
  // Create accounts from mnemonic (using accountIndex to match Porto relay)
  const signer0 = mnemonicToAccount(MNEMONIC, { accountIndex: 0 });
  const signer1 = mnemonicToAccount(MNEMONIC, { accountIndex: 1 });
  
  console.log('Signer 0:', signer0.address);
  console.log('Signer 1:', signer1.address);
  console.log('');
  
  // Create wallet client for funded signer
  const client = createWalletClient({
    account: signer0,
    chain: riseTestnet,
    transport: http(RPC_URL)
  });
  
  // Check balances
  const publicClient = await import('viem').then(m => m.createPublicClient({
    chain: riseTestnet,
    transport: http(RPC_URL)
  }));
  
  const balance0 = await publicClient.getBalance({ address: signer0.address });
  const balance1 = await publicClient.getBalance({ address: signer1.address });
  
  console.log('Current Balances:');
  console.log('  Signer 0:', formatEther(balance0), 'ETH');
  console.log('  Signer 1:', formatEther(balance1), 'ETH');
  console.log('');
  
  // Check if signer1 needs funding
  const MIN_BALANCE = parseEther('0.1'); // 0.1 ETH minimum
  const TRANSFER_AMOUNT = parseEther('0.5'); // Transfer 0.5 ETH
  
  if (balance1 < MIN_BALANCE) {
    console.log('⚠️  Signer 1 needs funding');
    
    if (balance0 < TRANSFER_AMOUNT) {
      console.log('❌ Signer 0 doesn\'t have enough to transfer');
      console.log('   Needed:', formatEther(TRANSFER_AMOUNT), 'ETH');
      console.log('   Available:', formatEther(balance0), 'ETH');
      return;
    }
    
    console.log('📤 Transferring', formatEther(TRANSFER_AMOUNT), 'ETH to Signer 1...');
    
    try {
      // Send transaction
      const hash = await client.sendTransaction({
        to: signer1.address,
        value: TRANSFER_AMOUNT
      });
      
      console.log('   Transaction hash:', hash);
      console.log('   Waiting for confirmation...');
      
      // Wait for confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      if (receipt.status === 'success') {
        console.log('✅ Transfer successful!');
        
        // Check new balances
        const newBalance0 = await publicClient.getBalance({ address: signer0.address });
        const newBalance1 = await publicClient.getBalance({ address: signer1.address });
        
        console.log('\nNew Balances:');
        console.log('  Signer 0:', formatEther(newBalance0), 'ETH');
        console.log('  Signer 1:', formatEther(newBalance1), 'ETH');
      } else {
        console.log('❌ Transfer failed');
      }
    } catch (error) {
      console.log('❌ Error sending transaction:', error.message);
    }
  } else {
    console.log('✅ Signer 1 already has sufficient funds');
  }
  
  console.log('\n📝 Note: Porto relay rotates between signers');
  console.log('   Both signers need funds for reliable operation');
}

// Run the funding script
fundRelaySigners().catch(console.error);