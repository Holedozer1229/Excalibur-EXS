"""
Excalibur $EXS Mining Kernel Package

This package contains optimized batched/fused mining kernels for Tetra-PoW
and dice roll mining operations.

Author: Travis D. Jones <holedozer@gmail.com>
License: BSD 3-Clause
"""

from .tetrapow_dice_universal import (
    UniversalMiningKernel,
    batch_nonlinear_transform,
    fused_hash_computation,
    batch_verify_difficulty
)

__all__ = [
    'UniversalMiningKernel',
    'batch_nonlinear_transform',
    'fused_hash_computation',
    'batch_verify_difficulty'
]
