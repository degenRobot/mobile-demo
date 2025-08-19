import { Storage } from './storage';
import { privateKeyToAccount } from 'viem/accounts';
import { generatePrivateKey } from 'viem/accounts';
import type { PrivateKeyAccount } from 'viem';

const WALLET_KEY = 'RISE_WALLET_PRIVATE_KEY';

export class EmbeddedWallet {
  private account: PrivateKeyAccount | null = null;

  async init(): Promise<void> {
    let privateKey = await Storage.getItem(WALLET_KEY);
    
    if (!privateKey) {
      // Generate new wallet
      privateKey = generatePrivateKey();
      await Storage.setItem(WALLET_KEY, privateKey);
    }
    
    this.account = privateKeyToAccount(privateKey as `0x${string}`);
  }

  getAccount(): PrivateKeyAccount | null {
    return this.account;
  }

  getAddress(): string | null {
    return this.account?.address || null;
  }

  async getPrivateKey(): Promise<string | null> {
    return await Storage.getItem(WALLET_KEY);
  }

  async reset(): Promise<void> {
    await Storage.deleteItem(WALLET_KEY);
    this.account = null;
  }
}