import { useCallback } from 'react';
import { PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { useWallet as useWalletContext } from '../providers/WalletProvider';
import {
  getWishWallStatePDA,
  getWishPDA,
  connection,
} from '../utils/solana';
import { WishStatus } from '../types';
import { WISH_WALL_PROGRAM_ID, TREASURY_ADDRESS } from '../utils/constants';

// Instruction discriminators from IDL
const DISCRIMINATORS = {
  createWish:       new Uint8Array([47,  64, 159, 45,  95,  19,  61, 165]),
  updateWishStatus: new Uint8Array([112, 35,   2, 99, 119, 226, 112,  55]),
  donateToWish:     new Uint8Array([214, 30,  39, 19,  82,  94, 204, 106]),
};

// Borsh encode a string: 4-byte LE u32 length + UTF-8 bytes
function encodeString(str: string): Buffer {
  const strBytes = Buffer.from(str, 'utf8');
  const lenBuf = Buffer.alloc(4);
  const view = new DataView(lenBuf.buffer);
  view.setUint32(0, strBytes.length, true);
  return Buffer.concat([lenBuf, strBytes]);
}

// Encode u64 as 8-byte little-endian (safe for values < 2^53)
function encodeU64(value: number): Buffer {
  const buf = Buffer.alloc(8);
  const view = new DataView(buf.buffer);
  view.setUint32(0, value >>> 0, true);
  view.setUint32(4, Math.floor(value / 0x100000000) >>> 0, true);
  return buf;
}

export const useProgram = () => {
  const { publicKey, signAndSendTransaction } = useWalletContext();

  // Create a new wish
  const createWish = useCallback(
    async (content: string, nickname: string): Promise<string> => {
      if (!publicKey) {
        throw new Error('Wallet not connected');
      }

      console.log('📝 Creating wish...');
      const [statePda] = getWishWallStatePDA();

      try {
        // Fetch state (raw parsing — avoids BorshCoder/readUIntLE issue in Hermes)
        console.log('📊 Fetching program state...');
        const stateInfo = await connection.getAccountInfo(statePda);
        if (!stateInfo) {
          throw new Error('Program not initialized');
        }
        // WishWallState layout: 8 discriminator + 32 authority + 8 total_wishes + 1 bump
        const dv = new DataView(stateInfo.data.buffer, stateInfo.data.byteOffset);
        const totalWishes = dv.getUint32(40, true) + dv.getUint32(44, true) * 0x100000000;
        const nextWishId = totalWishes + 1;
        console.log('🆔 Next wish ID:', nextWishId);

        const [wishPda] = getWishPDA(nextWishId);

        // Build instruction data (Borsh: discriminator + string + string)
        const data = Buffer.concat([
          Buffer.from(DISCRIMINATORS.createWish),
          encodeString(content),
          encodeString(nickname),
        ]);

        const treasuryPubkey = new PublicKey(TREASURY_ADDRESS);

        const ix = new TransactionInstruction({
          programId: WISH_WALL_PROGRAM_ID,
          keys: [
            { pubkey: statePda,                  isSigner: false, isWritable: true  },
            { pubkey: wishPda,                   isSigner: false, isWritable: true  },
            { pubkey: publicKey,                 isSigner: true,  isWritable: true  },
            { pubkey: treasuryPubkey,            isSigner: false, isWritable: true  },
            { pubkey: SystemProgram.programId,   isSigner: false, isWritable: false },
          ],
          data,
        });

        const tx = new Transaction();
        tx.add(ix);
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        tx.feePayer = publicKey;

        console.log('📤 Signing and sending transaction...');
        const signature = await signAndSendTransaction(tx);
        console.log('✅ Wish created:', signature);
        return signature;
      } catch (error: any) {
        console.error('❌ Error creating wish:', error);
        throw error;
      }
    },
    [publicKey, signAndSendTransaction]
  );

  // Update wish status
  const updateWishStatus = useCallback(
    async (wishId: number, status: WishStatus): Promise<string> => {
      if (!publicKey) {
        throw new Error('Wallet not connected');
      }

      console.log('🔄 Updating wish status...');
      const [wishPda] = getWishPDA(wishId);

      // WishStatus enum variant index: Pending=0, Fulfilled=1, Unfulfilled=2
      const variantMap: Record<WishStatus, number> = {
        [WishStatus.Pending]:     0,
        [WishStatus.Fulfilled]:   1,
        [WishStatus.Unfulfilled]: 2,
      };

      const data = Buffer.concat([
        Buffer.from(DISCRIMINATORS.updateWishStatus),
        Buffer.from([variantMap[status] ?? 0]),
      ]);

      const ix = new TransactionInstruction({
        programId: WISH_WALL_PROGRAM_ID,
        keys: [
          { pubkey: wishPda,   isSigner: false, isWritable: true },
          { pubkey: publicKey, isSigner: true,  isWritable: false },
        ],
        data,
      });

      const tx = new Transaction();
      tx.add(ix);
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      tx.feePayer = publicKey;

      console.log('📤 Signing and sending transaction...');
      const signature = await signAndSendTransaction(tx);
      console.log('✅ Status updated:', signature);
      return signature;
    },
    [publicKey, signAndSendTransaction]
  );

  // Donate to a wish
  const donateToWish = useCallback(
    async (wishId: number, wishOwner: PublicKey, amount: BN): Promise<string> => {
      if (!publicKey) {
        throw new Error('Wallet not connected');
      }

      console.log('💰 Donating to wish...');
      const [wishPda] = getWishPDA(wishId);

      const data = Buffer.concat([
        Buffer.from(DISCRIMINATORS.donateToWish),
        encodeU64(amount.toNumber()),
      ]);

      const ix = new TransactionInstruction({
        programId: WISH_WALL_PROGRAM_ID,
        keys: [
          { pubkey: wishPda,                  isSigner: false, isWritable: true  },
          { pubkey: publicKey,                isSigner: true,  isWritable: true  },
          { pubkey: wishOwner,                isSigner: false, isWritable: true  },
          { pubkey: SystemProgram.programId,  isSigner: false, isWritable: false },
        ],
        data,
      });

      const tx = new Transaction();
      tx.add(ix);
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      tx.feePayer = publicKey;

      console.log('📤 Signing and sending transaction...');
      const signature = await signAndSendTransaction(tx);
      console.log('✅ Donation sent:', signature);
      return signature;
    },
    [publicKey, signAndSendTransaction]
  );

  return { createWish, updateWishStatus, donateToWish };
};
