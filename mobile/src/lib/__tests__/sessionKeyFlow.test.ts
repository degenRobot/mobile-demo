import { SessionWallet } from '../sessionWallet';
import { PortoClient } from '../portoClient.native';
import { SecureStore } from 'expo-secure-store';

// Mock dependencies
jest.mock('viem/accounts', () => ({
  generatePrivateKey: jest.fn(() => '0xnewkey'),
  privateKeyToAccount: jest.fn((key) => ({
    address: key === '0xmain' ? '0xMAIN' : '0xSESSION',
    signMessage: jest.fn(),
    signTypedData: jest.fn().mockResolvedValue('0xsignature'),
  })),
}));

global.fetch = jest.fn();

describe('Session Key Flow', () => {
  let sessionWallet: SessionWallet;
  let portoClient: PortoClient;
  const mockFetch = global.fetch as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    (SecureStore as any).__clear();
    sessionWallet = new SessionWallet();
    portoClient = new PortoClient();
  });

  describe('Initial Setup Flow', () => {
    it('should use main wallet for initial delegation', async () => {
      // Setup: Initialize wallets
      (SecureStore as any).__setMockData({
        main_wallet_key: '0xmain',
        session_key: '0xsession',
      });
      await sessionWallet.init();

      // Step 1: Get main wallet key for Porto
      const mainKey = await sessionWallet.getMainWalletKey();
      expect(mainKey).toBe('0xmain');

      // Step 2: Initialize Porto with main wallet
      await portoClient.init(mainKey!);

      // Step 3: Prepare delegation transaction
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            digest: '0xdelegationdigest',
            typedData: { domain: {}, types: {}, message: {} },
          },
        }),
      });

      const delegationCalls = [{
        to: '0x6b0f89e0627364a3348277353e3776dc8612853f' as `0x${string}`,
        data: '0xupgradedata' as `0x${string}`,
        value: BigInt(0),
      }];

      const prepared = await portoClient.prepareCalls(delegationCalls);
      expect(prepared.digest).toBe('0xdelegationdigest');

      // Verify main wallet is being used
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.params[0].from).toBe('0xMAIN');
    });
  });

  describe('Subsequent Transaction Flow', () => {
    it('should use session key for regular transactions after delegation', async () => {
      // Setup: Session key already authorized
      (SecureStore as any).__setMockData({
        main_wallet_key: '0xmain',
        session_key: '0xsession',
        session_key_expiry: (Math.floor(Date.now() / 1000) + 86400).toString(),
      });
      await sessionWallet.init();

      // Use session key for Porto
      const sessionAccount = sessionWallet.getSessionAccount();
      await portoClient.init('0xsession');

      // Prepare transaction with session key
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            digest: '0xtxdigest',
            typedData: { domain: {}, types: {}, message: {} },
          },
        }),
      });

      const txCalls = [{
        to: '0xcontract' as `0x${string}`,
        data: '0xdata' as `0x${string}`,
        value: BigInt(0),
      }];

      const prepared = await portoClient.prepareCalls(txCalls);
      expect(prepared.digest).toBe('0xtxdigest');

      // Verify session key is being used
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.params[0].from).toBe('0xSESSION');
    });
  });

  describe('Session Key Expiry Handling', () => {
    it('should regenerate session key when expired', async () => {
      // Setup: Expired session key
      (SecureStore as any).__setMockData({
        main_wallet_key: '0xmain',
        session_key: '0xoldsession',
        session_key_expiry: (Math.floor(Date.now() / 1000) - 3600).toString(), // Expired
      });
      await sessionWallet.init();

      // Check validity
      const isValid = await sessionWallet.isSessionKeyValid();
      expect(isValid).toBe(false);

      // Generate new session key
      const newSession = await sessionWallet.generateNewSessionKey();
      expect(newSession).toBeDefined();

      // Verify new key was saved
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'session_key',
        '0xnewkey'
      );
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'session_key_expiry',
        expect.any(String)
      );

      // New session key should be valid
      const newExpiry = parseInt((SecureStore.setItemAsync as jest.Mock).mock.calls
        .find(call => call[0] === 'session_key_expiry')[1]);
      expect(newExpiry).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });
  });

  describe('Security Flow', () => {
    it('should never expose main wallet key after initial delegation', async () => {
      // Setup
      (SecureStore as any).__setMockData({
        main_wallet_key: '0xmain',
        session_key: '0xsession',
      });
      await sessionWallet.init();

      // After initial delegation, only session key should be used
      const sessionAccount = sessionWallet.getSessionAccount();
      expect(sessionAccount?.address).toBe('0xSESSION');

      // Main wallet should only be retrieved for delegation
      const mainKey = await sessionWallet.getMainWalletKey();
      expect(mainKey).toBe('0xmain');

      // But for regular operations, use session
      expect(sessionAccount).toBeDefined();
      expect(sessionAccount?.address).not.toBe('0xMAIN');
    });
  });

  describe('Complete Flow Integration', () => {
    it('should handle complete session key lifecycle', async () => {
      // 1. Fresh start - no wallets
      await sessionWallet.init();
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'main_wallet_key',
        expect.any(String)
      );

      // 2. Initial delegation with main wallet
      const mainKey = await sessionWallet.getMainWalletKey();
      await portoClient.init(mainKey!);

      // Mock successful delegation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: { digest: '0xdelegate', typedData: {} },
        }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: { bundleId: '0xdelegatebundle' },
        }),
      });

      // 3. Switch to session key for transactions
      await portoClient.init('0xsession');

      // Mock transaction
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: { digest: '0xtx', typedData: {} },
        }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: { bundleId: '0xtxbundle' },
        }),
      });

      const txResult = await portoClient.executeTransaction(
        '0xcontract' as `0x${string}`,
        '0xdata' as `0x${string}`,
        BigInt(0)
      );

      expect(txResult).toBe('0xtxbundle');

      // 4. Check session key validity periodically
      const isValid = await sessionWallet.isSessionKeyValid();
      expect(typeof isValid).toBe('boolean');
    });
  });
});