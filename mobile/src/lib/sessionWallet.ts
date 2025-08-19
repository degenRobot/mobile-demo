import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { Storage } from './storage';
import type { PrivateKeyAccount } from 'viem';
import { encodeFunctionData, createWalletClient, http } from 'viem';
import { riseTestnet, PORTO_RELAYER_URL } from '../config/chain';
import { portoClient } from './portoClient.native';
import { isAccountDelegated } from './accountDelegation';

const MAIN_WALLET_KEY = 'RISE_MAIN_WALLET_KEY';
const SESSION_KEY = 'RISE_SESSION_KEY';
const SESSION_EXPIRY = 'RISE_SESSION_EXPIRY';

/**
 * Session-based wallet management for Porto relayer
 * 
 * Flow:
 * 1. Main EOA - stored securely, used only for session approval
 * 2. Session Key - temporary key for transaction signing
 * 3. All transactions go through Porto relayer with session key
 */
export class SessionWallet {
  private mainAccount: PrivateKeyAccount | null = null;
  private sessionAccount: PrivateKeyAccount | null = null;
  private sessionExpiry: number = 0;
  private portoInitialized: boolean = false;

  /**
   * Initialize or retrieve main wallet
   */
  async initMainWallet(): Promise<void> {
    try {
      let mainPrivateKey = await Storage.getItem(MAIN_WALLET_KEY);
      
      if (!mainPrivateKey) {
        // Generate new main wallet
        console.log('Generating new main wallet...');
        mainPrivateKey = generatePrivateKey();
        await Storage.setItem(MAIN_WALLET_KEY, mainPrivateKey);
      }
      
      this.mainAccount = privateKeyToAccount(mainPrivateKey as `0x${string}`);
      console.log('Main wallet initialized:', this.mainAccount.address);
    } catch (error) {
      console.error('Failed to initialize main wallet:', error);
      throw error;
    }
  }

  /**
   * Create or retrieve session key
   */
  async initSessionKey(): Promise<void> {
    try {
      // Check for existing valid session
      const storedSessionKey = await Storage.getItem(SESSION_KEY);
      const storedExpiry = await Storage.getItem(SESSION_EXPIRY);
      
      if (storedSessionKey && storedExpiry) {
        const expiry = parseInt(storedExpiry);
        if (Date.now() < expiry) {
          // Use existing session
          this.sessionAccount = privateKeyToAccount(storedSessionKey as `0x${string}`);
          this.sessionExpiry = expiry;
          console.log('Using existing session key:', this.sessionAccount.address);
          return;
        }
      }
      
      // Generate new session key
      console.log('Generating new session key...');
      const sessionPrivateKey = generatePrivateKey();
      this.sessionAccount = privateKeyToAccount(sessionPrivateKey);
      this.sessionExpiry = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
      
      // Store session key
      await Storage.setItem(SESSION_KEY, sessionPrivateKey);
      await Storage.setItem(SESSION_EXPIRY, this.sessionExpiry.toString());
      
      console.log('New session key created:', this.sessionAccount.address);
      
      // Initialize Porto with session key
      await this.initializePorto();
    } catch (error) {
      console.error('Failed to initialize session key:', error);
      throw error;
    }
  }

  /**
   * Initialize Porto with session key
   */
  private async initializePorto(): Promise<void> {
    if (!this.sessionAccount || !this.mainAccount) {
      throw new Error('Accounts not initialized');
    }

    try {
      console.log('Initializing Porto with session key...');
      
      // Check delegation status (informational only)
      const isDelegated = await isAccountDelegated(this.mainAccount.address);
      if (isDelegated) {
        console.log('Account already delegated to Porto');
      } else {
        console.log('Account not delegated yet - will happen on first transaction');
      }
      
      // IMPORTANT: Use MAIN wallet for Porto, not session key!
      // Porto needs the main wallet to be delegated and sign intents
      const mainPrivateKey = await Storage.getItem(MAIN_WALLET_KEY);
      if (!mainPrivateKey) {
        throw new Error('Main wallet key not found in secure store');
      }
      
      // Initialize Porto client with MAIN wallet
      console.log('[SessionWallet] Initializing Porto with MAIN wallet:', this.mainAccount.address);
      await portoClient.init(mainPrivateKey);
      this.portoInitialized = true;
      
      // Session key permissions would be added here in future
      // For now, we use the session key directly for signing
      
      // Check Porto health
      const isHealthy = await portoClient.checkHealth();
      if (isHealthy) {
        console.log('Porto relayer is healthy and ready');
      } else {
        console.warn('Porto relayer health check failed - transactions may fail');
      }
    } catch (error) {
      console.error('Failed to initialize Porto:', error);
      this.portoInitialized = false;
      // Continue anyway - we can still use direct RPC as fallback
    }
  }

  /**
   * Execute gasless transaction via Porto
   */
  async executePortoTransaction(
    to: string,
    data: string,
    value: string = '0x0'
  ): Promise<{ bundleId: string; status?: any }> {
    if (!this.portoInitialized) {
      // Try to initialize Porto if not already done
      await this.initializePorto();
      
      if (!this.portoInitialized) {
        throw new Error('Porto client not initialized');
      }
    }

    try {
      console.log('[SessionWallet] Executing gasless transaction via Porto...');
      // Pass session key address for delegation setup if needed
      const sessionKeyAddress = this.sessionAccount?.address;
      const result = await portoClient.executeGaslessTransaction(to, data, value, sessionKeyAddress);
      console.log('[SessionWallet] Transaction sent, bundle ID:', result.bundleId);
      return result;
    } catch (error) {
      console.error('[SessionWallet] Porto transaction failed:', error);
      throw error;
    }
  }

  /**
   * Get main wallet address
   */
  getMainAddress(): string | null {
    return this.mainAccount?.address || null;
  }

  /**
   * Get session key address
   */
  getSessionAddress(): string | null {
    return this.sessionAccount?.address || null;
  }

  /**
   * Get main account for emergency direct signing
   */
  getMainAccount(): PrivateKeyAccount | null {
    return this.mainAccount;
  }

  /**
   * Get session account for transaction signing
   */
  getSessionAccount(): PrivateKeyAccount | null {
    return this.sessionAccount;
  }

  /**
   * Sign transaction with session key
   */
  async signWithSession(data: any): Promise<string> {
    if (!this.sessionAccount) {
      throw new Error('Session not initialized');
    }
    
    return await this.sessionAccount.signMessage({ 
      message: typeof data === 'string' ? data : JSON.stringify(data) 
    });
  }

  /**
   * Clear session (logout)
   */
  async clearSession(): Promise<void> {
    await Storage.deleteItem(SESSION_KEY);
    await Storage.deleteItem(SESSION_EXPIRY);
    this.sessionAccount = null;
    this.sessionExpiry = 0;
    console.log('Session cleared');
  }

  /**
   * Reset everything (dangerous - loses main wallet!)
   */
  async resetAll(): Promise<void> {
    await Storage.deleteItem(MAIN_WALLET_KEY);
    await this.clearSession();
    this.mainAccount = null;
    console.log('All wallet data reset');
  }
}