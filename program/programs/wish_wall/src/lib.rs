use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

mod state;
mod error;

use state::*;
use error::*;

declare_id!("BjqDFqtQoFVmH1HKEN8NUcTPrbhVXJZp7P8s2pibvL8M");

/// Protocol fee per wish creation: 0.001 SOL (in lamports)
pub const PROTOCOL_FEE: u64 = 1_000_000;

/// Treasury wallet address that receives the protocol fee
pub const TREASURY_STR: &str = "WZKDQoF2Cx5rAFDKH3xjYiZbHNDmZgucsZLyQEAshtn";

#[program]
pub mod wish_wall {
    use super::*;

    /// Initialize the wish wall program
    /// Creates the global state account
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let state = &mut ctx.accounts.state;
        state.authority = ctx.accounts.authority.key();
        state.total_wishes = 0;
        state.bump = ctx.bumps.state;

        msg!("Wish Wall initialized by: {}", ctx.accounts.authority.key());
        Ok(())
    }

    /// Create a new wish
    /// Note: NFT minting will be added in a future update
    pub fn create_wish(
        ctx: Context<CreateWish>,
        content: String,
        nickname: String,
    ) -> Result<()> {
        // Validate input
        require!(!content.is_empty(), WishWallError::EmptyContent);
        require!(!nickname.is_empty(), WishWallError::EmptyNickname);
        require!(
            content.chars().count() <= Wish::MAX_CONTENT_LEN,
            WishWallError::ContentTooLong
        );
        require!(
            nickname.chars().count() <= Wish::MAX_NICKNAME_LEN,
            WishWallError::NicknameTooLong
        );

        let state = &mut ctx.accounts.state;
        let wish = &mut ctx.accounts.wish;
        let clock = Clock::get()?;

        // Increment total wishes counter
        state.total_wishes = state.total_wishes.checked_add(1).unwrap();

        // Initialize wish account
        wish.owner = ctx.accounts.owner.key();
        wish.wish_id = state.total_wishes;
        wish.content = content.clone();
        wish.nickname = nickname.clone();
        wish.created_at = clock.unix_timestamp;
        wish.status = WishStatus::Pending;
        wish.nft_mint = Pubkey::default(); // Will be set when NFT feature is added
        wish.total_donations = 0;
        wish.bump = ctx.bumps.wish;

        // Transfer protocol fee to treasury
        let fee_transfer = Transfer {
            from: ctx.accounts.owner.to_account_info(),
            to: ctx.accounts.treasury.to_account_info(),
        };
        let fee_cpi_ctx = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            fee_transfer,
        );
        transfer(fee_cpi_ctx, PROTOCOL_FEE)?;

        msg!("Wish #{} created by {}: {}", wish.wish_id, wish.nickname, content);
        msg!("Protocol fee {} lamports sent to treasury", PROTOCOL_FEE);
        Ok(())
    }

    /// Update the status of a wish (for fulfillment)
    pub fn update_wish_status(
        ctx: Context<UpdateWishStatus>,
        new_status: WishStatus,
    ) -> Result<()> {
        let wish = &mut ctx.accounts.wish;

        // Only the owner can update the status
        require!(
            wish.owner == ctx.accounts.owner.key(),
            WishWallError::UnauthorizedStatusUpdate
        );

        wish.status = new_status.clone();

        match new_status {
            WishStatus::Fulfilled => msg!("Wish #{} marked as fulfilled!", wish.wish_id),
            WishStatus::Unfulfilled => msg!("Wish #{} marked as unfulfilled", wish.wish_id),
            _ => msg!("Wish #{} status updated", wish.wish_id),
        }

        Ok(())
    }

    /// Donate SOL to support a wish
    pub fn donate_to_wish(
        ctx: Context<DonateToWish>,
        amount: u64,
    ) -> Result<()> {
        require!(amount > 0, WishWallError::InvalidDonationAmount);

        let wish = &mut ctx.accounts.wish;

        // Transfer SOL from donor to wish owner
        let transfer_accounts = Transfer {
            from: ctx.accounts.donor.to_account_info(),
            to: ctx.accounts.wish_owner.to_account_info(),
        };

        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            transfer_accounts,
        );

        transfer(cpi_context, amount)?;

        // Update donation counter
        wish.total_donations = wish.total_donations.checked_add(amount).unwrap();

        msg!(
            "Donated {} lamports to wish #{}. Total donations: {}",
            amount,
            wish.wish_id,
            wish.total_donations
        );

        Ok(())
    }
}

// ============================================================================
// Context Structs
// ============================================================================

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = WishWallState::LEN,
        seeds = [b"wish-wall-state"],
        bump
    )]
    pub state: Account<'info, WishWallState>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateWish<'info> {
    #[account(
        mut,
        seeds = [b"wish-wall-state"],
        bump = state.bump
    )]
    pub state: Account<'info, WishWallState>,

    #[account(
        init,
        payer = owner,
        space = Wish::LEN,
        seeds = [
            b"wish",
            (state.total_wishes + 1).to_le_bytes().as_ref()
        ],
        bump
    )]
    pub wish: Account<'info, Wish>,

    #[account(mut)]
    pub owner: Signer<'info>,

    /// CHECK: Treasury wallet that receives the protocol fee
    #[account(mut, address = TREASURY_STR.parse::<Pubkey>().unwrap())]
    pub treasury: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateWishStatus<'info> {
    #[account(
        mut,
        seeds = [
            b"wish",
            wish.wish_id.to_le_bytes().as_ref()
        ],
        bump = wish.bump
    )]
    pub wish: Account<'info, Wish>,

    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct DonateToWish<'info> {
    #[account(
        mut,
        seeds = [
            b"wish",
            wish.wish_id.to_le_bytes().as_ref()
        ],
        bump = wish.bump
    )]
    pub wish: Account<'info, Wish>,

    #[account(mut)]
    pub donor: Signer<'info>,

    /// CHECK: This is the wish owner's account that will receive the donation
    #[account(mut, address = wish.owner)]
    pub wish_owner: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}
