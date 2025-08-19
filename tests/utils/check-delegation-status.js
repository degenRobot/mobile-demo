#!/usr/bin/env node

/**
 * Check if an account has Porto delegation active
 */

import { createPublicClient, http, parseAbi } from 'viem';

const RPC_URL = 'https://testnet.riselabs.xyz';
const PORTO_IMPLEMENTATION = '0x912a428b1a7e7cb7bb2709a2799a01c020c5acd9';

// Simple ABI to check delegation
const delegationAbi = parseAbi([
  'function isDelegated(address account) view returns (bool)',
  'function getAccountImplementation(address account) view returns (address)'
]);

async function checkDelegationStatus(address) {
  console.log('🔍 CHECKING PORTO DELEGATION STATUS');
  console.log('===================================\n');
  
  const client = createPublicClient({
    transport: http(RPC_URL)
  });
  
  console.log('Account:', address);
  console.log('Porto Implementation:', PORTO_IMPLEMENTATION);
  console.log('');
  
  // Check contract code at address (delegated accounts have code)
  const code = await client.getBytecode({ address });
  const hasCode = code && code !== '0x';
  
  console.log('📊 Account Analysis:');
  console.log('  Has contract code:', hasCode ? 'Yes' : 'No');
  
  if (hasCode) {
    console.log('  Code length:', code.length, 'bytes');
    console.log('  Code preview:', code.slice(0, 66) + '...');
    console.log('\n✅ Account appears to be delegated (has contract code)');
  } else {
    console.log('\n❌ Account is NOT delegated (no contract code)');
    console.log('   This account needs to run the delegation setup flow');
  }
  
  // Check account balance
  const balance = await client.getBalance({ address });
  console.log('\n💰 Account balance:', balance.toString(), 'wei');
  console.log('  ', (Number(balance) / 1e18).toFixed(6), 'ETH');
  
  return hasCode;
}

// Test addresses from our traces
const testAddresses = [
  '0x74f07253112ac63d2b611ea67247faa416995759', // From the failed trace
  '0x243A628142fa31A73d2c0e91acC6535A0CA72f34', // From our recent test
  '0xf3CE40Fd35a284E224Fd0955220cBA30153Ee381', // Another test account
];

async function checkAll() {
  for (const addr of testAddresses) {
    await checkDelegationStatus(addr);
    console.log('\n' + '='.repeat(50) + '\n');
  }
  
  console.log('💡 Summary:');
  console.log('  - Accounts with contract code have Porto delegation');
  console.log('  - Accounts without code need to run wallet_upgradeAccount');
  console.log('  - Error 0xfbcb0b34 means "Account not delegated"');
}

checkAll().catch(console.error);