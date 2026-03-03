use anchor_lang::prelude::*;

/// Global state for the wish wall program
#[account]
pub struct WishWallState {
    /// Program authority (admin)
    pub authority: Pubkey,
    /// Total number of wishes created
    pub total_wishes: u64,
    /// PDA bump seed
    pub bump: u8,
}

impl WishWallState {
    /// Calculate space needed for WishWallState account
    pub const LEN: usize = 8 + // discriminator
        32 + // authority (Pubkey)
        8 +  // total_wishes (u64)
        1;   // bump (u8)
}

/// Individual wish account
#[account]
pub struct Wish {
    /// Owner of the wish (wallet address)
    pub owner: Pubkey,
    /// Unique wish ID
    pub wish_id: u64,
    /// Wish content (max 500 characters)
    pub content: String,
    /// Nickname of the wisher (max 50 characters)
    pub nickname: String,
    /// Creation timestamp (Unix timestamp)
    pub created_at: i64,
    /// Current status of the wish
    pub status: WishStatus,
    /// NFT mint address
    pub nft_mint: Pubkey,
    /// Total donations received (in lamports)
    pub total_donations: u64,
    /// PDA bump seed
    pub bump: u8,
}

impl Wish {
    /// Calculate space needed for Wish account
    /// Using max sizes: 280 chars for content (Twitter limit), 50 chars for nickname
    pub const MAX_CONTENT_LEN: usize = 280;
    pub const MAX_NICKNAME_LEN: usize = 50;

    pub const LEN: usize = 8 + // discriminator
        32 + // owner (Pubkey)
        8 +  // wish_id (u64)
        4 + Self::MAX_CONTENT_LEN * 4 + // content (String with UTF-8, max 4 bytes per char)
        4 + Self::MAX_NICKNAME_LEN * 4 + // nickname (String with UTF-8)
        8 +  // created_at (i64)
        1 +  // status (enum, 1 byte)
        32 + // nft_mint (Pubkey)
        8 +  // total_donations (u64)
        1;   // bump (u8)
        // Total: 8+32+8+(4+1120)+(4+200)+8+1+32+8+1 = 1426 bytes (~0.010 SOL)
}

/// Status of a wish
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum WishStatus {
    /// Initial state - wish is pending (yellow)
    Pending,
    /// Wish has been fulfilled (green)
    Fulfilled,
    /// Wish was not fulfilled (remains yellow)
    Unfulfilled,
}

impl Default for WishStatus {
    fn default() -> Self {
        WishStatus::Pending
    }
}
