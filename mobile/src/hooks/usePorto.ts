/**
 * React Hook for Porto Relayer
 * 
 * Provides gasless transaction functionality via Porto
 */

import { useState, useEffect, useCallback } from 'react';
import { portoClient } from '../lib/portoClient.native';
import { PORTO_CONFIG, TX_STATUS, PORTO_ERRORS } from '../config/porto';

export interface TransactionResult {
  bundleId: string;
  status: 'pending' | 'success' | 'failed';
  receipt?: any;
  error?: string;
}

export interface UsePortoReturn {
  isReady: boolean;
  isHealthy: boolean;
  sendTransaction: (to: string, data: string, value?: string) => Promise<TransactionResult>;
  checkStatus: (bundleId: string) => Promise<TransactionResult>;
  pendingTransactions: Map<string, TransactionResult>;
  clearTransaction: (bundleId: string) => void;
}

/**
 * Hook for Porto relayer functionality
 */
export function usePorto(privateKey?: string): UsePortoReturn {
  const [isReady, setIsReady] = useState(false);
  const [isHealthy, setIsHealthy] = useState(false);
  const [pendingTransactions, setPendingTransactions] = useState<Map<string, TransactionResult>>(
    new Map()
  );

  // Initialize Porto client
  useEffect(() => {
    const initPorto = async () => {
      if (!privateKey) return;

      try {
        await portoClient.init(privateKey);
        setIsReady(true);

        // Check health
        const healthy = await portoClient.checkHealth();
        setIsHealthy(healthy);
        
        if (healthy) {
          console.log('[usePorto] Porto relayer is healthy');
        } else {
          console.warn('[usePorto] Porto relayer health check failed');
        }
      } catch (error) {
        console.error('[usePorto] Failed to initialize:', error);
        setIsReady(false);
      }
    };

    initPorto();
  }, [privateKey]);

  /**
   * Send a gasless transaction
   */
  const sendTransaction = useCallback(async (
    to: string,
    data: string,
    value: string = '0x0'
  ): Promise<TransactionResult> => {
    if (!isReady) {
      throw new Error(PORTO_ERRORS.NOT_INITIALIZED);
    }

    try {
      console.log('[usePorto] Sending gasless transaction...');
      
      // Execute transaction
      const { bundleId, status } = await portoClient.executeGaslessTransaction(
        to,
        data,
        value
      );

      // Create initial result
      const result: TransactionResult = {
        bundleId,
        status: 'pending',
      };

      // Update pending transactions
      setPendingTransactions(prev => {
        const updated = new Map(prev);
        updated.set(bundleId, result);
        return updated;
      });

      // Start monitoring status
      monitorTransaction(bundleId);

      return result;
    } catch (error: any) {
      console.error('[usePorto] Transaction failed:', error);
      
      const result: TransactionResult = {
        bundleId: '',
        status: 'failed',
        error: error.message || 'Transaction failed',
      };

      return result;
    }
  }, [isReady]);

  /**
   * Check transaction status
   */
  const checkStatus = useCallback(async (
    bundleId: string
  ): Promise<TransactionResult> => {
    if (!isReady) {
      throw new Error(PORTO_ERRORS.NOT_INITIALIZED);
    }

    try {
      const status = await portoClient.getCallsStatus(bundleId);
      
      // Determine status
      let txStatus: 'pending' | 'success' | 'failed' = 'pending';
      if (status.status === TX_STATUS.SUCCESS || status.status === 1) {
        txStatus = 'success';
      } else if (status.status >= TX_STATUS.FAILED) {
        txStatus = 'failed';
      }

      const result: TransactionResult = {
        bundleId,
        status: txStatus,
        receipt: status.receipts?.[0],
      };

      // Update pending transactions
      setPendingTransactions(prev => {
        const updated = new Map(prev);
        updated.set(bundleId, result);
        return updated;
      });

      return result;
    } catch (error: any) {
      console.error('[usePorto] Status check failed:', error);
      throw error;
    }
  }, [isReady]);

  /**
   * Monitor transaction status
   */
  const monitorTransaction = useCallback(async (bundleId: string) => {
    let attempts = 0;
    const maxAttempts = PORTO_CONFIG.maxStatusChecks;
    
    const checkInterval = setInterval(async () => {
      attempts++;
      
      try {
        const result = await checkStatus(bundleId);
        
        // Stop monitoring if transaction is complete
        if (result.status !== 'pending') {
          clearInterval(checkInterval);
          console.log(`[usePorto] Transaction ${bundleId} ${result.status}`);
        }
      } catch (error) {
        console.error('[usePorto] Status check error:', error);
      }
      
      // Stop after max attempts
      if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        console.warn(`[usePorto] Transaction ${bundleId} monitoring timeout`);
      }
    }, PORTO_CONFIG.statusCheckInterval);
    
    // Clean up on unmount
    return () => clearInterval(checkInterval);
  }, [checkStatus]);

  /**
   * Clear transaction from pending list
   */
  const clearTransaction = useCallback((bundleId: string) => {
    setPendingTransactions(prev => {
      const updated = new Map(prev);
      updated.delete(bundleId);
      return updated;
    });
  }, []);

  return {
    isReady,
    isHealthy,
    sendTransaction,
    checkStatus,
    pendingTransactions,
    clearTransaction,
  };
}