/**
 * Porto Relayer Client for React Native
 * 
 * Based on proven TypeScript tests, adapted for React Native environment
 * Successfully tested transaction: 0x050312a9cd6fdefc324c7fbf99f58648d1aeb3c6a8182a1a4da706ca5c758f9d
 */

import { privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts';
import { encodeFunctionData } from 'viem';
import { Storage } from './storage';
import { isAccountDelegated, prepareUpgradeAccount, signUpgradeIntent, upgradeAccount } from './accountUpgrade';

// Configuration
const PORTO_CONFIG = {
  url: 'https://rise-testnet-porto.fly.dev',
  chainId: 11155931, // Sepolia fork
  retryAttempts: 3,
  timeout: 30000,
};

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
        meta: {} // Empty meta - Porto will use defaults
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
   * Sign intent using EIP-712
   */
  async signIntent(typedData: any): Promise<string> {
    if (!this.account) throw new Error('Porto client not initialized');

    // Convert domain chainId from hex to number if needed
    const domain = {
      ...typedData.domain,
      chainId: typeof typedData.domain.chainId === 'string' 
        ? parseInt(typedData.domain.chainId, 16)
        : typedData.domain.chainId,
    };

    console.log('[Porto] Signing intent...');
    const signature = await this.account.signTypedData({
      domain,
      types: typedData.types,
      primaryType: typedData.primaryType,
      message: typedData.message,
    });

    console.log('[Porto] Intent signed');
    return signature;
  }

  /**
   * Send prepared calls with signature
   */
  async sendPreparedCalls(
    context: any,
    key: any,
    signature: string
  ): Promise<string> {
    const request: SendPreparedCallsRequest = {
      context,
      key,
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
  async setupDelegation(sessionKeyAddress?: string): Promise<boolean> {
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
      const expiry = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30 days
      const expiryHex = '0x' + expiry.toString(16);
      
      const authorizeKeys = [
        {
          expiry: expiryHex,
          prehash: false,
          publicKey: this.account.address, // Main wallet
          role: 'admin',
          type: 'secp256k1',
          permissions: []
        }
      ];
      
      // Add session key if provided
      if (sessionKeyAddress) {
        authorizeKeys.push({
          expiry: expiryHex,
          prehash: false,
          publicKey: sessionKeyAddress,
          role: 'normal',
          type: 'secp256k1',
          permissions: []
        });
      }
      
      const delegationParams = {
        address: this.account.address,
        delegation: '0x912a428b1a7e7cb7bb2709a2799a01c020c5acd9', // Porto implementation
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
      
      // Step 2: Sign delegation
      console.log('[Porto] Signing delegation...');
      const authSig = await this.account.signMessage({
        message: { raw: prepareResponse.result.digests.auth }
      });
      
      const domain = {
        ...prepareResponse.result.typedData.domain,
        chainId: typeof prepareResponse.result.typedData.domain.chainId === 'string' 
          ? parseInt(prepareResponse.result.typedData.domain.chainId, 16)
          : prepareResponse.result.typedData.domain.chainId,
      };
      
      const execSig = await this.account.signTypedData({
        domain,
        types: prepareResponse.result.typedData.types,
        primaryType: prepareResponse.result.typedData.primaryType,
        message: prepareResponse.result.typedData.message,
      });
      
      // Step 3: Store delegation with Porto
      console.log('[Porto] Storing delegation with Porto...');
      const storeResponse = await this.makeRpcCall('wallet_upgradeAccount', [{
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
    sessionKeyAddress?: string
  ): Promise<{ bundleId: string; status?: TransactionStatus }> {
    try {
      // Ensure delegation is set up
      const delegated = await this.ensureAccountDelegated(sessionKeyAddress);
      if (!delegated) {
        console.warn('[Porto] Failed to set up delegation, transaction may fail');
      }
      
      // Step 1: Prepare
      const call: Call = { to, data, value };
      const prepareResult = await this.prepareCalls([call]);

      // Step 2: Sign
      const signature = await this.signIntent(prepareResult.typedData);

      // Step 3: Send
      const key = {
        prehash: false,
        publicKey: this.account.address,
        type: 'secp256k1'
      };
      const bundleId = await this.sendPreparedCalls(
        prepareResult.context,
        key,
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