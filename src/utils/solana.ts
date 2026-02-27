import { Connection, PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { RPC_ENDPOINT, WISH_WALL_PROGRAM_ID, WISH_WALL_STATE_SEED, WISH_SEED } from './constants';
import idl from './wish_wall.json';

// Create connection
export const connection = new Connection(RPC_ENDPOINT, 'confirmed');

// Get or create Anchor Provider
export const getProvider = (wallet: any): AnchorProvider => {
  return new AnchorProvider(
    connection,
    wallet,
    AnchorProvider.defaultOptions()
  );
};

// Get Anchor Program instance
export const getProgram = (provider: AnchorProvider): Program => {
  return new Program(idl as anchor.Idl, provider);
};

// Derive WishWallState PDA
export const getWishWallStatePDA = (): [PublicKey, number] => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(WISH_WALL_STATE_SEED)],
    WISH_WALL_PROGRAM_ID
  );
};

// Derive Wish PDA
export const getWishPDA = (wishId: number): [PublicKey, number] => {
  const wishIdBuffer = Buffer.alloc(8);
  wishIdBuffer.writeBigUInt64LE(BigInt(wishId));

  return PublicKey.findProgramAddressSync(
    [Buffer.from(WISH_SEED), wishIdBuffer],
    WISH_WALL_PROGRAM_ID
  );
};

// Convert lamports to SOL
export const lamportsToSol = (lamports: number | anchor.BN): number => {
  const lamportsBN = typeof lamports === 'number' ? new anchor.BN(lamports) : lamports;
  return lamportsBN.toNumber() / 1_000_000_000;
};

// Convert SOL to lamports
export const solToLamports = (sol: number): anchor.BN => {
  return new anchor.BN(Math.floor(sol * 1_000_000_000));
};

// Format date from Unix timestamp
export const formatDate = (timestamp: anchor.BN): string => {
  const date = new Date(timestamp.toNumber() * 1000);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

// Truncate public key for display
export const truncatePublicKey = (publicKey: PublicKey | string, length: number = 8): string => {
  const key = typeof publicKey === 'string' ? publicKey : publicKey.toBase58();
  return `${key.slice(0, length)}...${key.slice(-length)}`;
};
