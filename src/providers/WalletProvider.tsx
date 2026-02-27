import React, { createContext, useContext, useRef, useState, ReactNode } from 'react';
import { PublicKey } from '@solana/web3.js';
import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { Buffer } from 'buffer';
import bs58 from 'bs58';
import { connection } from '../utils/solana';

const IDENTITY = {
  name: '神社许愿墙',
  uri: 'https://wishwall.app',
  icon: '/icon.png',
} as const;

interface WalletContextType {
  publicKey: PublicKey | null;
  connected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  signAndSendTransaction: (transaction: any) => Promise<string>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [connected, setConnected] = useState(false);
  // 保存 auth_token，用于后续 reauthorize（不再重新选账户）
  const authTokenRef = useRef<string | null>(null);

  const connect = async () => {
    await transact(async (wallet) => {
      const result = await wallet.authorize({
        cluster: 'devnet',
        identity: IDENTITY,
      });

      authTokenRef.current = result.auth_token;
      const pubKey = new PublicKey(Buffer.from(result.accounts[0].address, 'base64'));
      setPublicKey(pubKey);
      setConnected(true);
      console.log('✅ Wallet connected:', pubKey.toBase58());
    });
  };

  const disconnect = () => {
    authTokenRef.current = null;
    setPublicKey(null);
    setConnected(false);
  };

  const signAndSendTransaction = async (transaction: any): Promise<string> => {
    if (!publicKey) throw new Error('Wallet not connected');

    const [sigBytes] = await transact(async (wallet) => {
      // 用 reauthorize 确保使用同一账户，不弹出账户选择界面
      if (authTokenRef.current) {
        try {
          const reAuthResult = await wallet.reauthorize({
            auth_token: authTokenRef.current,
            identity: IDENTITY,
          });
          authTokenRef.current = reAuthResult.auth_token;
        } catch {
          // token 过期则重新授权
          const authResult = await wallet.authorize({ cluster: 'devnet', identity: IDENTITY });
          authTokenRef.current = authResult.auth_token;
        }
      } else {
        const authResult = await wallet.authorize({ cluster: 'devnet', identity: IDENTITY });
        authTokenRef.current = authResult.auth_token;
      }

      // 让钱包直接签名+广播，不再手动序列化和提交
      return wallet.signAndSendTransactions({ transactions: [transaction] });
    });

    // sigBytes 是 64 字节的交易签名，转为 base58 字符串
    const signature = bs58.encode(Buffer.from(sigBytes));
    console.log('📤 Transaction sent:', signature);

    await connection.confirmTransaction(signature, 'confirmed');
    console.log('✅ Transaction confirmed:', signature);

    return signature;
  };

  return (
    <WalletContext.Provider value={{ publicKey, connected, connect, disconnect, signAndSendTransaction }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextType {
  const context = useContext(WalletContext);
  if (!context) throw new Error('useWallet must be used within WalletProvider');
  return context;
}
