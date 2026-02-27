import { Keypair, PublicKey } from '@solana/web3.js';

// 开发模式：使用固定的测试钱包
// ⚠️ 仅用于本地测试，不要在生产环境使用

// 创建一个固定的测试密钥对（或者使用现有的）
const DEV_SECRET_KEY = new Uint8Array([
  174, 47, 154, 16, 202, 193, 206, 113, 199, 190, 53, 133, 169, 175, 31, 56,
  222, 53, 138, 189, 224, 216, 117, 173, 10, 149, 53, 45, 73, 251, 237, 246,
  245, 173, 172, 95, 95, 67, 211, 231, 28, 109, 152, 42, 217, 209, 94, 159,
  103, 24, 79, 139, 42, 133, 121, 137, 126, 151, 191, 30, 218, 125, 157, 40,
]);

export const devKeypair = Keypair.fromSecretKey(DEV_SECRET_KEY);

export const DEV_WALLET = {
  publicKey: devKeypair.publicKey,
  secretKey: devKeypair.secretKey,
};

export const isDevelopmentMode = () => {
  // 检测是否在开发环境
  return __DEV__ || process.env.NODE_ENV === 'development';
};

console.log('Dev Wallet Address:', DEV_WALLET.publicKey.toBase58());
