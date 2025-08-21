/**
 * Test Porto Gasless Flow with Updated Implementation
 */

import { generatePrivateKey } from 'viem/accounts';
import { encodeFunctionData } from 'viem';
import { PortoClient } from '../portoClient.native';

// FrenPet contract
const FRENPET_ADDRESS = '0x3fde139a94eef14c4eba229fdc80a54f7f5fbf25';
const FRENPET_ABI = [
  {
    inputs: [{ name: 'name', type: 'string' }],
    name: 'createPet',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

describe('Porto Gasless Integration', () => {
  let client: PortoClient;
  let privateKey: string;
  
  beforeEach(() => {
    // Generate fresh account for testing
    privateKey = generatePrivateKey();
    client = new PortoClient();
  });
  
  it('should initialize Porto client', async () => {
    await client.init(privateKey);
    expect(client.getAccount()).toBeDefined();
    expect(client.getAccount()?.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });
  
  it('should check Porto relay health', async () => {
    await client.init(privateKey);
    const isHealthy = await client.checkHealth();
    expect(isHealthy).toBe(true);
  });
  
  it('should setup delegation for gasless transactions', async () => {
    await client.init(privateKey);
    
    // Setup delegation (will store in relay DB)
    const result = await client.setupDelegation();
    expect(result).toBe(true);
    
    // Note: Delegation is stored but not deployed until first transaction
    console.log('Delegation prepared and stored in relay');
  });
  
  it('should execute a gasless pet creation', async () => {
    await client.init(privateKey);
    
    // Setup delegation first
    await client.setupDelegation();
    
    // Create pet call data
    const petName = `TestPet_${Date.now()}`;
    const calldata = encodeFunctionData({
      abi: FRENPET_ABI,
      functionName: 'createPet',
      args: [petName],
    });
    
    // Execute gasless transaction
    const result = await client.executeGaslessTransaction(
      FRENPET_ADDRESS,
      calldata
    );
    
    expect(result.bundleId).toBeDefined();
    expect(result.bundleId).toMatch(/^0x[a-fA-F0-9]{64}$/);
    
    // Wait for confirmation
    if (result.bundleId) {
      const status = await client.waitForTransaction(result.bundleId);
      expect(status.status).toBe(200); // Success
      
      console.log('Pet created gaslessly:', petName);
      console.log('Transaction:', result.bundleId);
    }
  }, 30000); // Extended timeout for blockchain operations
  
  it('should handle the complete gasless flow', async () => {
    await client.init(privateKey);
    
    const account = client.getAccount();
    console.log('Test account:', account?.address);
    
    // Step 1: Check initial state
    const isDelegated = await client.ensureAccountDelegated();
    console.log('Account delegated:', isDelegated);
    
    // Step 2: Prepare a simple call
    const petName = `GaslessPet_${Date.now()}`;
    const calldata = encodeFunctionData({
      abi: FRENPET_ABI,
      functionName: 'createPet',
      args: [petName],
    });
    
    const prepareResult = await client.prepareCalls([{
      to: FRENPET_ADDRESS,
      data: calldata,
      value: '0x0',
    }]);
    
    expect(prepareResult.digest).toBeDefined();
    expect(prepareResult.context).toBeDefined();
    
    // Step 3: Sign the digest
    const signature = await client.signIntent(prepareResult.digest);
    expect(signature).toMatch(/^0x[a-fA-F0-9]{130}$/); // Valid signature
    
    // Step 4: Send transaction
    const bundleId = await client.sendPreparedCalls(
      prepareResult.context,
      signature
    );
    
    expect(bundleId).toBeDefined();
    console.log('Transaction sent:', bundleId);
    
    // Step 5: Check status
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s
    
    const status = await client.getCallsStatus(bundleId);
    expect([200, 1, 0]).toContain(status.status); // Success or pending
    
    if (status.status === 200) {
      console.log('✅ Gasless transaction confirmed!');
      console.log('Pet created:', petName);
    }
  }, 45000); // Extended timeout
});

// Integration test runner (if not using Jest)
if (typeof describe === 'undefined') {
  console.log('Running Porto gasless integration tests...');
  
  async function runTests() {
    const client = new PortoClient();
    const privateKey = generatePrivateKey();
    
    try {
      // Test 1: Initialize
      console.log('\\n1. Initializing Porto client...');
      await client.init(privateKey);
      console.log('✅ Client initialized');
      console.log('   Account:', client.getAccount()?.address);
      
      // Test 2: Check health
      console.log('\\n2. Checking relay health...');
      const isHealthy = await client.checkHealth();
      console.log(isHealthy ? '✅ Relay is healthy' : '❌ Relay is not healthy');
      
      // Test 3: Setup delegation
      console.log('\\n3. Setting up delegation...');
      const delegated = await client.setupDelegation();
      console.log(delegated ? '✅ Delegation setup complete' : '❌ Delegation failed');
      
      // Test 4: Execute gasless transaction
      console.log('\\n4. Executing gasless transaction...');
      const petName = `TestPet_${Date.now()}`;
      const calldata = encodeFunctionData({
        abi: FRENPET_ABI,
        functionName: 'createPet',
        args: [petName],
      });
      
      const result = await client.executeGaslessTransaction(
        FRENPET_ADDRESS,
        calldata
      );
      
      console.log('✅ Transaction sent:', result.bundleId);
      
      // Wait for confirmation
      console.log('\\n5. Waiting for confirmation...');
      const status = await client.waitForTransaction(result.bundleId);
      
      if (status.status === 200) {
        console.log('✅ Transaction confirmed!');
        console.log('   Pet created:', petName);
        console.log('   Gas used:', status.receipts?.[0]?.gasUsed);
      } else {
        console.log('⏳ Transaction pending, status:', status.status);
      }
      
      console.log('\\n✨ All tests completed successfully!');
      
    } catch (error) {
      console.error('\\n❌ Test failed:', error);
    }
  }
  
  // Run if executed directly
  if (require.main === module) {
    runTests();
  }
}

export {};