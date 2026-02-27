import { PublicKey, clusterApiUrl } from '@solana/web3.js';

// Program ID - 本地部署的 Program ID
export const WISH_WALL_PROGRAM_ID = new PublicKey(
  'HXP5UvapL8Pv9P1vY7LYhAMv2VcbJZnn7zhfRJ9Eb8Bv'
);

// Cluster configuration
export const CLUSTER = 'devnet';
export const RPC_ENDPOINT = 'https://solana-devnet.g.alchemy.com/v2/GfFV8EIArNgf-1Qb--xz841_8TDu2Sxz';

// PDA Seeds
export const WISH_WALL_STATE_SEED = 'wish-wall-state';
export const WISH_SEED = 'wish';

// UI Constants
export const MAX_CONTENT_LENGTH = 500;
export const MAX_NICKNAME_LENGTH = 50;
export const WISHES_TO_DISPLAY = 20;

// Lamports conversion
export const LAMPORTS_PER_SOL = 1_000_000_000;

// Colors for wish status
export const WISH_STATUS_COLORS = {
  pending: '#FFC107',    // 黄色
  fulfilled: '#4CAF50',  // 绿色
  unfulfilled: '#FFC107', // 黄色
};

