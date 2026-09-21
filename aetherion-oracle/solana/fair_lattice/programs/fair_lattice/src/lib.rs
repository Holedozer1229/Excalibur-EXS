pub mod curve;
pub mod state;

use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount, Transfer};

use crate::curve::{split_fee, sol_for_tokens, tokens_for_sol, CurveParams, MAX_FEE_BPS};
use crate::state::{
    ReferralAttribute, LatticeState, LATTICE_SEED, REF_ATTR_SEED, REF_CODE_LEN, VAULT_SEED,
};

declare_id!("ALe6YqHU3rwxw8FQhmSRjdK9sxMLqbDd9zyRVNmTymo6");

#[program]
pub mod fair_lattice {
    use super::*;

    /// Initialize lattice state PDA only (split setup avoids BPF heap OOM).
    pub fn initialize_lattice(
        ctx: Context<InitializeLattice>,
        p0: u64,
        scale: u64,
        n_centis: u16,
        fee_bps: u32,
    ) -> Result<()> {
        require!(p0 > 0 && scale > 0, LatticeError::InvalidParams);
        require!(fee_bps <= MAX_FEE_BPS, LatticeError::FeeAboveCap);
        require!(n_centis <= 300, LatticeError::InvalidParams);

        let state = &mut ctx.accounts.lattice;
        state.authority = ctx.accounts.authority.key();
        state.mint = Pubkey::default();
        state.p0 = p0;
        state.scale = scale;
        state.n_centis = n_centis;
        state.tokens_sold = 0;
        state.fee_bps = fee_bps;
        state.total_volume_lamports = 0;
        state.total_fee_lamports = 0;
        state.bump = ctx.bumps.lattice;
        msg!("Lattice initialized");
        Ok(())
    }

    /// Create wURUU mint + vaults (second tx after initialize).
    pub fn setup_pool(ctx: Context<SetupPool>) -> Result<()> {
        let state = &mut ctx.accounts.lattice;
        state.mint = ctx.accounts.mint.key();
        msg!("Pool setup");
        Ok(())
    }

    /// Mint wURUU into the curve vault (call once after initialize).
    pub fn seed_vault(ctx: Context<SeedVault>, amount: u64) -> Result<()> {
        require!(amount > 0, LatticeError::ZeroAmount);
        let state = &ctx.accounts.lattice;
        let seeds = &[LATTICE_SEED, &[state.bump]];
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.token_vault.to_account_info(),
                    authority: state.to_account_info(),
                },
                &[&seeds[..]],
            ),
            amount,
        )?;
        Ok(())
    }

    /// Buy wURUU with SOL. Fee capped at 1% each way. Optional referral code attributes volume.
    pub fn buy(ctx: Context<Buy>, sol_in: u64, _ref_code: [u8; REF_CODE_LEN]) -> Result<()> {
        require!(sol_in > 0, LatticeError::ZeroAmount);
        let state = &mut ctx.accounts.lattice;
        let (fee, net) = split_fee(sol_in, state.fee_bps)?;

        let params = CurveParams {
            p0: state.p0,
            scale: state.scale,
            n_centis: state.n_centis,
        };
        let tokens_out = tokens_for_sol(net, state.tokens_sold, params)?;
        require!(tokens_out > 0, LatticeError::ZeroOutput);

        // SOL → vault
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to: ctx.accounts.sol_vault.to_account_info(),
                },
            ),
            sol_in,
        )?;

        // wURUU → buyer
        let seeds = &[LATTICE_SEED, &[state.bump]];
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.token_vault.to_account_info(),
                    to: ctx.accounts.buyer_token.to_account_info(),
                    authority: state.to_account_info(),
                },
                &[&seeds[..]],
            ),
            tokens_out,
        )?;

        state.tokens_sold = state
            .tokens_sold
            .checked_add(tokens_out)
            .ok_or(LatticeError::MathOverflow)?;
        state.total_volume_lamports = state
            .total_volume_lamports
            .checked_add(sol_in)
            .ok_or(LatticeError::MathOverflow)?;
        state.total_fee_lamports = state
            .total_fee_lamports
            .checked_add(fee)
            .ok_or(LatticeError::MathOverflow)?;

        msg!("Buy ok");
        Ok(())
    }

    /// Sell wURUU for SOL. Inverse integral — exit stays open.
    pub fn sell(ctx: Context<Sell>, tokens_in: u64, _ref_code: [u8; REF_CODE_LEN]) -> Result<()> {
        require!(tokens_in > 0, LatticeError::ZeroAmount);
        let state = &mut ctx.accounts.lattice;

        let params = CurveParams {
            p0: state.p0,
            scale: state.scale,
            n_centis: state.n_centis,
        };
        let gross_sol = sol_for_tokens(tokens_in, state.tokens_sold, params)?;
        require!(gross_sol > 0, LatticeError::ZeroOutput);

        let (fee, net_sol) = split_fee(gross_sol, state.fee_bps)?;
        require!(net_sol <= ctx.accounts.sol_vault.lamports(), LatticeError::InsufficientVault);

        // tokens → vault
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.seller_token.to_account_info(),
                    to: ctx.accounts.token_vault.to_account_info(),
                    authority: ctx.accounts.seller.to_account_info(),
                },
            ),
            tokens_in,
        )?;

        state.tokens_sold = state
            .tokens_sold
            .checked_sub(tokens_in)
            .ok_or(LatticeError::MathOverflow)?;

        // SOL → seller from vault PDA (direct lamport debit; system CPI cannot sign vault PDA)
        **ctx.accounts.sol_vault.try_borrow_mut_lamports()? = ctx
            .accounts
            .sol_vault
            .lamports()
            .checked_sub(net_sol)
            .ok_or(LatticeError::InsufficientVault)?;
        **ctx.accounts.seller.try_borrow_mut_lamports()? = ctx
            .accounts
            .seller
            .lamports()
            .checked_add(net_sol)
            .ok_or(LatticeError::MathOverflow)?;

        state.total_volume_lamports = state
            .total_volume_lamports
            .checked_add(gross_sol)
            .ok_or(LatticeError::MathOverflow)?;
        state.total_fee_lamports = state
            .total_fee_lamports
            .checked_add(fee)
            .ok_or(LatticeError::MathOverflow)?;

        msg!("Sell ok");
        Ok(())
    }

    /// Standalone referral attribute — records volume to a referrer PDA.
    pub fn record_attribute(
        ctx: Context<RecordAttribute>,
        ref_code: [u8; REF_CODE_LEN],
        volume_lamports: u64,
    ) -> Result<()> {
        require!(volume_lamports > 0, LatticeError::ZeroAmount);
        require!(ref_code != [0u8; REF_CODE_LEN], LatticeError::InvalidRefCode);

        let attr = &mut ctx.accounts.referral_attribute;
        if attr.swap_count == 0 {
            attr.referrer = ctx.accounts.referrer.key();
            attr.trader = ctx.accounts.trader.key();
            attr.code = ref_code;
            attr.bump = ctx.bumps.referral_attribute;
        }
        attr.volume_lamports = attr
            .volume_lamports
            .checked_add(volume_lamports)
            .ok_or(LatticeError::MathOverflow)?;
        attr.swap_count = attr.swap_count.saturating_add(1);
        Ok(())
    }

    /// Authority may lower fee only — never above 1% cap.
    pub fn update_fee(ctx: Context<UpdateFee>, new_fee_bps: u32) -> Result<()> {
        require!(new_fee_bps <= MAX_FEE_BPS, LatticeError::FeeAboveCap);
        ctx.accounts.lattice.fee_bps = new_fee_bps;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeLattice<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = 8 + LatticeState::INIT_SPACE,
        seeds = [LATTICE_SEED],
        bump
    )]
    pub lattice: Account<'info, LatticeState>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetupPool<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [LATTICE_SEED],
        bump = lattice.bump,
        has_one = authority @ LatticeError::Unauthorized
    )]
    pub lattice: Account<'info, LatticeState>,
    #[account(
        init,
        payer = authority,
        mint::decimals = 9,
        mint::authority = lattice,
    )]
    pub mint: Account<'info, Mint>,
    #[account(
        init,
        payer = authority,
        associated_token::mint = mint,
        associated_token::authority = lattice,
    )]
    pub token_vault: Account<'info, TokenAccount>,
    /// CHECK: PDA holds SOL reserves for sells
    #[account(
        init,
        payer = authority,
        seeds = [VAULT_SEED, lattice.key().as_ref()],
        bump,
        space = 0,
    )]
    pub sol_vault: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(_sol_in: u64, _ref_code: [u8; REF_CODE_LEN])]
pub struct Buy<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(mut, seeds = [LATTICE_SEED], bump = lattice.bump)]
    pub lattice: Account<'info, LatticeState>,
    #[account(mut, address = lattice.mint)]
    pub mint: Account<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = lattice,
    )]
    pub token_vault: Account<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = mint,
        associated_token::authority = buyer,
    )]
    pub buyer_token: Account<'info, TokenAccount>,
    /// CHECK: SOL vault
    #[account(
        mut,
        seeds = [VAULT_SEED, lattice.key().as_ref()],
        bump
    )]
    pub sol_vault: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(_tokens_in: u64, _ref_code: [u8; REF_CODE_LEN])]
pub struct Sell<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,
    #[account(mut, seeds = [LATTICE_SEED], bump = lattice.bump)]
    pub lattice: Account<'info, LatticeState>,
    #[account(mut, address = lattice.mint)]
    pub mint: Account<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = lattice,
    )]
    pub token_vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = seller,
    )]
    pub seller_token: Account<'info, TokenAccount>,
    /// CHECK: SOL vault
    #[account(
        mut,
        seeds = [VAULT_SEED, lattice.key().as_ref()],
        bump
    )]
    pub sol_vault: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(ref_code: [u8; REF_CODE_LEN], volume_lamports: u64)]
pub struct RecordAttribute<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: referrer pubkey
    pub referrer: UncheckedAccount<'info>,
    pub trader: Signer<'info>,
    #[account(
        init_if_needed,
        payer = payer,
        space = 8 + ReferralAttribute::INIT_SPACE,
        seeds = [REF_ATTR_SEED, referrer.key().as_ref(), trader.key().as_ref(), &ref_code],
        bump
    )]
    pub referral_attribute: Account<'info, ReferralAttribute>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SeedVault<'info> {
    pub authority: Signer<'info>,
    #[account(
        seeds = [LATTICE_SEED],
        bump = lattice.bump,
        has_one = authority @ LatticeError::Unauthorized
    )]
    pub lattice: Account<'info, LatticeState>,
    #[account(mut, address = lattice.mint)]
    pub mint: Account<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = lattice,
    )]
    pub token_vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct UpdateFee<'info> {
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [LATTICE_SEED],
        bump = lattice.bump,
        has_one = authority @ LatticeError::Unauthorized
    )]
    pub lattice: Account<'info, LatticeState>,
}

#[error_code]
pub enum LatticeError {
    #[msg("Fee above 1% cap")]
    FeeAboveCap,
    #[msg("Invalid parameters")]
    InvalidParams,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Zero amount")]
    ZeroAmount,
    #[msg("Zero output")]
    ZeroOutput,
    #[msg("Insufficient SOL in vault")]
    InsufficientVault,
    #[msg("Invalid referral code")]
    InvalidRefCode,
    #[msg("Invalid referral PDA")]
    InvalidRefPda,
    #[msg("Unauthorized")]
    Unauthorized,
}
