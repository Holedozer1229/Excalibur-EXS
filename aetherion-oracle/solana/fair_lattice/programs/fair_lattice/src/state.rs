use anchor_lang::prelude::*;

pub const REF_CODE_LEN: usize = 16;
pub const LATTICE_SEED: &[u8] = b"lattice";
pub const VAULT_SEED: &[u8] = b"vault";
pub const REF_ATTR_SEED: &[u8] = b"ref_attr";

#[account]
#[derive(InitSpace)]
pub struct LatticeState {
    pub authority: Pubkey,
    pub mint: Pubkey,
    /// Lamports per token (p0).
    pub p0: u64,
    pub scale: u64,
    /// Curvature n × 100 (250 = steep 2.5).
    pub n_centis: u16,
    pub tokens_sold: u64,
    pub fee_bps: u32,
    pub total_volume_lamports: u64,
    pub total_fee_lamports: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct ReferralAttribute {
    pub referrer: Pubkey,
    pub trader: Pubkey,
    pub code: [u8; REF_CODE_LEN],
    pub volume_lamports: u64,
    pub swap_count: u32,
    pub bump: u8,
}
