import { PublicKey, clusterApiUrl } from '@solana/web3.js';

// Program ID - 本地部署的 Program ID
export const WISH_WALL_PROGRAM_ID = new PublicKey(
  'BjqDFqtQoFVmH1HKEN8NUcTPrbhVXJZp7P8s2pibvL8M'
);

// Cluster configuration
export const CLUSTER = 'devnet';
export const RPC_ENDPOINT = 'https://solana-devnet.g.alchemy.com/v2/GfFV8EIArNgf-1Qb--xz841_8TDu2Sxz';

// PDA Seeds
export const WISH_WALL_STATE_SEED = 'wish-wall-state';
export const WISH_SEED = 'wish';

// UI Constants
export const MAX_CONTENT_LENGTH = 280; // Matches contract MAX_CONTENT_LEN (Twitter-style limit)
export const MAX_NICKNAME_LENGTH = 50;
export const WISHES_TO_DISPLAY = 20;

// Protocol fee (must match contract PROTOCOL_FEE)
export const PROTOCOL_FEE_LAMPORTS = 1_000_000; // 0.001 SOL
export const TREASURY_ADDRESS = 'WZKDQoF2Cx5rAFDKH3xjYiZbHNDmZgucsZLyQEAshtn';

// Lamports conversion
export const LAMPORTS_PER_SOL = 1_000_000_000;

// Colors for wish status
export const WISH_STATUS_COLORS = {
  pending: '#FFC107',    // 黄色
  fulfilled: '#4CAF50',  // 绿色
  unfulfilled: '#FFC107', // 黄色
};

