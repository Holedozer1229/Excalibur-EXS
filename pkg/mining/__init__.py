"""
Excalibur $EXS Mining Kernel Package

This package contains optimized batched/fused mining kernels for Tetra-PoW
and dice roll mining operations, plus Stratum-compliant mining architecture.

Author: Travis D. Jones <holedozer@gmail.com>
License: BSD 3-Clause
"""

from .tetrapow_dice_universal import (
    UniversalMiningKernel,
    batch_nonlinear_transform,
    fused_hash_computation,
    batch_verify_difficulty
)

from .stratum_miner import (
    NonceTask,
    ExtranonceAllocator,
    StratumMiner,
    StratumClient,
    nonce_score,
    generate_nonce_batch,
    build_coinbase,
    taproot_commitment,
    build_block_header,
    tetra_pow_kernel,
    meets_target,
    nbits_to_target
)

__all__ = [
    # Universal kernel
    'UniversalMiningKernel',
    'batch_nonlinear_transform',
    'fused_hash_computation',
    'batch_verify_difficulty',
    # Stratum mining
    'NonceTask',
    'ExtranonceAllocator',
    'StratumMiner',
    'StratumClient',
    'nonce_score',
    'generate_nonce_batch',
    'build_coinbase',
    'taproot_commitment',
    'build_block_header',
    'tetra_pow_kernel',
    'meets_target',
    'nbits_to_target'
]
