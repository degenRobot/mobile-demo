#!/usr/bin/env node

/**
 * Check Porto Relay Wallet Balances
 * The relay uses multiple signers from a mnemonic
 */

import { mnemonicToAccount } from 'viem/accounts';
import { formatEther } from 'viem';
import { getBalance, CONFIG } from './lib/porto-utils.js';

// Default test mnemonic (from porto-relay settings)
const TEST_MNEMONIC = "test test test test test test test test test test test junk";
const NUM_SIGNERS = 2; // From relay.toml

async function checkRelayWallets() {
  console.log('🔍 PORTO RELAY WALLET CHECK');
  console.log('============================\n');
  
  console.log('Configuration:');
  console.log('  Mnemonic:', TEST_MNEMONIC.substring(0, 20) + '...');
  console.log('  Number of signers:', NUM_SIGNERS);
  console.log('  Porto URL:', CONFIG.PORTO_URL);
  console.log('');
  
  let totalBalance = 0n;
  const wallets = [];
  
  // Check each signer wallet
  for (let i = 0; i < NUM_SIGNERS; i++) {
    const account = mnemonicToAccount(TEST_MNEMONIC, { accountIndex: i });
    const balance = await getBalance(account.address);
    
    wallets.push({
      index: i,
      address: account.address,
      balance
    });
    
    totalBalance += balance;
    
    console.log(`Signer ${i}:`);
    console.log('  Address:', account.address);
    console.log('  Balance:', formatEther(balance), 'ETH');
    
    if (balance < 1000000000000000n) { // Less than 0.001 ETH
      console.log('  ⚠️  INSUFFICIENT - Needs at least 0.001 ETH per transaction');
    } else if (balance < 10000000000000000n) { // Less than 0.01 ETH
      console.log('  ⚠️  LOW - Can only handle a few transactions');
    } else {
      console.log('  ✅ Sufficient balance');
    }
    console.log('');
  }
  
  // Summary
  console.log('═══════════════════════════════════════');
  console.log('SUMMARY');
  console.log('═══════════════════════════════════════\n');
  
  console.log('Total balance across all signers:', formatEther(totalBalance), 'ETH');
  
  // Check which wallet is the main one we know about
  if (wallets[0].address === CONFIG.PORTO_RELAY_WALLET) {
    console.log('✅ First signer matches known relay wallet');
  } else if (wallets.some(w => w.address === CONFIG.PORTO_RELAY_WALLET)) {
    console.log('⚠️  Known relay wallet is not the first signer');
  } else {
    console.log('❌ Known relay wallet not found in signers');
    console.log('   Expected:', CONFIG.PORTO_RELAY_WALLET);
  }
  
  // Instructions
  console.log('\n📝 TO FIX INSUFFICIENT FUNDS:');
  console.log('────────────────────────────');
  
  const needsFunding = wallets.filter(w => w.balance < 10000000000000000n);
  if (needsFunding.length > 0) {
    console.log('\nFund these addresses with testnet ETH:');
    needsFunding.forEach(w => {
      const needed = 10000000000000000n - w.balance;
      console.log(`  ${w.address} - needs ${formatEther(needed)} ETH`);
    });
    
    console.log('\nTestnet faucets:');
    console.log('  1. https://faucet.riselabs.xyz/');
    console.log('  2. Ask in RISE Discord for testnet ETH');
  } else {
    console.log('All wallets have sufficient balance!');
  }
}

// Run check
checkRelayWallets().catch(console.error);