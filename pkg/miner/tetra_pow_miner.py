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


class TetraPowMiner:
    """
    Ω′ Δ18 Tetra-PoW Mining Engine
    
    This class implements the 128-round unrolled nonlinear hash algorithm
    used for proof-of-work in the Excalibur $EXS Protocol.
    """
    
    ROUNDS = 128
    AXIOM = "sword legend pull magic kingdom artist stone destroy forget fire steel honey question"
    
    def __init__(self, difficulty: int = 4):
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
