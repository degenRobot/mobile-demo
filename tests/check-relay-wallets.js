#!/usr/bin/env node

/**
 * Check the relay's wallet addresses and balances
 * The relay uses the test mnemonic to generate signers
 */

const { MnemonicBuilder } = require('viem/accounts');
const { createPublicClient, http } = require('viem');

const RPC_URL = 'https://testnet.riselabs.xyz';

// Default test mnemonic from settings.rs
const TEST_MNEMONIC = "test test test test test test test test test test test junk";
const NUM_SIGNERS = 2; // From relay.toml

const publicClient = createPublicClient({
  transport: http(RPC_URL),
});

async function checkRelayWallets() {
  console.log('=== Porto Relay Wallet Check ===\n');
  console.log('Mnemonic:', TEST_MNEMONIC);
  console.log('Number of signers:', NUM_SIGNERS);
  console.log('');
  
  // Generate the same addresses the relay uses
  for (let i = 0; i < NUM_SIGNERS; i++) {
    // Create HD wallet from mnemonic with index
    const hdKey = require('viem/accounts').mnemonicToAccount(TEST_MNEMONIC, {
      accountIndex: i
    });
    
    console.log(`\nSigner ${i}:`);
    console.log('Address:', hdKey.address);
    
    // Check balance
    const balance = await publicClient.getBalance({ address: hdKey.address });
    console.log('Balance:', balance.toString(), 'wei');
    console.log('Balance:', (Number(balance) / 1e18).toFixed(6), 'ETH');
    
    if (balance < 1000000000000000000n) { // Less than 1 ETH
      console.log('⚠️  LOW BALANCE - Needs funding!');
    } else {
      console.log('✅ Sufficient balance');
    }
  }
  
  console.log('\n--- Summary ---');
  console.log('The Porto relay uses these addresses to pay for gas.');
  console.log('If they have insufficient balance, the relay cannot process transactions.');
  console.log('\nTo fund the relay:');
  console.log('1. Send testnet ETH to the addresses above');
  console.log('2. Or deploy your own relay with a funded mnemonic');
}

checkRelayWallets().catch(console.error);