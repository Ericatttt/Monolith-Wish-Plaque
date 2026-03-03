use anchor_lang::prelude::*;

#[error_code]
pub enum WishWallError {
    #[msg("Content exceeds maximum length of 500 characters")]
    ContentTooLong,

    #[msg("Nickname exceeds maximum length of 50 characters")]
    NicknameTooLong,

    #[msg("Only the wish owner can update the wish status")]
    UnauthorizedStatusUpdate,

    #[msg("Invalid donation amount")]
    InvalidDonationAmount,

    #[msg("Content cannot be empty")]
    EmptyContent,

    #[msg("Nickname cannot be empty")]
    EmptyNickname,
}
