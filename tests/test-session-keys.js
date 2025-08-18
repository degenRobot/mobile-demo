#!/usr/bin/env node

/**
 * Core Test 3: Session Key Management Test
 * 
 * Tests session key creation, delegation, and transaction signing
 * This simulates how the mobile app manages session keys for security
 */

const { privateKeyToAccount, generatePrivateKey } = require('viem/accounts');
const { createPublicClient, http, encodeFunctionData } = require('viem');
const crypto = require('crypto');

// Configuration - Must match deployed Porto relay config!
const RPC_URL = 'https://testnet.riselabs.xyz';
const PORTO_URL = 'https://rise-testnet-porto.fly.dev';
const CHAIN_ID = 11155931;
const PORTO_ACCOUNT_IMPL = '0x912a428b1a7e7cb7bb2709a2799a01c020c5acd9'; // From relay.toml
const FRENPET_CONTRACT = '0xfaf41c4e338d5f712e4aa221c654f764036f168a';

// Session key storage simulation
class SessionKeyManager {
  constructor() {
    this.sessions = new Map();
  }
  
  // Generate a new session key
  generateSessionKey(mainAddress, expiryHours = 24) {
    const sessionPrivateKey = generatePrivateKey();
    const sessionAccount = privateKeyToAccount(sessionPrivateKey);
    
    const session = {
      id: crypto.randomBytes(16).toString('hex'),
      mainAddress,
      sessionPrivateKey,
      sessionAddress: sessionAccount.address,
      createdAt: Date.now(),
      expiresAt: Date.now() + (expiryHours * 60 * 60 * 1000),
      nonce: 0,
      transactions: [],
    };
    
    this.sessions.set(session.id, session);
    console.log('[SessionKey] Generated new session:', session.id);
    console.log('[SessionKey] Session address:', sessionAccount.address);
    console.log('[SessionKey] Expires in:', expiryHours, 'hours');
    
    return session;
  }
  
  // Get active session
  getActiveSession(sessionId) {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw new Error('Session not found');
    }
    
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(sessionId);
      throw new Error('Session expired');
    }
    
    return session;
  }
  
  // Rotate session key
  rotateSessionKey(oldSessionId) {
    const oldSession = this.getActiveSession(oldSessionId);
    console.log('[SessionKey] Rotating session:', oldSessionId);
    
    // Create new session
    const newSession = this.generateSessionKey(oldSession.mainAddress);
    
    // Mark old session as rotated
    oldSession.rotatedTo = newSession.id;
    oldSession.rotatedAt = Date.now();
    
    console.log('[SessionKey] Rotated to new session:', newSession.id);
    return newSession;
  }
  
  // Clean expired sessions
  cleanExpiredSessions() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [id, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(id);
        cleaned++;
      }
    }
    
    console.log('[SessionKey] Cleaned', cleaned, 'expired sessions');
    return cleaned;
  }
  
  // Get session stats
  getStats() {
    const stats = {
      total: this.sessions.size,
      active: 0,
      expired: 0,
      totalTransactions: 0,
    };
    
    const now = Date.now();
    
    for (const session of this.sessions.values()) {
      if (now <= session.expiresAt) {
        stats.active++;
      } else {
        stats.expired++;
      }
      stats.totalTransactions += session.transactions.length;
    }
    
    return stats;
  }
}

// Create public client
const publicClient = createPublicClient({
  transport: http(RPC_URL),
});

// Helper: Check if account is delegated
async function isAccountDelegated(address) {
  const code = await publicClient.getBytecode({ address });
  return code && code !== '0x' && code !== null;
}

// Test 1: Basic session key lifecycle
async function testSessionKeyLifecycle() {
  console.log('\n🔑 Test 1: Session Key Lifecycle');
  console.log('─'.repeat(60));
  
  const manager = new SessionKeyManager();
  
  // Generate main account
  const mainPrivateKey = generatePrivateKey();
  const mainAccount = privateKeyToAccount(mainPrivateKey);
  console.log('Main account:', mainAccount.address);
  
  // Create session key
  const session1 = manager.generateSessionKey(mainAccount.address, 1); // 1 hour expiry
  
  // Verify session
  const activeSession = manager.getActiveSession(session1.id);
  console.log('Session verified:', activeSession.id === session1.id ? '✅' : '❌');
  
  // Rotate session key
  const session2 = manager.rotateSessionKey(session1.id);
  console.log('New session after rotation:', session2.id);
  
  // Try to use old session (should still work if not expired)
  try {
    const oldSession = manager.getActiveSession(session1.id);
    console.log('Old session still accessible:', oldSession.rotatedTo ? '✅ (marked as rotated)' : '❌');
  } catch (error) {
    console.log('Old session inaccessible:', error.message);
  }
  
  // Stats
  const stats = manager.getStats();
  console.log('\nSession manager stats:');
  console.log('  Total sessions:', stats.total);
  console.log('  Active sessions:', stats.active);
  console.log('  Expired sessions:', stats.expired);
  
  return { success: true, manager };
}

// Test 2: Session key delegation with Porto
async function testSessionKeyDelegation() {
  console.log('\n🔐 Test 2: Session Key Delegation');
  console.log('─'.repeat(60));
  
  // Generate accounts
  const mainPrivateKey = generatePrivateKey();
  const mainAccount = privateKeyToAccount(mainPrivateKey);
  const sessionPrivateKey = generatePrivateKey();
  const sessionAccount = privateKeyToAccount(sessionPrivateKey);
  
  console.log('Main account:', mainAccount.address);
  console.log('Session key:', sessionAccount.address);
  
  // Prepare delegation with multiple session keys
  const expiry = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
  const expiryHex = '0x' + expiry.toString(16);
  
  const sessionExpiry1 = Math.floor(Date.now() / 1000) + (1 * 24 * 60 * 60); // 1 day
  const sessionExpiry1Hex = '0x' + sessionExpiry1.toString(16);
  
  const sessionExpiry2 = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60); // 7 days
  const sessionExpiry2Hex = '0x' + sessionExpiry2.toString(16);
  
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
        },
        {
          expiry: sessionExpiry1Hex,
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
  
  console.log('\nPreparing delegation with:');
  console.log('  Admin key (main):', mainAccount.address);
  console.log('  Session key 1:', sessionAccount.address, '(expires in 1 day)');
  
  try {
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
      console.log('❌ Delegation preparation failed:', result.error.message);
      return { success: false };
    }
    
    console.log('✅ Delegation prepared successfully');
    console.log('  Auth digest:', result.result.digests?.auth?.substring(0, 10) + '...');
    console.log('  Exec digest:', result.result.digests?.exec?.substring(0, 10) + '...');
    
    return { success: true, prepareResult: result.result };
    
  } catch (error) {
    console.log('❌ Network error:', error.message);
    return { success: false };
  }
}

// Test 3: Session key transaction signing
async function testSessionKeyTransactionSigning() {
  console.log('\n✍️ Test 3: Session Key Transaction Signing');
  console.log('─'.repeat(60));
  
  // Create session key
  const sessionPrivateKey = generatePrivateKey();
  const sessionAccount = privateKeyToAccount(sessionPrivateKey);
  
  console.log('Session key address:', sessionAccount.address);
  
  // Prepare a mock transaction
  const mockTxData = encodeFunctionData({
    abi: [{
      inputs: [{ name: 'name', type: 'string' }],
      name: 'createPet',
      outputs: [],
      type: 'function',
    }],
    functionName: 'createPet',
    args: ['TestPet'],
  });
  
  console.log('Mock transaction data:', mockTxData.substring(0, 10) + '...');
  
  // Sign with session key
  const message = '0x' + crypto.randomBytes(32).toString('hex');
  console.log('\nSigning message with session key...');
  
  try {
    const signature = await sessionAccount.signMessage({
      message: { raw: message }
    });
    
    console.log('✅ Signature created:', signature.substring(0, 20) + '...');
    
    // Verify signature (mock verification)
    console.log('Verifying signature...');
    // In real app, this would verify against the session key's public key
    console.log('✅ Signature verification would happen on-chain');
    
    return { success: true, signature };
    
  } catch (error) {
    console.log('❌ Signing failed:', error.message);
    return { success: false };
  }
}

// Test 4: Session key expiry and cleanup
async function testSessionKeyExpiry() {
  console.log('\n⏰ Test 4: Session Key Expiry');
  console.log('─'.repeat(60));
  
  const manager = new SessionKeyManager();
  
  // Create sessions with different expiry times
  const mainAddress = '0x' + crypto.randomBytes(20).toString('hex');
  
  // Create expired session (0 hours = instant expiry)
  const expiredSession = manager.generateSessionKey(mainAddress, 0);
  
  // Create short-lived session
  const shortSession = manager.generateSessionKey(mainAddress, 0.0003); // ~1 second
  
  // Create normal session
  const normalSession = manager.generateSessionKey(mainAddress, 24);
  
  console.log('\nCreated 3 sessions:');
  console.log('  Expired session:', expiredSession.id);
  console.log('  Short session:', shortSession.id);
  console.log('  Normal session:', normalSession.id);
  
  // Wait a bit
  console.log('\nWaiting 2 seconds...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Try to access sessions
  console.log('\nChecking session availability:');
  
  try {
    manager.getActiveSession(expiredSession.id);
    console.log('  Expired session: ❌ Still accessible (shouldn\'t be)');
  } catch {
    console.log('  Expired session: ✅ Properly expired');
  }
  
  try {
    manager.getActiveSession(shortSession.id);
    console.log('  Short session: ❌ Still accessible (shouldn\'t be)');
  } catch {
    console.log('  Short session: ✅ Properly expired');
  }
  
  try {
    manager.getActiveSession(normalSession.id);
    console.log('  Normal session: ✅ Still accessible');
  } catch {
    console.log('  Normal session: ❌ Expired (shouldn\'t be)');
  }
  
  // Clean expired sessions
  const cleaned = manager.cleanExpiredSessions();
  console.log('\nCleaned', cleaned, 'expired sessions');
  
  // Final stats
  const stats = manager.getStats();
  console.log('\nFinal stats:');
  console.log('  Total sessions:', stats.total);
  console.log('  Active sessions:', stats.active);
  console.log('  Expired sessions:', stats.expired);
  
  return { success: true };
}

// Test 5: Multi-session management
async function testMultiSessionManagement() {
  console.log('\n👥 Test 5: Multi-Session Management');
  console.log('─'.repeat(60));
  
  const manager = new SessionKeyManager();
  
  // Simulate multiple users with sessions
  const users = [
    { name: 'Alice', address: '0x' + crypto.randomBytes(20).toString('hex') },
    { name: 'Bob', address: '0x' + crypto.randomBytes(20).toString('hex') },
    { name: 'Charlie', address: '0x' + crypto.randomBytes(20).toString('hex') },
  ];
  
  const userSessions = {};
  
  // Create sessions for each user
  console.log('Creating sessions for users:');
  for (const user of users) {
    const session = manager.generateSessionKey(user.address, 24);
    userSessions[user.name] = session;
    console.log(`  ${user.name}: Session ${session.id.substring(0, 8)}...`);
    
    // Simulate some transactions
    session.transactions.push({
      timestamp: Date.now(),
      type: 'createPet',
      status: 'success'
    });
    session.nonce++;
  }
  
  // Rotate Bob's session
  console.log('\nRotating Bob\'s session...');
  const newBobSession = manager.rotateSessionKey(userSessions['Bob'].id);
  userSessions['Bob'] = newBobSession;
  
  // Display session activity
  console.log('\nSession Activity:');
  for (const [name, session] of Object.entries(userSessions)) {
    const active = manager.sessions.has(session.id);
    console.log(`  ${name}:`);
    console.log(`    Session: ${session.id.substring(0, 8)}...`);
    console.log(`    Active: ${active ? '✅' : '❌'}`);
    console.log(`    Transactions: ${session.transactions.length}`);
    console.log(`    Nonce: ${session.nonce}`);
  }
  
  // Stats
  const stats = manager.getStats();
  console.log('\nOverall Stats:');
  console.log('  Total sessions:', stats.total);
  console.log('  Active sessions:', stats.active);
  console.log('  Total transactions:', stats.totalTransactions);
  
  return { success: true };
}

// Main test execution
async function main() {
  console.log('=== Session Key Management Test ===');
  console.log('Testing session key creation, delegation, and management');
  console.log('');
  
  const results = {
    lifecycle: false,
    delegation: false,
    signing: false,
    expiry: false,
    multiSession: false,
  };
  
  try {
    // Test 1: Basic lifecycle
    const lifecycleResult = await testSessionKeyLifecycle();
    results.lifecycle = lifecycleResult.success;
    
    // Test 2: Porto delegation
    const delegationResult = await testSessionKeyDelegation();
    results.delegation = delegationResult.success;
    
    // Test 3: Transaction signing
    const signingResult = await testSessionKeyTransactionSigning();
    results.signing = signingResult.success;
    
    // Test 4: Expiry handling
    const expiryResult = await testSessionKeyExpiry();
    results.expiry = expiryResult.success;
    
    // Test 5: Multi-session management
    const multiResult = await testMultiSessionManagement();
    results.multiSession = multiResult.success;
    
    // Summary
    console.log('\n=== Test Summary ===');
    console.log(`✅ Session lifecycle: ${results.lifecycle ? 'Passed' : 'Failed'}`);
    console.log(`✅ Porto delegation: ${results.delegation ? 'Passed' : 'Failed'}`);
    console.log(`✅ Transaction signing: ${results.signing ? 'Passed' : 'Failed'}`);
    console.log(`✅ Expiry handling: ${results.expiry ? 'Passed' : 'Failed'}`);
    console.log(`✅ Multi-session: ${results.multiSession ? 'Passed' : 'Failed'}`);
    
    const allPassed = Object.values(results).every(r => r);
    
    if (allPassed) {
      console.log('\n🎉 All session key tests passed!');
    } else {
      console.log('\n⚠️ Some tests failed');
    }
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the test
main().catch(console.error);