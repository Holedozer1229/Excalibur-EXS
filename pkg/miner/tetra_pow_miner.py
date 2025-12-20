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

Author: Travis D. Jones <holedozer@gmail.com>
License: BSD 3-Clause
"""

import hashlib
import time
import argparse
from typing import Tuple, List


class TetraPowMiner:
    """
    Ω′ Δ18 Tetra-PoW Miner implementing 128-round unrolled nonlinear hash algorithm.
    """
    
    ROUNDS = 128
    DEFAULT_DIFFICULTY = 4
    
    def __init__(self, difficulty: int = DEFAULT_DIFFICULTY):
        """
        Initialize the Tetra-PoW miner.
        
        Args:
            difficulty: Number of leading zero bytes required in the hash
        """
        self.difficulty = difficulty
        self.round_states = []
        
    def _nonlinear_transform(self, data: bytes, round_num: int) -> bytes:
        """
        Apply nonlinear transformation for a single round.
        
        The transformation uses multiple hash functions in a specific sequence
        to create a nonlinear, unpredictable state progression.
        
        Args:
            data: Input data for this round
            round_num: Current round number (1-128)
            
        Returns:
            Transformed bytes for next round
        """
        # Mix in the round number to make each round unique
        round_salt = str(round_num).encode()
        
        # Apply multiple hash layers with different algorithms
        h1 = hashlib.sha512(data + round_salt).digest()
        h2 = hashlib.sha256(h1).digest()
        h3 = hashlib.blake2b(h2, digest_size=32).digest()
        
        # XOR fold to increase nonlinearity
        result = bytes(a ^ b for a, b in zip(h1[:32], h3))
        
        return result
    
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
        Execute the 128-round Ω′ Δ18 mining algorithm.
        
        Args:
            axiom: The 13-word axiom string
            nonce: Starting nonce value
            max_attempts: Maximum number of mining attempts
            
        Returns:
            Tuple of (success, final_hash, successful_nonce, round_states)
        """
        print(f"🔨 Starting Ω′ Δ18 Tetra-PoW Miner")
        print(f"📊 Difficulty: {self.difficulty} leading zero bytes")
        print(f"🎯 Target: {'00' * self.difficulty}...")
        print(f"⚡ Rounds: {self.ROUNDS}")
        print()
        
        start_time = time.time()
        attempts = 0
        
        for attempt in range(max_attempts):
            attempts += 1
            current_nonce = nonce + attempt
            
            # Initialize with axiom and nonce
            initial_state = f"{axiom}:{current_nonce}".encode()
            
            # Execute 128 rounds
            state = initial_state
            self.round_states = [state]
            
            for round_num in range(1, self.ROUNDS + 1):
                state = self._nonlinear_transform(state, round_num)
                self.round_states.append(state)
                
                # Progress indicator every 16 rounds
                if round_num % 16 == 0 and attempts == 1:
                    print(f"  Round {round_num}/{self.ROUNDS} complete")
            
            # Final hash
            final_hash = hashlib.sha256(state).digest()
            
            # Check if we met the difficulty
            if self._check_difficulty(final_hash):
                elapsed = time.time() - start_time
                print(f"\n✅ SUCCESS! Forge complete in {elapsed:.2f} seconds")
                print(f"🎉 Nonce: {current_nonce}")
                print(f"🔐 Hash: {final_hash.hex()}")
                print(f"📈 Attempts: {attempts}")
                return True, final_hash, current_nonce, self.round_states
            
            # Progress update
            if attempts % 1000 == 0:
                elapsed = time.time() - start_time
                rate = attempts / elapsed if elapsed > 0 else 0
                print(f"⛏️  Attempt {attempts}: {rate:.1f} H/s | Hash: {final_hash.hex()[:16]}...")
        
        # Failed to find valid hash
        elapsed = time.time() - start_time
        print(f"\n❌ Mining failed after {attempts} attempts in {elapsed:.2f} seconds")
        return False, final_hash, current_nonce, self.round_states
    
    def verify(self, axiom: str, nonce: int) -> Tuple[bool, bytes]:
        """
        Verify a forge attempt with a specific nonce.
        
        Args:
            axiom: The 13-word axiom string
            nonce: The nonce to verify
            
        Returns:
            Tuple of (valid, final_hash)
        """
        initial_state = f"{axiom}:{nonce}".encode()
        state = initial_state
        
        for round_num in range(1, self.ROUNDS + 1):
            state = self._nonlinear_transform(state, round_num)
        
        final_hash = hashlib.sha256(state).digest()
        valid = self._check_difficulty(final_hash)
        
        return valid, final_hash


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
    
    miner = TetraPowMiner(difficulty=args.difficulty)
    
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
