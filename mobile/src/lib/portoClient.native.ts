/**
 * Porto Relayer Client for React Native
 * 
 * Based on proven TypeScript tests, adapted for React Native environment
 * Successfully tested transaction: 0x050312a9cd6fdefc324c7fbf99f58648d1aeb3c6a8182a1a4da706ca5c758f9d
 */

import { privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts';
import { type Hex } from 'viem';
import { isAccountDelegated } from './accountUpgrade';
import { serializePublicKey, ETH_FEE_TOKEN } from './porto-utils';
import { PORTO_CONFIG } from '../config/porto';

// Use centralized configuration
// PORTO_CONFIG imported from '../config/porto'

// Types matching Porto relay API
interface Call {
  to: string;
  data: string;
  value: string;
}

interface PrepareCallsRequest {
  calls: Call[];
  capabilities: any;
  chainId: number;
  from: string;
  key: any;
}

interface PrepareCallsResponse {
  context: any;
  digest: string;
  typedData: any;
  key: any;
  capabilities?: any;
}

interface SendPreparedCallsRequest {
  context: any;
  key: any;
  signature: string;
}

interface TransactionStatus {
  id: string;
  status: number;
  receipts?: any[];
}

/**
 * Porto Client for React Native
 * Handles all interactions with Porto relayer for gasless transactions
 */
export class PortoClient {
  private account: PrivateKeyAccount | null = null;
  private isInitialized = false;

  /**
   * Initialize with account from secure storage
   */
  async init(privateKey: string) {
    try {
      this.account = privateKeyToAccount(privateKey as `0x${string}`);
      this.isInitialized = true;
      console.log('[Porto] Initialized with account:', this.account.address);
    } catch (error) {
      console.error('[Porto] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Check if Porto relayer is healthy
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await this.makeRpcCall('health', []);
      return response.result === 'healthy';
    } catch (error) {
      console.error('[Porto] Health check failed:', error);
      return false;
    }
  }

  /**
   * Get capabilities for the chain
   */
  async getCapabilities(address?: string): Promise<any> {
    try {
      const params = address ? [address] : [];
      const response = await this.makeRpcCall('wallet_getCapabilities', params);
      return response.result;
    } catch (error) {
      console.error('[Porto] Failed to get capabilities:', error);
      throw error;
    }
  }

  /**
   * Prepare calls for execution
   */
  async prepareCalls(calls: Call[]): Promise<PrepareCallsResponse> {
    if (!this.account) throw new Error('Porto client not initialized');

    const request: PrepareCallsRequest = {
      from: this.account.address,
      chainId: PORTO_CONFIG.chainId,
      calls,
      capabilities: {
        meta: {
          feeToken: ETH_FEE_TOKEN // ETH as fee token for gasless sponsorship
        }
      },
      key: {
        prehash: false,
        publicKey: serializePublicKey(this.account.address),
        type: 'secp256k1'
      }
    };

    console.log('[Porto] Preparing calls...');
    const response = await this.makeRpcCall('wallet_prepareCalls', [request]);
    
    if (response.error) {
      throw new Error(`Prepare failed: ${response.error.message}`);
    }

    console.log('[Porto] Calls prepared, digest:', response.result.digest);
    return response.result;
  }

  /**
   * Sign intent - using raw signature, not EIP-712
   * Porto expects raw signatures on the digest
   */
  async signIntent(digest: string): Promise<string> {
    if (!this.account) throw new Error('Porto client not initialized');

    console.log('[Porto] Signing digest...');
    // Use raw sign, not signTypedData
    const signature = await this.account.sign({ 
      hash: digest as Hex 
    });

    console.log('[Porto] Digest signed');
    return signature;
  }

  /**
   * Send prepared calls with signature
   */
  async sendPreparedCalls(
    context: any,
    signature: string
  ): Promise<string> {
    if (!this.account) throw new Error('Porto client not initialized');
    
    const request: SendPreparedCallsRequest = {
      context,
      key: {
        prehash: false,
        publicKey: serializePublicKey(this.account.address),
        type: 'secp256k1'
      },
      signature,
    };

    console.log('[Porto] Sending to relayer...');
    const response = await this.makeRpcCall('wallet_sendPreparedCalls', [request]);
    
    if (response.error) {
      throw new Error(`Send failed: ${response.error.message}`);
    }

    const bundleId = response.result.id || response.result;
    console.log('[Porto] Transaction sent, bundle ID:', bundleId);
    return bundleId;
  }

  /**
   * Get status of transaction
   */
  async getCallsStatus(bundleId: string): Promise<TransactionStatus> {
    const response = await this.makeRpcCall('wallet_getCallsStatus', [bundleId]);
    
    if (response.error) {
      throw new Error(`Status check failed: ${response.error.message}`);
    }

    return response.result;
  }

  /**
   * Setup delegation for gasless transactions
   * This needs to be done once before sending any transactions
   */
  async setupDelegation(adminKeyAddress?: string): Promise<boolean> {
    if (!this.account) throw new Error('Porto client not initialized');
    
    // Check if already delegated
    const isDelegated = await isAccountDelegated(this.account.address);
    
    if (isDelegated) {
      console.log('[Porto] ✅ Account already delegated');
      return true;
    }
    
    console.log('[Porto] Setting up delegation for gasless transactions...');
    
    try {
      // Step 1: Prepare delegation
      // Use empty key array for MVP - EOA will be implicit admin
      const authorizeKeys: any[] = [];
      
      // Optionally add admin key if provided
      if (adminKeyAddress) {
        authorizeKeys.push({
          expiry: '0x0', // Never expires
          prehash: false,
          publicKey: serializePublicKey(adminKeyAddress),
          role: 'admin',
          type: 'secp256k1',
          permissions: []
        });
      }
      
      const delegationParams = {
        address: this.account.address,
        delegation: PORTO_CONFIG.contracts.proxy, // Use proxy address from config
        capabilities: {
          authorizeKeys
        },
        chainId: PORTO_CONFIG.chainId
      };
      
      console.log('[Porto] Preparing delegation...');
      const prepareResponse = await this.makeRpcCall('wallet_prepareUpgradeAccount', [delegationParams]);
      
      if (prepareResponse.error) {
        throw new Error(`Delegation prepare failed: ${prepareResponse.error.message}`);
      }
      
      // Step 2: Sign delegation digests with raw sign (not signMessage)
      console.log('[Porto] Signing delegation digests...');
      const authSig = await this.account.sign({
        hash: prepareResponse.result.digests.auth as Hex
      });
      
      const execSig = await this.account.sign({
        hash: prepareResponse.result.digests.exec as Hex
      });
      
      // Step 3: Store delegation with Porto
      console.log('[Porto] Storing delegation with Porto...');
      await this.makeRpcCall('wallet_upgradeAccount', [{
        context: prepareResponse.result.context,
        signatures: {
          auth: authSig,
          exec: execSig
        }
      }]);
      
      console.log('[Porto] ✅ Delegation stored successfully');
      console.log('[Porto] Next transaction will execute the delegation on-chain');
      return true;
      
    } catch (error) {
      console.error('[Porto] Delegation setup failed:', error);
      return false;
    }
  }

  /**
   * Ensure account is delegated before transactions
   */
  async ensureAccountDelegated(sessionKeyAddress?: string): Promise<boolean> {
    if (!this.account) throw new Error('Porto client not initialized');
    
    // Check if already delegated
    const isDelegated = await isAccountDelegated(this.account.address);
    
    if (isDelegated) {
      console.log('[Porto] ✅ Account already delegated');
      return true;
    }
    
    // Try to set up delegation
    console.log('[Porto] Account not delegated, setting up...');
    return await this.setupDelegation(sessionKeyAddress);
  }

  /**
   * Execute a complete gasless transaction
   * High-level wrapper for the full flow
   */
  async executeGaslessTransaction(
    to: string,
    data: string,
    value: string = '0x0',
    adminKeyAddress?: string
  ): Promise<{ bundleId: string; status?: TransactionStatus }> {
    try {
      // Ensure delegation is set up
      const delegated = await this.ensureAccountDelegated(adminKeyAddress);
      if (!delegated) {
        console.warn('[Porto] Failed to set up delegation, transaction may fail');
      }
      
      // Step 1: Prepare
      const call: Call = { to, data, value };
      const prepareResult = await this.prepareCalls([call]);

      // Step 2: Sign the digest (not typedData)
      const signature = await this.signIntent(prepareResult.digest);

      // Step 3: Send
      const bundleId = await this.sendPreparedCalls(
        prepareResult.context,
        signature
      );

      // Step 4: Check initial status (optional)
      let status;
      try {
        // Wait a bit for transaction to process
        await new Promise(resolve => setTimeout(resolve, 2000));
        status = await this.getCallsStatus(bundleId);
      } catch (error) {
        console.log('[Porto] Status check failed (may be too early)');
      }

      return { bundleId, status };
    } catch (error) {
      console.error('[Porto] Transaction failed:', error);
      throw error;
    }
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(
    bundleId: string,
    maxAttempts: number = 30,
    delayMs: number = 2000
  ): Promise<TransactionStatus> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const status = await this.getCallsStatus(bundleId);
        
        // Check if transaction is confirmed
        if (status.status === 200 || status.status === 1) {
          console.log('[Porto] Transaction confirmed');
          return status;
        }
        
        // Check if transaction failed
        if (status.status >= 400) {
          throw new Error(`Transaction failed with status ${status.status}`);
        }
      } catch (error) {
        if (i === maxAttempts - 1) throw error;
      }

      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    throw new Error('Transaction timeout');
  }

  /**
   * Make RPC call to Porto relayer
   */
  private async makeRpcCall(method: string, params: any[]): Promise<any> {
    const requestId = Math.floor(Math.random() * 10000);
    
    const response = await fetch(PORTO_CONFIG.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method,
        params,
        id: requestId,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  }

  /**
   * Check if client is ready
   */
  isReady(): boolean {
    return this.isInitialized && this.account !== null;
  }

  /**
   * Get current account address
   */
  getAddress(): string | null {
    return this.account?.address || null;
  }
}

// Singleton instance for app-wide use
export const portoClient = new PortoClient();