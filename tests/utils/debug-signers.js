#!/usr/bin/env node

/**
 * Debug Signer Addresses
 * Check what addresses are generated from the mnemonic
 */

import { mnemonicToAccount } from 'viem/accounts';

const MNEMONIC = 'test test test test test test test test test test test junk';

console.log('🔍 DEBUGGING SIGNER ADDRESSES');
console.log('==============================\n');

console.log('Using accountIndex:');
for (let i = 0; i < 3; i++) {
  const account = mnemonicToAccount(MNEMONIC, { accountIndex: i });
  console.log(`  [${i}]:`, account.address);
}

console.log('\nUsing addressIndex:');
for (let i = 0; i < 3; i++) {
  const account = mnemonicToAccount(MNEMONIC, { addressIndex: i });
  console.log(`  [${i}]:`, account.address);
}

console.log('\n📝 Notes:');
console.log('  - Porto relay uses these addresses in rotation');
console.log('  - The funded address is: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
console.log('  - We need to identify which parameter generates this address');