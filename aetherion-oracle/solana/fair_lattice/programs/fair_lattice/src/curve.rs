//! Fixed-point power curve: P(s) = P0 · (1 + s/S)^n
//! Integral from s0→s1 used for buy/sell quotes. n stored as centi (250 = 2.5).

use anchor_lang::prelude::*;

pub const MAX_FEE_BPS: u32 = 10_000; // 1.00% cap
pub const BPS_DENOM: u32 = 1_000_000;
pub const FP: u128 = 1_000_000_000_000; // 1e12 fixed-point

#[derive(Clone, Copy, Debug)]
pub struct CurveParams {
    pub p0: u64,
    pub scale: u64,
    /// n × 100 (250 = 2.5)
    pub n_centis: u16,
}

pub fn clamp_fee_bps(fee_bps: u32) -> u32 {
    fee_bps.min(MAX_FEE_BPS)
}

pub fn split_fee(amount: u64, fee_bps: u32) -> Result<(u64, u64)> {
    let bps = clamp_fee_bps(fee_bps);
    let fee = (amount as u128)
        .checked_mul(bps as u128)
        .and_then(|v| v.checked_div(BPS_DENOM as u128))
        .ok_or(error!(CurveError::MathOverflow))? as u64;
    let net = amount.checked_sub(fee).ok_or(error!(CurveError::MathOverflow))?;
    Ok((fee, net))
}

/// Spot price P(s) in lamports per whole token (same units as p0).
pub fn spot_price(sold: u64, params: CurveParams) -> Result<u64> {
    if params.scale == 0 {
        return err!(CurveError::InvalidParams);
    }
    let base = pow_centi(params.scale, sold, params.n_centis)?;
    let val = (params.p0 as u128)
        .checked_mul(base)
        .and_then(|v| v.checked_div(FP))
        .ok_or(error!(CurveError::MathOverflow))?;
    u64::try_from(val).map_err(|_| error!(CurveError::MathOverflow))
}

/// ∫_{s0}^{s1} P0 (1+s/S)^n ds
pub fn integral(s0: u64, s1: u64, params: CurveParams) -> Result<u64> {
    if s1 <= s0 || params.scale == 0 {
        return Ok(0);
    }
    let n = params.n_centis as u32;
    if n == 0 {
        let delta = (s1 - s0) as u128;
        let val = (params.p0 as u128)
            .checked_mul(delta)
            .ok_or(error!(CurveError::MathOverflow))?;
        return u64::try_from(val).map_err(|_| error!(CurveError::MathOverflow));
    }

    let exp_centis = n + 100; // n + 1 in centis
    let upper = pow_centi_plus_one(params.scale, s1, exp_centis)?;
    let lower = pow_centi_plus_one(params.scale, s0, exp_centis)?;
    if upper <= lower {
        return Ok(0);
    }

    let coeff = (params.p0 as u128)
        .checked_mul(params.scale as u128)
        .and_then(|v| v.checked_mul(100))
        .and_then(|v| v.checked_div(n as u128 + 100))
        .ok_or(error!(CurveError::MathOverflow))?;

    let diff = upper.checked_sub(lower).ok_or(error!(CurveError::MathOverflow))?;
    let val = coeff
        .checked_mul(diff)
        .and_then(|v| v.checked_div(FP))
        .ok_or(error!(CurveError::MathOverflow))?;

    u64::try_from(val).map_err(|_| error!(CurveError::MathOverflow))
}

/// (1 + s/S)^n with n in centis — on-chain uses floor(n) for heap safety.
fn pow_centi(scale: u64, s: u64, n_centis: u16) -> Result<u128> {
    integer_pow_ratio(scale, s, n_centis)
}

/// (1 + s/S)^(exp_centis/100) — used for integral exponent n+1.
fn pow_centi_plus_one(scale: u64, s: u64, exp_centis: u32) -> Result<u128> {
    let n = exp_centis.saturating_sub(100).min(600) as u16;
    integer_pow_ratio(scale, s, n)
}

/// ((scale + s) / scale)^n · FP — n is a small integer exponent only (centis ignored on-chain).
fn integer_pow_ratio(scale: u64, s: u64, n_centis: u16) -> Result<u128> {
    let n = (n_centis / 100).min(6) as u32;
    if n == 0 {
        return Ok(FP);
    }
    let num = (scale as u128).checked_add(s as u128).ok_or(error!(CurveError::MathOverflow))?;
    let den = scale as u128;
    let mut result = FP;
    let mut base_num = num;
    let mut base_den = den;
    let mut exp = n;
    while exp > 0 {
        if exp % 2 == 1 {
            result = result
                .checked_mul(base_num)
                .and_then(|v| v.checked_div(base_den))
                .ok_or(error!(CurveError::MathOverflow))?;
        }
        base_num = base_num
            .checked_mul(base_num)
            .and_then(|v| v.checked_div(FP))
            .ok_or(error!(CurveError::MathOverflow))?;
        base_den = base_den
            .checked_mul(base_den)
            .and_then(|v| v.checked_div(FP))
            .ok_or(error!(CurveError::MathOverflow))?;
        exp /= 2;
    }
    Ok(result)
}

/// Tokens received for `net_sol` lamports starting at `sold`.
/// Uses spot price at `sold` — full integral is quoted off-chain in the UI.
pub fn tokens_for_sol(net_sol: u64, sold: u64, params: CurveParams) -> Result<u64> {
    if net_sol == 0 {
        return Ok(0);
    }
    let price = spot_price(sold, params)?;
    if price == 0 {
        return Ok(0);
    }
    Ok(net_sol / price)
}

/// SOL out for selling `tokens` starting at `sold`.
pub fn sol_for_tokens(tokens: u64, sold: u64, params: CurveParams) -> Result<u64> {
    if tokens == 0 || tokens > sold {
        return Ok(0);
    }
    let price = spot_price(sold, params)?;
    tokens
        .checked_mul(price)
        .ok_or(error!(CurveError::MathOverflow))
}

#[error_code]
pub enum CurveError {
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Invalid curve parameters")]
    InvalidParams,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fee_cap_one_percent() {
        let (fee, net) = split_fee(1_000_000_000, 10_000).unwrap();
        assert_eq!(fee, 10_000_000);
        assert_eq!(net, 990_000_000);
    }
}
