#!/usr/bin/env python3
"""
EXS Foundry - HPP-1 Protocol Implementation
600,000 PBKDF2-HMAC-SHA512 rounds with fee logic

Lead Architect: Travis D Jones (holedozer@gmail.com)
License: BSD 3-Clause
"""

import hashlib
import hmac
from typing import Dict, Optional, Tuple


class ExsFoundry:
    """
    Implements the HPP-1 (High-Performance PBKDF2) protocol for Excalibur $EXS.
    
    Features:
    - 600,000 rounds of PBKDF2-HMAC-SHA512
    - 1% Treasury Fee on all rewards
    - 0.0001 BTC Forge Fee per attempt
    - Quantum-resistant key derivation
    """
    
    HPP1_ITERATIONS = 600000
    TREASURY_FEE_PERCENT = 1.0
    FORGE_FEE_BTC = 0.0001
    BLOCK_REWARD_EXS = 50.0
    
    def __init__(self, treasury_address: str):
        """
        Initialize the EXS Foundry.
        
        Args:
            treasury_address: Address for treasury fee collection
        """
        self.treasury_address = treasury_address
        self.total_forged = 0.0
        self.treasury_collected = 0.0
        
    def derive_hpp1_key(self, axiom: str, salt: str = "EXCALIBUR_EXS_HPP1") -> bytes:
        """
        Derive a quantum-resistant key using HPP-1 protocol.
        
        Args:
            axiom: The 13-word prophecy axiom
            salt: Salt for key derivation
            
        Returns:
            64-byte derived key
        """
        return hashlib.pbkdf2_hmac(
            'sha512',
            axiom.encode('utf-8'),
            salt.encode('utf-8'),
            self.HPP1_ITERATIONS,
            dklen=64
        )
    
    def calculate_treasury_fee(self, reward_amount: float) -> Tuple[float, float]:
        """
        Calculate the treasury fee from a reward.
        
        Args:
            reward_amount: Total reward amount in $EXS
            
        Returns:
            Tuple of (miner_reward, treasury_fee)
        """
        treasury_fee = reward_amount * (self.TREASURY_FEE_PERCENT / 100.0)
        miner_reward = reward_amount - treasury_fee
        return miner_reward, treasury_fee
    
    def validate_forge_fee(self, btc_paid: float) -> bool:
        """
        Validate that the correct forge fee was paid.
        
        Args:
            btc_paid: Amount of BTC paid
            
        Returns:
            True if fee is correct
        """
        return btc_paid >= self.FORGE_FEE_BTC
    
    def process_forge(self, miner_address: str, btc_paid: float, 
                     block_height: int) -> Optional[Dict]:
        """
        Process a successful forge and calculate rewards.
        
        Args:
            miner_address: Address of the miner
            btc_paid: BTC forge fee paid
            block_height: Current block height
            
        Returns:
            Forge result dict or None if invalid
        """
        # Validate forge fee
        if not self.validate_forge_fee(btc_paid):
            return {
                'success': False,
                'error': f'Insufficient forge fee. Required: {self.FORGE_FEE_BTC} BTC'
            }
        
        # Calculate block reward (with halving)
        halvings = block_height // 210000
        current_reward = self.BLOCK_REWARD_EXS / (2 ** halvings)
        
        # Calculate fees
        miner_reward, treasury_fee = self.calculate_treasury_fee(current_reward)
        
        # Update totals
        self.total_forged += current_reward
        self.treasury_collected += treasury_fee
        
        return {
            'success': True,
            'block_height': block_height,
            'total_reward': current_reward,
            'miner_address': miner_address,
            'miner_reward': miner_reward,
            'treasury_address': self.treasury_address,
            'treasury_fee': treasury_fee,
            'forge_fee_btc': btc_paid,
            'halvings': halvings
        }
    
    def get_treasury_stats(self) -> Dict:
        """
        Get treasury statistics.
        
        Returns:
            Dictionary of treasury stats
        """
        return {
            'total_forged': self.total_forged,
            'treasury_collected': self.treasury_collected,
            'treasury_address': self.treasury_address,
            'treasury_fee_percent': self.TREASURY_FEE_PERCENT
        }
    
    def sign_forge(self, forge_data: str, private_key: bytes) -> str:
        """
        Sign forge data with HMAC-SHA512.
        
        Args:
            forge_data: Data to sign
            private_key: Private key for signing
            
        Returns:
            Hex-encoded signature
        """
        signature = hmac.new(
            private_key,
            forge_data.encode('utf-8'),
            hashlib.sha512
        ).digest()
        return signature.hex()
    
    def verify_forge_signature(self, forge_data: str, signature_hex: str, 
                              public_key: bytes) -> bool:
        """
        Verify a forge signature.
        
        Args:
            forge_data: Original data
            signature_hex: Hex-encoded signature
            public_key: Public key for verification
            
        Returns:
            True if signature is valid
        """
        expected_sig = hmac.new(
            public_key,
            forge_data.encode('utf-8'),
            hashlib.sha512
        ).digest()
        
        try:
            provided_sig = bytes.fromhex(signature_hex)
            return hmac.compare_digest(expected_sig, provided_sig)
        except ValueError:
            return False


def demo_foundry():
    """Demonstrate the EXS Foundry in action."""
    print("=" * 80)
    print("Excalibur $EXS Foundry - HPP-1 Protocol Demo")
    print("=" * 80)
    
    # Initialize foundry
    treasury_addr = "bc1p_excalibur_treasury_example_address"
    foundry = ExsFoundry(treasury_addr)
    
    # Derive HPP-1 key
    axiom = "sword legend pull magic kingdom artist stone destroy forget fire steel honey question"
    print(f"\n🔑 Deriving HPP-1 key from axiom...")
    print(f"   Iterations: {foundry.HPP1_ITERATIONS:,}")
    
    hpp1_key = foundry.derive_hpp1_key(axiom)
    print(f"   Key (first 32 bytes): {hpp1_key[:32].hex()}")
    
    # Process a forge
    print(f"\n⚒️  Processing forge at block height 1000...")
    forge_result = foundry.process_forge(
        miner_address="bc1p_knight_example_address",
        btc_paid=0.0001,
        block_height=1000
    )
    
    if forge_result['success']:
        print(f"   ✅ Forge successful!")
        print(f"   Total Reward: {forge_result['total_reward']} $EXS")
        print(f"   Miner Reward: {forge_result['miner_reward']} $EXS")
        print(f"   Treasury Fee: {forge_result['treasury_fee']} $EXS")
        print(f"   Forge Fee: {forge_result['forge_fee_btc']} BTC")
    
    # Show treasury stats
    print(f"\n💰 Treasury Statistics:")
    stats = foundry.get_treasury_stats()
    print(f"   Total Forged: {stats['total_forged']} $EXS")
    print(f"   Treasury Collected: {stats['treasury_collected']} $EXS")
    print(f"   Fee Percentage: {stats['treasury_fee_percent']}%")
    
    # Demonstrate signature
    print(f"\n🔏 Signing forge data...")
    forge_data = f"block:1000,nonce:12345,miner:{forge_result['miner_address']}"
    signature = foundry.sign_forge(forge_data, hpp1_key)
    print(f"   Signature: {signature[:64]}...")
    
    # Verify signature
    is_valid = foundry.verify_forge_signature(forge_data, signature, hpp1_key)
    print(f"   Verification: {'✅ VALID' if is_valid else '❌ INVALID'}")
    
    print("\n" + "=" * 80)


if __name__ == "__main__":
    demo_foundry()
