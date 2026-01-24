#!/usr/bin/env python3
"""
Excalibur $EXS Protocol - Ω′ Δ18 Tetra-PoW Miner

This module implements the 128-round unrolled nonlinear hash algorithm
for the Excalibur $EXS Protocol. The miner uses a deterministic but
highly complex computational process to validate forge attempts.

Algorithm: Ω′ Δ18 (Omega-Prime Delta-18)
Rounds: 128 (unrolled)
Difficulty: Configurable (default: 4 leading zero bytes)
Hardness: 600,000 PBKDF2-HMAC-SHA512 iterations (HPP-1 protocol)

MIGRATION NOTE: Tetra-PoW miners now use batched/fused kernel
- See mining/tetrapow_dice_universal.py for the new batched implementation
- Improved speed through batch processing and fused operations
- Better modularity and maintainability

Author: Travis D. Jones <holedozer@icloud.com>
License: BSD 3-Clause
"""

import hashlib
import time
import argparse
import sys
import os
from typing import Tuple, List

# Add repository root to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

try:
    from miners.lib.tetrapow_dice_universal import UniversalMiningKernel
except ImportError:
    # Fallback to legacy import paths for compatibility
    try:
        from pkg.mining.tetrapow_dice_universal import UniversalMiningKernel
    except ImportError:
        from mining.tetrapow_dice_universal import UniversalMiningKernel


class TetraPowMiner:
    """
    Ω′ Δ18 Tetra-PoW Miner implementing 128-round unrolled nonlinear hash algorithm.
    
    Now uses the universal batched/fused kernel for improved performance.
    """
    
    ROUNDS = 128
    DEFAULT_DIFFICULTY = 4
    DEFAULT_BATCH_SIZE = 32
    
    def __init__(self, difficulty: int = DEFAULT_DIFFICULTY, batch_size: int = DEFAULT_BATCH_SIZE):
        """
        Initialize the Tetra-PoW miner.
        
        Args:
            difficulty: Number of leading zero bytes required in the hash
            batch_size: Batch size for processing (default: 32)
        """
        self.difficulty = difficulty
        self.batch_size = batch_size
        self.round_states = []
        # Initialize the universal batched kernel
        self.kernel = UniversalMiningKernel(batch_size=batch_size)
    
    def _check_difficulty(self, hash_result: bytes) -> bool:
        """
        Check if the hash meets the difficulty requirement.
        
        Args:
            hash_result: The final hash to check
            
        Returns:
            True if difficulty requirement is met, False otherwise
        """
        return hash_result[:self.difficulty] == b'\x00' * self.difficulty
    
    def mine(self, axiom: str, nonce: int = 0, max_attempts: int = 1000000) -> Tuple[bool, bytes, int, List[bytes]]:
        """
        Execute the 128-round Ω′ Δ18 mining algorithm using batched/fused kernel.
        
        Args:
            axiom: The 13-word axiom string
            nonce: Starting nonce value
            max_attempts: Maximum number of mining attempts
            
        Returns:
            Tuple of (success, final_hash, successful_nonce, round_states)
        """
        print(f"🔨 Starting Ω′ Δ18 Tetra-PoW Miner (Batched Mode)")
        print(f"📊 Difficulty: {self.difficulty} leading zero bytes")
        print(f"🎯 Target: {'00' * self.difficulty}...")
        print(f"⚡ Rounds: {self.ROUNDS}")
        print(f"📦 Batch Size: {self.batch_size}")
        print()
        
        start_time = time.time()
        
        # Use the batched kernel for mining
        success, found_nonce, final_hash, round_states = self.kernel.batch_mine(
            axiom=axiom,
            nonce_start=nonce,
            max_attempts=max_attempts,
            difficulty=self.difficulty,
            rounds=self.ROUNDS
        )
        
        elapsed = time.time() - start_time
        
        if success:
            print(f"\n✅ SUCCESS! Forge complete in {elapsed:.2f} seconds")
            print(f"🎉 Nonce: {found_nonce}")
            print(f"🔐 Hash: {final_hash.hex()}")
            
            # Calculate attempts
            attempts = found_nonce - nonce + 1
            print(f"📈 Attempts: {attempts}")
            
            # Store round states for compatibility
            self.round_states = round_states
            
            return True, final_hash, found_nonce, round_states
        else:
            elapsed = time.time() - start_time
            print(f"\n❌ Mining failed after {max_attempts} attempts in {elapsed:.2f} seconds")
            # Return last hash for compatibility (even though not valid)
            last_hash = hashlib.sha256(f"{axiom}:{nonce + max_attempts - 1}".encode()).digest()
            return False, last_hash, nonce + max_attempts - 1, []
    
    def verify(self, axiom: str, nonce: int) -> Tuple[bool, bytes]:
        """
        Verify a forge attempt with a specific nonce.
        
        Args:
            axiom: The 13-word axiom string
            nonce: The nonce to verify
            
        Returns:
            Tuple of (valid, final_hash)
        """
        # Use the batched kernel for single verification (batch size of 1)
        results = self.kernel.fused_hash_computation(
            axiom=axiom,
            nonce_start=nonce,
            count=1,
            rounds=self.ROUNDS
        )
        
        if results:
            _, final_hash, _ = results[0]
            valid = self._check_difficulty(final_hash)
            return valid, final_hash
        
        # Fallback in case of error
        return False, b''


def main():
    """Command-line interface for the Tetra-PoW miner."""
    parser = argparse.ArgumentParser(
        description='Excalibur $EXS Ω′ Δ18 Tetra-PoW Miner',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Mine with the canonical axiom
  python tetra_pow_miner.py --axiom "sword legend pull magic kingdom artist stone destroy forget fire steel honey question"
  
  # Mine with custom difficulty
  python tetra_pow_miner.py --axiom "..." --difficulty 5
  
  # Verify a specific nonce
  python tetra_pow_miner.py --axiom "..." --verify 12345
        """
    )
    
    parser.add_argument(
        '--axiom',
        type=str,
        required=True,
        help='The 13-word axiom sequence'
    )
    
    parser.add_argument(
        '--difficulty',
        type=int,
        default=4,
        help='Number of leading zero bytes required (default: 4)'
    )
    
    parser.add_argument(
        '--batch-size',
        type=int,
        default=32,
        help='Batch size for processing (default: 32)'
    )
    
    parser.add_argument(
        '--nonce',
        type=int,
        default=0,
        help='Starting nonce value (default: 0)'
    )
    
    parser.add_argument(
        '--max-attempts',
        type=int,
        default=1000000,
        help='Maximum mining attempts (default: 1000000)'
    )
    
    parser.add_argument(
        '--verify',
        type=int,
        metavar='NONCE',
        help='Verify a specific nonce instead of mining'
    )
    
    args = parser.parse_args()
    
    # Validate axiom
    canonical_axiom = "sword legend pull magic kingdom artist stone destroy forget fire steel honey question"
    if args.axiom != canonical_axiom:
        print(f"⚠️  WARNING: Axiom does not match the canonical sequence!")
        print(f"    Expected: {canonical_axiom}")
        print(f"    Received: {args.axiom}")
        print()
    
    miner = TetraPowMiner(difficulty=args.difficulty, batch_size=args.batch_size)
    
    if args.verify is not None:
        print(f"🔍 Verifying nonce {args.verify}...")
        valid, final_hash = miner.verify(args.axiom, args.verify)
        
        if valid:
            print(f"✅ VALID forge!")
            print(f"🔐 Hash: {final_hash.hex()}")
        else:
            print(f"❌ INVALID forge")
            print(f"🔐 Hash: {final_hash.hex()}")
    else:
        success, final_hash, nonce, _ = miner.mine(
            args.axiom,
            nonce=args.nonce,
            max_attempts=args.max_attempts
        )
        
        if not success:
            print("\n💡 Tip: Try increasing --max-attempts or decreasing --difficulty")
            exit(1)


if __name__ == '__main__':
    main()
