"""Checks for pkg/economy/sovereign_tokenomics.py.

Run:  python3 pkg/economy/test_sovereign_tokenomics.py
(also runnable under pytest — each check is a plain function.)
"""

from sovereign_tokenomics import (
    EXS_SATS,
    INITIAL_FORGE_REWARD_BASE,
    HALVING_INTERVAL_BLOCKS,
    TREASURY_TITHE_PCT,
    ALLOC_MINER_PCT,
    ALLOC_LIQUIDITY_PCT,
    ALLOC_TREASURY_PCT,
    ALLOC_AIRDROP_PCT,
    FORGE_FEE_BTC,
    TREASURY_RELEASE_MONTHS,
    block_reward,
    supply_at_height,
    validate_allocation,
    coinbase_split,
    treasury_unlock_schedule,
    treasury_releasable,
    genesis_coinbase_is_valid,
)

FIFTY_EXS = 50 * EXS_SATS  # 5_000_000_000 base units


def check_reward_genesis_height():
    assert block_reward(0) == FIFTY_EXS


def check_reward_last_block_before_halving():
    assert block_reward(209_999) == FIFTY_EXS


def check_reward_first_halving():
    assert block_reward(210_000) == 25 * EXS_SATS


def check_reward_second_halving():
    assert block_reward(420_000) == 1_250_000_000  # 12.5 EXS


def check_halving_never_negative_at_extreme_height():
    r = block_reward(10**18)
    assert r == 0, f"expected 0, got {r}"


def check_split_sums_exactly_to_reward():
    parts = coinbase_split(FIFTY_EXS, "t-addr", "l-addr", "a-addr", "m-addr")
    total = sum(amount for _, amount in parts.values())
    assert total == FIFTY_EXS, f"split sums to {total}, expected {FIFTY_EXS}"


def check_split_no_dust_loss_on_awkward_reward():
    # 7 base units: tithe = 0, remainder = 7 -> miner 4, liq 1, tre 1,
    # air 0, dust 1 -> miner gets 4 + 1 dust = 5. Total must be 7.
    parts = coinbase_split(7, "t", "l", "a", "m")
    total = sum(amount for _, amount in parts.values())
    assert total == 7, f"dust lost: split sums to {total}"
    # dust goes to the miner
    miner_amt = parts["miner"][1]
    assert miner_amt == 5, f"miner should get 5 (4 + 1 dust), got {miner_amt}"


def check_tithe_is_exactly_one_percent():
    parts = coinbase_split(FIFTY_EXS, "t", "l", "a", "m")
    _, tithe = parts["tithe"]
    assert tithe == FIFTY_EXS // 100 == 50_000_000  # 0.5 EXS
    assert TREASURY_TITHE_PCT == 1


def check_allocation_percentages_sum_to_100():
    assert validate_allocation() is True
    assert (
        ALLOC_MINER_PCT + ALLOC_LIQUIDITY_PCT + ALLOC_TREASURY_PCT + ALLOC_AIRDROP_PCT
    ) == 100


def check_airdrop_is_five_percent_of_remainder():
    parts = coinbase_split(FIFTY_EXS, "t", "l", "a", "m")
    _, airdrop = parts["airdrop"]
    remainder = FIFTY_EXS - FIFTY_EXS // 100  # post-tithe: 49.5 EXS
    assert airdrop == (remainder * 5) // 100 == 247_500_000  # 2.475 EXS
    assert ALLOC_AIRDROP_PCT == 5


def check_post_tithe_split_matches_site_framing():
    # Site: "50 $EXS per forge — 49.5 to you, 0.5 to the treasury."
    parts = coinbase_split(FIFTY_EXS, "t", "l", "a", "m")
    by_label = {k: v for k, (v, _) in parts.items()}
    assert by_label["tithe"] == "t"
    miner_amt = parts["miner"][1]
    assert miner_amt == 2_970_000_000  # 60% of 49.5 EXS = 29.7 EXS
    assert parts["liquidity"][1] == 990_000_000    # 9.9 EXS
    assert parts["treasury"][1] == 742_500_000     # 7.425 EXS
    # treasury total = tithe + treasury share = 0.5 + 7.425 = 7.925 EXS
    assert parts["tithe"][1] + parts["treasury"][1] == 792_500_000


def check_supply_at_genesis_height():
    # Scheduled issuance includes the height-0 forge at full reward.
    assert supply_at_height(0) == FIFTY_EXS


def check_supply_first_era():
    # Heights 0..209_999: 210,000 forges x 50 EXS.
    assert supply_at_height(209_999) == 210_000 * FIFTY_EXS


def check_supply_two_eras():
    # Plus one full halved era: 210,000 x 25 EXS.
    assert supply_at_height(419_999) == 210_000 * FIFTY_EXS + 210_000 * 25 * EXS_SATS


def check_none_address_raises():
    for kwargs in (
        {"treasury_addr": None},
        {"liquidity_addr": None},
        {"airdrop_addr": None},
        {"miner_addr": None},
    ):
        args = {"treasury_addr": "t", "liquidity_addr": "l",
                "airdrop_addr": "a", "miner_addr": "m"}
        args.update(kwargs)
        try:
            coinbase_split(FIFTY_EXS, **args)
        except ValueError:
            pass
        else:
            raise AssertionError(f"None address accepted: {kwargs}")


def check_genesis_pays_no_one():
    # No-premine invariant: the caller enforces an empty genesis coinbase.
    assert genesis_coinbase_is_valid([]) is True
    assert genesis_coinbase_is_valid([("any-addr", FIFTY_EXS)]) is False


def check_treasury_rolling_release_params():
    sched = treasury_unlock_schedule()
    assert sched["months"] == 12 == TREASURY_RELEASE_MONTHS
    assert sched["window_blocks"] == 12 * sched["blocks_per_month"]


def check_treasury_vesting_linear():
    window = treasury_unlock_schedule()["window_blocks"]
    deposit = 1_000_000_000  # 10 EXS
    h0 = 1_000
    assert treasury_releasable([(h0, deposit)], h0) == 0
    assert treasury_releasable([(h0, deposit)], h0 + window // 2) == deposit // 2
    assert treasury_releasable([(h0, deposit)], h0 + window) == deposit
    assert treasury_releasable([(h0, deposit)], h0 + window + 999) == deposit
    # future deposit releases nothing
    assert treasury_releasable([(h0 + 500, deposit)], h0) == 0


def check_forge_fee_constant():
    assert str(FORGE_FEE_BTC) == "0.0001"


def check_halving_interval_constant():
    assert HALVING_INTERVAL_BLOCKS == 210_000
    assert INITIAL_FORGE_REWARD_BASE == FIFTY_EXS


CHECKS = [
    check_reward_genesis_height,
    check_reward_last_block_before_halving,
    check_reward_first_halving,
    check_reward_second_halving,
    check_halving_never_negative_at_extreme_height,
    check_split_sums_exactly_to_reward,
    check_split_no_dust_loss_on_awkward_reward,
    check_tithe_is_exactly_one_percent,
    check_allocation_percentages_sum_to_100,
    check_airdrop_is_five_percent_of_remainder,
    check_post_tithe_split_matches_site_framing,
    check_supply_at_genesis_height,
    check_supply_first_era,
    check_supply_two_eras,
    check_none_address_raises,
    check_genesis_pays_no_one,
    check_treasury_rolling_release_params,
    check_treasury_vesting_linear,
    check_forge_fee_constant,
    check_halving_interval_constant,
]


def main() -> int:
    failures = 0
    for check in CHECKS:
        try:
            check()
        except Exception as exc:  # noqa: BLE001 — report, don't hide
            failures += 1
            print(f"FAIL {check.__name__}: {type(exc).__name__}: {exc}")
        else:
            print(f"ok   {check.__name__}")
    print(f"{len(CHECKS) - failures}/{len(CHECKS)} checks passed")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
