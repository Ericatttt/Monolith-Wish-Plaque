import { PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';

// Wish Status enum
export enum WishStatus {
  Pending = 'pending',
  Fulfilled = 'fulfilled',
  Unfulfilled = 'unfulfilled',
}

// Wish data structure
export interface Wish {
  owner: PublicKey;
  wishId: anchor.BN;
  content: string;
  nickname: string;
  createdAt: anchor.BN;
  status: WishStatus;
  nftMint: PublicKey;
  totalDonations: anchor.BN;
  bump: number;
}

// WishWallState data structure
export interface WishWallState {
  authority: PublicKey;
  totalWishes: anchor.BN;
  bump: number;
}

// Wish with PublicKey for display
export interface WishWithKey {
  publicKey: PublicKey;
  account: Wish;
}

// Navigation types
export type RootStackParamList = {
  Home: undefined;
  CreateWish: undefined;
  MyWishes: undefined;
  WishDetail: { wishPublicKey: string };
};

// Form data types
export interface CreateWishFormData {
  content: string;
  nickname: string;
}

// Donation modal data
export interface DonationData {
  wishPublicKey: PublicKey;
  wishOwner: PublicKey;
  wishId: number;
  wishContent: string;
}
