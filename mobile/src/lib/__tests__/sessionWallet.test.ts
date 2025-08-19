import { SecureStore } from 'expo-secure-store';
import { SessionWallet } from '../sessionWallet';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

// Mock viem
jest.mock('viem/accounts', () => ({
  generatePrivateKey: jest.fn(() => '0x1234567890123456789012345678901234567890123456789012345678901234'),
  privateKeyToAccount: jest.fn((key) => ({
    address: key === '0xmain' ? '0x6999c3aeD0a9241C07CdF2c8fBD38d858476b44f' : '0x98cA791fa6fcB03c0Bb6BBFFDf5357754EA77495',
    signMessage: jest.fn(),
    signTypedData: jest.fn(),
  })),
}));

describe('SessionWallet', () => {
  let sessionWallet: SessionWallet;

  beforeEach(() => {
    jest.clearAllMocks();
    (SecureStore as any).__clear();
    sessionWallet = new SessionWallet();
  });

  describe('initialization', () => {
    it('should create new wallets when none exist', async () => {
      await sessionWallet.init();

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'main_wallet_key',
        expect.any(String)
      );
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'session_key',
        expect.any(String)
      );
    });

    it('should load existing wallets', async () => {
      (SecureStore as any).__setMockData({
        main_wallet_key: '0xmain',
        session_key: '0xsession',
      });

      await sessionWallet.init();

      expect(sessionWallet.getMainAccount()?.address).toBe('0x6999c3aeD0a9241C07CdF2c8fBD38d858476b44f');
      expect(sessionWallet.getSessionAccount()?.address).toBe('0x98cA791fa6fcB03c0Bb6BBFFDf5357754EA77495');
    });
  });

  describe('session key generation', () => {
    it('should generate new session key with expiry', async () => {
      await sessionWallet.init();
      const newSessionKey = await sessionWallet.generateNewSessionKey();

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'session_key',
        expect.any(String)
      );
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'session_key_expiry',
        expect.any(String)
      );
      expect(newSessionKey).toBeDefined();
    });

    it('should check session key validity', async () => {
      await sessionWallet.init();
      
      // Set expired session key
      const expiredTime = Math.floor(Date.now() / 1000) - 3600;
      (SecureStore as any).__setMockData({
        session_key_expiry: expiredTime.toString(),
      });

      const isValid = await sessionWallet.isSessionKeyValid();
      expect(isValid).toBe(false);
    });
  });

  describe('main wallet key retrieval', () => {
    it('should return main wallet private key', async () => {
      (SecureStore as any).__setMockData({
        main_wallet_key: '0xmainprivatekey',
      });

      await sessionWallet.init();
      const mainKey = await sessionWallet.getMainWalletKey();

      expect(mainKey).toBe('0xmainprivatekey');
    });
  });
});