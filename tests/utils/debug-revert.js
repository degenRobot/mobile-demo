#!/usr/bin/env node

/**
 * Debug the reverted transaction
 */

import { decodeErrorResult, parseAbi } from 'viem';

// The error output from the trace
const errorData = '0xfbcb0b34';

// Check common error signatures
const commonErrors = {
  '0x08c379a0': 'Error(string)',
  '0x4e487b71': 'Panic(uint256)',
  '0xfbcb0b34': 'Unknown - custom error'
};

console.log('🔍 DEBUGGING REVERTED TRANSACTION');
console.log('==================================\n');

console.log('Error data:', errorData);
console.log('Error type:', commonErrors[errorData] || 'Unknown');

// The actual calldata from the trace
const calldata = '0xd3816bac0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000001956657269666965645065745f3137353535363536303933313300000000000000';

// Decode the calldata
console.log('\n📝 Decoding calldata:');
console.log('Function selector:', calldata.slice(0, 10));
console.log('Expected: 0xd3816bac (createPet)');

// Extract the pet name from calldata
const nameOffset = parseInt(calldata.slice(10, 74), 16); // First 32 bytes after selector
const nameLength = parseInt(calldata.slice(74, 138), 16); // Next 32 bytes
const nameHex = calldata.slice(138, 138 + nameLength * 2);
const petName = Buffer.from(nameHex, 'hex').toString('utf8');

console.log('\nDecoded parameters:');
console.log('  Pet name:', petName);
console.log('  Name length:', nameLength);

// Let's check the orchestrator error codes
console.log('\n🔍 Checking Porto Orchestrator errors...');

// Common Porto/Orchestrator errors
const orchestratorErrors = [
  'InvalidNonce()',
  'InvalidSignature()',
  'InsufficientFunds()',
  'InvalidIntent()',
  'PreCallFailed()',
  'CallFailed()',
  'Unauthorized()'
];

console.log('Possible Porto errors:');
orchestratorErrors.forEach(err => {
  console.log('  -', err);
});

console.log('\n💡 Next steps:');
console.log('1. Check if the EOA (0x74f07253112ac63d2b611ea67247faa416995759) exists on-chain');
console.log('2. Verify the FrenPetSimple contract is deployed at 0x3fde139a94eef14c4eba229fdc80a54f7f5fbf25');
console.log('3. Test the createPet function directly with forge');
console.log('4. Check if there are any access control issues');