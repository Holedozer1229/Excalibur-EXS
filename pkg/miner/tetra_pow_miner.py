#!/usr/bin/env python3
"""
Excalibur $EXS Tetra-PoW Miner
Ω′ Δ18 (Omega Prime Delta 18) - 128-Round Unrolled Nonlinear Hash Algorithm

This module implements the core mining algorithm for the Excalibur $EXS Protocol.
The algorithm consists of 128 discrete, non-repeating cryptographic transformations.

Lead Architect: Travis D Jones (holedozer@gmail.com)
License: BSD 3-Clause
"""

import hashlib
import time
from typing import Dict, List, Optional, Tuple


class TetraPowMiner:
    """
    Ω′ Δ18 Tetra-PoW Mining Engine
    
    Implements the Ω′ Δ18 (Omega-Prime Delta-18) mining algorithm
    for the Excalibur $EXS Protocol. This class handles the 128-round 
    unrolled nonlinear hash algorithm used for proof-of-work.
    
    Features:
    - 128 unrolled nonlinear rounds
    - Δ18 entropic displacement per round
    - Tetra-dimensional difficulty validation
    - Quantum-resistant design
    """
    
    ROUNDS = 128
    AXIOM = "sword legend pull magic kingdom artist stone destroy forget fire steel honey question"
    DELTA_18_OFFSET = 18
    
    def __init__(self, axiom: str = None, difficulty: int = 4):
        """
        Initialize the Tetra-PoW miner.
        
        Args:
            axiom: The 13-word prophecy axiom (uses default if not provided)
            difficulty: The number of leading zeros required in the hash (default: 4)
        """
        self.axiom = axiom if axiom is not None else self.AXIOM
        self.difficulty = difficulty
        self.rounds_completed = 0
    
    def _derive_axiom_entropy(self) -> bytes:
        """
        Derive cryptographic entropy from the axiom.
        
        Returns:
            64 bytes of axiom-derived entropy
        """
        # SHA-512 of axiom for base entropy
        return hashlib.sha512(self.axiom.encode('utf-8')).digest()
    
    def _apply_nonlinear_round(self, state: bytes, round_num: int, axiom_entropy: bytes) -> bytes:
        """
        Apply a single nonlinear round transformation.
        
        Args:
            state: Current hash state
            round_num: Current round number (0-127)
            axiom_entropy: Entropy derived from axiom
            
        Returns:
            Transformed state
        """
        # Combine state with axiom entropy
        combined = state + axiom_entropy + round_num.to_bytes(8, 'big')
        
        # Apply Δ18 offset displacement
        offset = (round_num * self.DELTA_18_OFFSET) % 256
        displaced = bytes((b + offset) % 256 for b in combined)
        
        # Nonlinear mixing via SHA-512
        mixed = hashlib.sha512(displaced).digest()
        
        # Tetra-dimensional fold (4-way interleave)
        quarter = len(mixed) // 4
        folded = bytes(
            mixed[i] ^ mixed[i + quarter] ^ mixed[i + 2*quarter] ^ mixed[i + 3*quarter]
            for i in range(quarter)
        )
        
        return folded
    
    def _validate_difficulty(self, hash_result: bytes) -> bool:
        """
        Validate that hash meets difficulty requirement.
        
        Args:
            hash_result: Final hash to validate
            
        Returns:
            True if hash meets difficulty
        """
        # Convert to hex and check leading zeros
        hex_hash = hash_result.hex()
        return hex_hash.startswith('0' * self.difficulty)
    
    def mine(self, block_data: str, nonce_start: int = 0, max_iterations: int = 1000000) -> Optional[Dict]:
        """
        Execute the full 128-round Ω′ Δ18 mining process.
        
        Args:
            block_data: Data to mine (transaction block, etc.)
            nonce_start: Starting nonce value
            max_iterations: Maximum mining attempts
            
        Returns:
            Mining result dict or None if no solution found
        """
        axiom_entropy = self._derive_axiom_entropy()
        start_time = time.time()
        
        for nonce in range(nonce_start, nonce_start + max_iterations):
            # Initialize state with block data and nonce
            state = hashlib.sha512(f"{block_data}{nonce}".encode('utf-8')).digest()
            
            # Execute all 128 unrolled rounds
            for round_num in range(self.ROUNDS):
                state = self._apply_nonlinear_round(state, round_num, axiom_entropy)
                self.rounds_completed = round_num + 1
            
            # Final hash
            final_hash = hashlib.sha512(state).digest()
            
            # Check if difficulty met
            if self._validate_difficulty(final_hash):
                elapsed = time.time() - start_time
                return {
                    'success': True,
                    'nonce': nonce,
                    'hash': final_hash.hex(),
                    'rounds': self.ROUNDS,
                    'attempts': nonce - nonce_start + 1,
                    'time_seconds': elapsed,
                    'hash_rate': (nonce - nonce_start + 1) / elapsed if elapsed > 0 else 0
                }
        
        # No solution found
        return None
    
    def verify(self, block_data: str, nonce: int) -> Tuple[bool, str]:
        """
        Verify a mining result.
        
        Args:
            block_data: Original block data
            nonce: Claimed nonce
            
        Returns:
            Tuple of (is_valid, final_hash_hex)
        """
        axiom_entropy = self._derive_axiom_entropy()
        
        # Reconstruct mining process
        state = hashlib.sha512(f"{block_data}{nonce}".encode('utf-8')).digest()
        
        for round_num in range(self.ROUNDS):
            state = self._apply_nonlinear_round(state, round_num, axiom_entropy)
        
        final_hash = hashlib.sha512(state).digest()
        is_valid = self._validate_difficulty(final_hash)
        
        return is_valid, final_hash.hex()


def forge_exs_block(axiom: str, difficulty: int, block_data: str) -> Optional[Dict]:
    """
    Convenience function to forge an $EXS block.
    
    Args:
        axiom: The 13-word prophecy axiom
        difficulty: Mining difficulty
        block_data: Block data to mine
        
    Returns:
        Mining result or None
    """
    miner = TetraPowMiner(axiom, difficulty)
    print(f"🗡️  Drawing the sword from the stone...")
    print(f"⚡ Initiating Ω′ Δ18 Tetra-PoW with difficulty {difficulty}")
    
    result = miner.mine(block_data)
    
    if result:
        print(f"✨ SUCCESS! Block forged!")
        print(f"   Nonce: {result['nonce']}")
        print(f"   Hash: {result['hash'][:64]}...")
        print(f"   Attempts: {result['attempts']}")
        print(f"   Time: {result['time_seconds']:.2f}s")
        print(f"   Hash Rate: {result['hash_rate']:.2f} H/s")
    else:
        print(f"❌ No solution found within iteration limit")
    
    return result


def main():
    """Example usage of the Tetra-PoW miner."""
    # Default 13-word axiom
    DEFAULT_AXIOM = "sword legend pull magic kingdom artist stone destroy forget fire steel honey question"
    
    print("=" * 80)
    print("Excalibur $EXS Protocol - Ω′ Δ18 Tetra-PoW Miner")
    print("=" * 80)
    
    # Example forge
    result = forge_exs_block(
        axiom=DEFAULT_AXIOM,
        difficulty=4,
        block_data="genesis_block_exs_2025"
    )
    
    if result:
        # Verify the result
        miner = TetraPowMiner(DEFAULT_AXIOM, 4)
        is_valid, hash_hex = miner.verify("genesis_block_exs_2025", result['nonce'])
        print(f"\n🔍 Verification: {'✅ VALID' if is_valid else '❌ INVALID'}")


if __name__ == "__main__":
    main()
