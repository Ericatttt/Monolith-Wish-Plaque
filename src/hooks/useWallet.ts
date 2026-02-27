import { useState, useCallback, useEffect } from 'react';
import { useWallet as useWalletContext } from '../providers/WalletProvider';
import { connection } from '../utils/solana';

export const useWallet = () => {
  const {
    connect: walletConnect,
    disconnect: walletDisconnect,
    publicKey,
    connected,
  } = useWalletContext();

  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Connect wallet
  const connect = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🔌 Connecting wallet...');
      await walletConnect();
      console.log('✅ Wallet connected');
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
      console.error('❌ Wallet connection error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [walletConnect]);

  // Disconnect wallet
  const disconnect = useCallback(async () => {
    try {
      console.log('🔌 Disconnecting wallet...');
      walletDisconnect();
      setBalance(0);
      console.log('✅ Wallet disconnected');
    } catch (err: any) {
      console.error('❌ Disconnect error:', err);
    }
  }, [walletDisconnect]);

  // Refresh balance
  const refreshBalance = useCallback(async () => {
    if (!publicKey) return;

    try {
      const bal = await connection.getBalance(publicKey);
      setBalance(bal / 1_000_000_000);
      console.log('💰 Balance updated:', bal / 1_000_000_000, 'SOL');
    } catch (err) {
      console.error('Failed to refresh balance:', err);
    }
  }, [publicKey]);

  // Fetch balance when wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      refreshBalance();
    }
  }, [connected, publicKey, refreshBalance]);

  // Auto-refresh balance periodically
  useEffect(() => {
    if (!connected || !publicKey) return;

    const interval = setInterval(() => {
      refreshBalance();
    }, 30000);

    return () => clearInterval(interval);
  }, [connected, publicKey, refreshBalance]);

  return {
    publicKey,
    isConnected: connected,
    balance,
    connect,
    disconnect,
    refreshBalance,
    isLoading,
    error,
  };
};
