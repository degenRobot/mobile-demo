import { useState, useEffect, useCallback } from 'react';
import { SessionWallet } from '../lib/sessionWallet';
import { formatEther } from 'viem';
import { getBalance } from '../config/rpcClient';
import { usePorto } from './usePorto';

export function useWallet() {
  const [wallet] = useState(() => new SessionWallet());
  const [address, setAddress] = useState<string | null>(null);
  const [sessionAddress, setSessionAddress] = useState<string | null>(null);
  const [mainPrivateKey, setMainPrivateKey] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(true);
  
  // Initialize Porto with MAIN wallet key (not session key!)
  const porto = usePorto(mainPrivateKey || undefined);

  useEffect(() => {
    const initWallet = async () => {
      try {
        // Initialize main wallet
        await wallet.initMainWallet();
        const mainAddress = wallet.getMainAddress();
        setAddress(mainAddress);
        
        // Initialize session key
        await wallet.initSessionKey();
        const sessAddr = wallet.getSessionAddress();
        setSessionAddress(sessAddr);
        
        // Get MAIN wallet private key for Porto (not session key!)
        const { Storage } = await import('../lib/storage');
        const mainKey = await Storage.getItem('RISE_MAIN_WALLET_KEY');
        if (mainKey) {
          setMainPrivateKey(mainKey);
          console.log('[useWallet] Porto will use main wallet:', mainAddress);
        }
        
        // Get balance of main wallet
        if (mainAddress) {
          const bal = await getBalance(mainAddress);
          setBalance(formatEther(bal));
        }
      } catch (error) {
        console.error('Failed to initialize wallet:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initWallet();
  }, [wallet]);

  const refreshBalance = async () => {
    if (address) {
      const bal = await getBalance(address);
      setBalance(formatEther(bal));
    }
  };

  /**
   * Send gasless transaction via Porto
   */
  const sendGaslessTransaction = useCallback(async (
    to: string,
    data: string,
    value?: string
  ) => {
    if (!porto.isReady) {
      throw new Error('Porto not ready - wallet not initialized');
    }
    
    return await porto.sendTransaction(to, data, value);
  }, [porto]);

  /**
   * Execute Porto transaction via wallet (alternative method)
   */
  const executePortoTransaction = useCallback(async (
    to: string,
    data: string,
    value?: string
  ) => {
    return await wallet.executePortoTransaction(to, data, value || '0x0');
  }, [wallet]);

  return {
    address,
    sessionAddress,
    balance,
    isLoading,
    refreshBalance,
    wallet,
    porto: {
      isReady: porto.isReady,
      isHealthy: porto.isHealthy,
      sendTransaction: sendGaslessTransaction,
      executeTransaction: executePortoTransaction,
      checkStatus: porto.checkStatus,
      pendingTransactions: porto.pendingTransactions,
      clearTransaction: porto.clearTransaction,
    },
  };
}