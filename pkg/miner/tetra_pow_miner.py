"""
Excalibur $EXS Tetra-PoW Miner
Ω′ Δ18 (Omega Prime Delta 18) - 128-Round Unrolled Nonlinear Hash Algorithm

This module implements the core mining algorithm for the Excalibur $EXS Protocol.
The algorithm consists of 128 discrete, non-repeating cryptographic transformations.

Lead Architect: Travis D Jones (holedozer@gmail.com)
"""

import hashlib
import struct
from typing import Tuple, List
#!/usr/bin/env python3
"""
Ω′ Δ18 Tetra-PoW Miner
128-Round Unrolled Nonlinear Hash Algorithm

Lead Architect: Travis D Jones (holedozer@gmail.com)
License: BSD 3-Clause
"""

import hashlib
import time
from typing import Dict, List, Optional, Tuple


class TetraPowMiner:
    """
    Ω′ Δ18 Tetra-PoW Mining Engine
    
    This class implements the 128-round unrolled nonlinear hash algorithm
    used for proof-of-work in the Excalibur $EXS Protocol.
    """
    
    ROUNDS = 128
    AXIOM = "sword legend pull magic kingdom artist stone destroy forget fire steel honey question"
    
    def __init__(self, difficulty: int = 4):
    Implements the Ω′ Δ18 (Omega-Prime Delta-18) mining algorithm.
    
    Features:
    - 128 unrolled nonlinear rounds
    - Δ18 entropic displacement per round
    - Tetra-dimensional difficulty validation
    - Quantum-resistant design
    """
    
    ROUNDS = 128
    DELTA_18_OFFSET = 18
    
    def __init__(self, axiom: str, difficulty: int = 4):
        """
        Initialize the Tetra-PoW miner.
        
        Args:
            difficulty: The number of leading zeros required in the hash (default: 4)
        """
        self.difficulty = difficulty
        self.target_prefix = "0" * difficulty
        
    def bind_prophecy(self, axiom: str) -> bytes:
        """
        Phase 1: Prophecy Binding
        Cryptographically commit to the 13-word axiom.
        
        Args:
            axiom: The 13-word prophecy axiom
            
        Returns:
            The bound prophecy as bytes
        """
        if axiom.strip().lower() != self.AXIOM.lower():
            raise ValueError("Invalid axiom. The prophecy must match the sacred 13 words.")
        
        # Create cryptographic commitment to axiom
        return hashlib.sha512(axiom.encode('utf-8')).digest()
    
    def nonlinear_expansion(self, state: bytes, round_num: int) -> bytes:
        """
        Phase 2: Nonlinear Expansion
        Apply round-specific transformation to the state.
        
        Each of the 128 rounds uses a unique transformation pattern
        combining multiple hash functions and bitwise operations.
        
        Args:
            state: Current state bytes
            round_num: Current round number (0-127)
            
        Returns:
            Transformed state bytes
        """
        # Layer 1: Base hash transformation (alternates between SHA256 and SHA512)
        if round_num % 2 == 0:
            state = hashlib.sha256(state).digest()
        else:
            state = hashlib.sha512(state).digest()[:32]  # Truncate to 32 bytes
        
        # Layer 2: Round-specific mixing
        # XOR with round number to ensure each round is unique
        round_bytes = struct.pack('>Q', round_num)
        state = bytes(a ^ b for a, b in zip(state[:8], round_bytes)) + state[8:]
        
        # Layer 3: Nonlinear permutation (rotation based on round)
        rotation = round_num % len(state)
        state = state[rotation:] + state[:rotation]
        
        # Layer 4: Additional hash mixing (alternates between different algorithms)
        if round_num % 4 == 0:
            state = hashlib.blake2b(state, digest_size=32).digest()
        elif round_num % 4 == 1:
            state = hashlib.sha3_256(state).digest()
        elif round_num % 4 == 2:
            state = hashlib.sha256(state).digest()
        else:
            state = hashlib.sha512(state).digest()[:32]
        
        return state
    
    def apply_128_rounds(self, initial_state: bytes, nonce: int = 0) -> Tuple[bytes, List[bytes]]:
        """
        Apply all 128 nonlinear rounds to the initial state.
        
        Args:
            initial_state: The initial state from prophecy binding
            nonce: Mining nonce for proof-of-work
            
        Returns:
            Tuple of (final_state, intermediate_states)
        """
        # Add nonce to initial state
        state = initial_state + struct.pack('>Q', nonce)
        state = hashlib.sha256(state).digest()
        
        intermediate_states = []
        
        # Apply each of the 128 rounds
        for round_num in range(self.ROUNDS):
            state = self.nonlinear_expansion(state, round_num)
            intermediate_states.append(state)
        
        return state, intermediate_states
    
    def check_difficulty(self, hash_value: str) -> bool:
        """
        Check if the hash meets the difficulty requirement.
        
        Args:
            hash_value: The hash value as a hex string
            
        Returns:
            True if the hash meets difficulty, False otherwise
        """
        return hash_value.startswith(self.target_prefix)
    
    def mine(self, axiom: str, max_nonce: int = 1000000) -> Tuple[bool, int, str, List[bytes]]:
        """
        Main mining function - attempts to find a valid proof-of-work.
        
        Args:
            axiom: The 13-word prophecy axiom
            max_nonce: Maximum nonce to try before giving up
            
        Returns:
            Tuple of (success, nonce, hash, intermediate_states)
        """
        # Phase 1: Bind prophecy
        try:
            bound_prophecy = self.bind_prophecy(axiom)
        except ValueError as e:
            return False, -1, "", []
        
        # Phase 2-3: Try different nonces until we find a valid hash
        for nonce in range(max_nonce):
            final_state, intermediate_states = self.apply_128_rounds(bound_prophecy, nonce)
            
            # Convert to hex for difficulty check
            hash_hex = final_state.hex()
            
            if self.check_difficulty(hash_hex):
                return True, nonce, hash_hex, intermediate_states
        
        # No valid hash found
        return False, -1, "", []
    
    def forge(self, axiom: str, nonce: int) -> Tuple[str, List[str]]:
        """
        Forge operation - verify a specific nonce produces a valid hash.
        Used for verification of submitted forges.
        
        Args:
            axiom: The 13-word prophecy axiom
            nonce: The nonce to verify
            
        Returns:
            Tuple of (final_hash, round_hashes)
        """
        bound_prophecy = self.bind_prophecy(axiom)
        final_state, intermediate_states = self.apply_128_rounds(bound_prophecy, nonce)
        
        final_hash = final_state.hex()
        round_hashes = [state.hex() for state in intermediate_states]
        
        return final_hash, round_hashes


def main():
    """
    Example usage of the Tetra-PoW miner.
    """
    print("=" * 70)
    print("Excalibur $EXS Tetra-PoW Miner - Ω′ Δ18")
    print("=" * 70)
    print()
    
    axiom = "sword legend pull magic kingdom artist stone destroy forget fire steel honey question"
    difficulty = 4
    
    print(f"Axiom: {axiom}")
    print(f"Difficulty: {difficulty} leading zeros")
    print()
    
    miner = TetraPowMiner(difficulty=difficulty)
    
    print("Starting mining process...")
    print("This may take some time depending on difficulty...")
    print()
    
    success, nonce, hash_value, intermediate_states = miner.mine(axiom, max_nonce=100000)
    
    if success:
        print("✓ FORGE SUCCESSFUL!")
        print(f"  Nonce: {nonce}")
        print(f"  Hash: {hash_value}")
        print(f"  Rounds completed: {len(intermediate_states)}")
        print()
        print("Sample of round hashes:")
        for i in [0, 31, 63, 95, 127]:
            print(f"  Round {i:3d}: {intermediate_states[i].hex()[:32]}...")
    else:
        print("✗ No valid hash found within max_nonce limit")
        print("  Try increasing max_nonce or reducing difficulty")


if __name__ == "__main__":
    main()
            axiom: The 13-word prophecy axiom (or custom axiom)
            difficulty: Mining difficulty (leading zeros required)
        """
        self.axiom = axiom
        self.difficulty = difficulty
        self.rounds_completed = 0
        
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
    
    def _derive_axiom_entropy(self) -> bytes:
        """
        Derive cryptographic entropy from the axiom.
        
        Returns:
            64 bytes of axiom-derived entropy
        """
        # SHA-512 of axiom for base entropy
        return hashlib.sha512(self.axiom.encode('utf-8')).digest()
    
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


if __name__ == "__main__":
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
