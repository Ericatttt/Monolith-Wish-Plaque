import { useState, useEffect, useCallback } from 'react';
import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { connection, getWishWallStatePDA, getWishPDA } from '../utils/solana';
import { WishWithKey, WishStatus, Wish } from '../types';

const BATCH_SIZE = 100;

// ── Raw byte helpers ──────────────────────────────────────────────────────────

function readU32LE(data: Uint8Array, offset: number): number {
  return (
    (data[offset]) |
    (data[offset + 1] << 8) |
    (data[offset + 2] << 16) |
    (data[offset + 3] << 24)
  ) >>> 0;
}

function readU64LE(data: Uint8Array, offset: number): number {
  const lo = readU32LE(data, offset);
  const hi = readU32LE(data, offset + 4);
  return hi * 0x100000000 + lo;
}

function readString(data: Uint8Array, offset: number): [string, number] {
  const len = readU32LE(data, offset);
  offset += 4;
  const bytes = data.slice(offset, offset + len);
  const str = Buffer.from(bytes).toString('utf8');
  return [str, offset + len];
}

// ── WishWallState parser ─────────────────────────────────────────────────────
// Layout: 8 disc | 32 authority | 8 total_wishes | 1 bump

function parseTotalWishes(data: Uint8Array): number {
  return readU64LE(data, 8 + 32); // skip discriminator + authority
}

// ── Wish account parser ──────────────────────────────────────────────────────
// Layout: 8 disc | 32 owner | 8 wish_id | 4+n content | 4+m nickname
//         | 8 created_at | 1 status | 32 nft_mint | 8 total_donations | 1 bump

function parseWishData(data: Uint8Array): Wish {
  let off = 8; // skip discriminator

  const owner = new PublicKey(data.slice(off, off + 32));
  off += 32;

  const wishId = readU64LE(data, off);
  off += 8;

  const [content, off2] = readString(data, off);
  off = off2;

  const [nickname, off3] = readString(data, off);
  off = off3;

  const createdAt = readU64LE(data, off);
  off += 8;

  const statusByte = data[off];
  off += 1;
  const status: WishStatus =
    statusByte === 1 ? WishStatus.Fulfilled :
    statusByte === 2 ? WishStatus.Unfulfilled :
    WishStatus.Pending;

  const nftMint = new PublicKey(data.slice(off, off + 32));
  off += 32;

  const totalDonations = readU64LE(data, off);
  off += 8;

  const bump = data[off];

  return {
    owner,
    wishId: new BN(wishId),
    content,
    nickname,
    createdAt: new BN(createdAt),
    status,
    nftMint,
    totalDonations: new BN(totalDonations),
    bump,
  };
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export const useWishes = (owner?: PublicKey) => {
  const [wishes, setWishes] = useState<WishWithKey[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWishes = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Step 1: 从 WishWallState 获取 total_wishes
      const [statePDA] = getWishWallStatePDA();
      const stateAccount = await connection.getAccountInfo(statePDA);

      if (!stateAccount) {
        setWishes([]);
        return;
      }

      const totalWishes = parseTotalWishes(stateAccount.data as Uint8Array);

      if (totalWishes === 0) {
        setWishes([]);
        return;
      }

      // Step 2: 推导所有 wish PDA（wish_id 从 1 开始）
      const wishPDAs: PublicKey[] = [];
      for (let id = 1; id <= totalWishes; id++) {
        const [wishPDA] = getWishPDA(id);
        wishPDAs.push(wishPDA);
      }

      // Step 3: 分批拉取账户数据
      const parsed: WishWithKey[] = [];

      for (let i = 0; i < wishPDAs.length; i += BATCH_SIZE) {
        const batch = wishPDAs.slice(i, i + BATCH_SIZE);
        const accounts = await connection.getMultipleAccountsInfo(batch);

        for (let j = 0; j < accounts.length; j++) {
          const accountInfo = accounts[j];
          if (!accountInfo) continue;

          const data = accountInfo.data as Uint8Array;
          if (data.length < 9) continue;

          try {
            const wish = parseWishData(data);

            if (owner && !wish.owner.equals(owner)) continue;

            parsed.push({ publicKey: wishPDAs[i + j], account: wish });
          } catch (e) {
            console.warn('Failed to parse wish:', wishPDAs[i + j].toBase58(), e);
          }
        }
      }

      // Sort newest first
      parsed.sort((a, b) => b.account.createdAt.toNumber() - a.account.createdAt.toNumber());

      setWishes(parsed);
    } catch (err: any) {
      const msg = err.message || 'Failed to fetch wishes';
      setError(msg);
      console.error('Error fetching wishes:', err);
    } finally {
      setIsLoading(false);
    }
  }, [owner]);

  useEffect(() => {
    fetchWishes();
  }, [fetchWishes]);

  const refresh = useCallback(() => {
    fetchWishes();
  }, [fetchWishes]);

  return { wishes, isLoading, error, refresh };
};
