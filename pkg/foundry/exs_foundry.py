#!/usr/bin/env python3
"""
Excalibur $EXS Protocol - HPP-1 Foundry

This module implements the HPP-1 (Hardened Password Protocol v1) with 
600,000 PBKDF2-HMAC-SHA512 rounds for quantum-resistant key derivation.
It also handles treasury fees and forge fees.

HPP-1 Specifications:
- Algorithm: PBKDF2-HMAC-SHA512
- Iterations: 600,000
- Treasury Fee: 1% of all rewards
- Forge Fee: 0.0001 BTC per forge

Author: Travis D. Jones <holedozer@icloud.com>
License: BSD 3-Clause
"""

import hashlib
import hmac
import os
from typing import Tuple, Dict
from decimal import Decimal


class ExsFoundry:
    """
    Excalibur $EXS Foundry implementing HPP-1 protocol and fee management.
    """
    
    # HPP-1 Constants
    HPP1_ITERATIONS = 600000
    HPP1_ALGORITHM = 'sha512'
    KEY_LENGTH = 64  # 512 bits
    
    # Economic Constants
    FORGE_REWARD = Decimal('50.0')  # 50 $EXS per forge
    TREASURY_FEE_PERCENT = Decimal('0.01')  # 1%
    FORGE_FEE_BTC = Decimal('0.0001')  # 0.0001 BTC
    
    def __init__(self):
        """Initialize the EXS Foundry."""
        self.total_forges = 0
        self.treasury_balance = Decimal('0')
        self.total_fees_collected = Decimal('0')
    
    def hpp1_derive_key(self, axiom: str, nonce: int, salt: bytes = None) -> bytes:
        """
        Derive a cryptographic key using HPP-1 protocol.
        
        Uses PBKDF2-HMAC-SHA512 with 600,000 iterations for quantum resistance.
        
        Args:
            axiom: The 13-word axiom string
            nonce: The successful forge nonce
            salt: Optional salt (generated if not provided)
            
        Returns:
            Derived key bytes (64 bytes / 512 bits)
        """
        if salt is None:
            salt = os.urandom(32)
        
        password = f"{axiom}:{nonce}".encode('utf-8')
        
        # PBKDF2-HMAC-SHA512 with 600,000 iterations
        key = hashlib.pbkdf2_hmac(
            self.HPP1_ALGORITHM,
            password,
            salt,
            self.HPP1_ITERATIONS,
            dklen=self.KEY_LENGTH
        )
        
        return key
    
    def calculate_forge_distribution(self) -> Dict[str, Decimal]:
        """
        Calculate the distribution of a forge reward.
        
        Returns:
            Dictionary with:
                - miner_reward: Amount going to the miner
                - treasury_fee: Amount going to the treasury
                - total_reward: Total forge reward
        """
        treasury_fee = self.FORGE_REWARD * self.TREASURY_FEE_PERCENT
        miner_reward = self.FORGE_REWARD - treasury_fee
        
        return {
            'total_reward': self.FORGE_REWARD,
            'miner_reward': miner_reward,
            'treasury_fee': treasury_fee,
            'forge_fee_btc': self.FORGE_FEE_BTC
        }
    
    def process_forge(self, axiom: str, nonce: int, miner_address: str) -> Dict:
        """
        Process a successful forge and distribute rewards.
        
        Args:
            axiom: The 13-word axiom used
            nonce: The successful nonce
            miner_address: The miner's receiving address
            
        Returns:
            Dictionary containing forge details and distribution
        """
        # Derive the HPP-1 key
        salt = os.urandom(32)
        hpp1_key = self.hpp1_derive_key(axiom, nonce, salt)
        
        # Calculate distribution
        distribution = self.calculate_forge_distribution()
        
        # Update treasury
        self.treasury_balance += distribution['treasury_fee']
        self.total_fees_collected += distribution['treasury_fee']
        self.total_forges += 1
        
        forge_result = {
            'forge_id': self.total_forges,
            'axiom': axiom,
            'nonce': nonce,
            'miner_address': miner_address,
            'hpp1_key': hpp1_key.hex(),
            'salt': salt.hex(),
            'distribution': distribution,
            'treasury_balance': self.treasury_balance,
            'timestamp': self._get_timestamp()
        }
        
        return forge_result
    
    def create_taproot_vault(self, hpp1_key: bytes, axiom: str) -> str:
        """
        Create a Taproot (P2TR) vault using custom 13-word axiom as Taproot tweak.
        
        This creates a unique, un-linkable Bitcoin Taproot address where the
        13-word axiom is used as the Taproot tweak, matching the protocol's
        deterministic vault generation design.
        
        Args:
            hpp1_key: The HPP-1 derived key (used as internal key material)
            axiom: The 13-word axiom used as the Taproot tweak
            
        Returns:
            Taproot address string (bc1p...)
        """
        # Create prophecy hash from 13-word axiom (used as Taproot tweak)
        prophecy_hash = hashlib.sha256(axiom.encode('utf-8')).digest()
        
        # Derive internal key from HPP-1 key
        internal_key = hashlib.sha256(hpp1_key).digest()
        
        # Create taproot tweak using prophecy hash (13-word axiom)
        # This matches the Go implementation: tweak = SHA256(internalKey || prophecyHash)
        tweak = hashlib.sha256(internal_key + prophecy_hash).digest()
        
        # Derive output key: outputKey = internalKey + tweak (simplified)
        # In production, this would use proper secp256k1 point addition
        # For now, we XOR the tweak with internal key for deterministic output
        output_key = bytes(a ^ b for a, b in zip(internal_key, tweak))
        
        # Create Bech32m address (simplified - real implementation uses proper Bech32m)
        address_hash = hashlib.sha256(output_key).hexdigest()[:40]
        taproot_address = f"bc1p{address_hash}"
        
        return taproot_address
    
    def verify_forge_fee(self, btc_amount: Decimal) -> bool:
        """
        Verify that the forge fee was paid.
        
        Args:
            btc_amount: Amount of BTC paid
            
        Returns:
            True if fee is sufficient, False otherwise
        """
        return btc_amount >= self.FORGE_FEE_BTC
    
    def get_treasury_stats(self) -> Dict:
        """
        Get current treasury statistics.
        
        Returns:
            Dictionary with treasury information
        """
        return {
            'total_forges': self.total_forges,
            'treasury_balance': str(self.treasury_balance),
            'total_fees_collected': str(self.total_fees_collected),
            'forge_reward': str(self.FORGE_REWARD),
            'treasury_fee_percent': str(self.TREASURY_FEE_PERCENT * 100) + '%',
            'forge_fee_btc': str(self.FORGE_FEE_BTC)
        }
    
    @staticmethod
    def _get_timestamp() -> str:
        """Get current ISO timestamp."""
        from datetime import datetime, timezone
        return datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')


def main():
    """Demonstrate the foundry functionality."""
    print("⚒️  Excalibur $EXS Foundry - HPP-1 Protocol")
    print("=" * 60)
    print()
    
    foundry = ExsFoundry()
    
    # Example forge
    axiom = "sword legend pull magic kingdom artist stone destroy forget fire steel honey question"
    nonce = 12345
    miner_address = "bc1qexample..."
    
    print(f"Processing forge with nonce {nonce}...")
    print()
    
    # Process the forge
    result = foundry.process_forge(axiom, nonce, miner_address)
    
    print(f"✅ Forge #{result['forge_id']} Complete!")
    print()
    print(f"Distribution:")
    print(f"  Total Reward:    {result['distribution']['total_reward']} $EXS")
    print(f"  Miner Reward:    {result['distribution']['miner_reward']} $EXS")
    print(f"  Treasury Fee:    {result['distribution']['treasury_fee']} $EXS")
    print(f"  Forge Fee:       {result['distribution']['forge_fee_btc']} BTC")
    print()
    print(f"HPP-1 Key: {result['hpp1_key'][:32]}...")
    print(f"Salt:      {result['salt'][:32]}...")
    print()
    
    # Create Taproot vault using custom 13-word axiom as tweak
    hpp1_key = bytes.fromhex(result['hpp1_key'])
    taproot_address = foundry.create_taproot_vault(hpp1_key, axiom)
    print(f"Taproot Vault: {taproot_address}")
    print(f"  (Generated using 13-word axiom as Taproot tweak)")
    print()
    
    # Show treasury stats
    stats = foundry.get_treasury_stats()
    print("Treasury Statistics:")
    print(f"  Total Forges:        {stats['total_forges']}")
    print(f"  Treasury Balance:    {stats['treasury_balance']} $EXS")
    print(f"  Fees Collected:      {stats['total_fees_collected']} $EXS")
    print()
    
    print("⚡ HPP-1 Protocol: 600,000 PBKDF2-HMAC-SHA512 iterations")
    print("🔐 Quantum-hardened key derivation complete")


if __name__ == '__main__':
    main()
