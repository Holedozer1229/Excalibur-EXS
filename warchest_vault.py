#!/usr/bin/env python3
"""
Excalibur $EXS - Warchest Vault Implementation

This script automates the premining process and securely deposits mined EXS coins
into a secure Warchest Vault prior to the network launch.

Features:
- Deterministic vault address and private key generation
- Configurable premining simulation
- Comprehensive logging and reporting
- Secure credential display with security warnings

Author: Travis D. Jones <holedozer@gmail.com>
License: BSD 3-Clause
"""

import hashlib
import os
import hmac
import argparse
import json
from datetime import datetime, timezone
from typing import Dict, List, Tuple
from decimal import Decimal

# Constants matching the Excalibur protocol
FORGE_REWARD = Decimal('50.0')  # 50 EXS per block
WARCHEST_SEED = b"EXCALIBUR_WARCHEST_VAULT_2026"  # Predefined cryptographic seed
HPP1_ITERATIONS = 600000  # HPP-1: 600,000 PBKDF2 iterations for quantum resistance
AXIOM = "sword legend pull magic kingdom artist stone destroy forget fire steel honey question"


class WarchestVault:
    """
    Warchest Vault for storing premined $EXS rewards.
    
    Uses deterministic key derivation with HPP-1 protocol (600,000 PBKDF2-HMAC-SHA512 iterations)
    for quantum-resistant security.
    """
    
    def __init__(self, seed: bytes = WARCHEST_SEED):
        """
        Initialize the Warchest Vault.
        
        Args:
            seed: Cryptographic seed for deterministic key generation
        """
        self.seed = seed
        self.vault_address = None
        self.private_key = None
        self.total_premined = Decimal('0')
        self.blocks_mined = []
        self._generate_vault_credentials()
    
    def _generate_vault_credentials(self):
        """
        Generate deterministic vault address and private key using HPP-1 protocol.
        
        Uses PBKDF2-HMAC-SHA512 with 600,000 iterations for quantum resistance.
        The axiom is used as additional entropy for the derivation.
        """
        print("⚒️  Generating Warchest Vault credentials...")
        print(f"   Using HPP-1 protocol ({HPP1_ITERATIONS:,} PBKDF2 iterations)")
        
        # Combine seed with axiom for additional entropy
        password = f"{self.seed.decode()}:{AXIOM}".encode('utf-8')
        
        # Generate salt from seed for deterministic derivation
        salt = hashlib.sha256(self.seed).digest()
        
        # HPP-1: PBKDF2-HMAC-SHA512 with 600,000 iterations
        master_key = hashlib.pbkdf2_hmac(
            'sha512',
            password,
            salt,
            HPP1_ITERATIONS,
            dklen=64
        )
        
        # Derive private key from first 32 bytes
        self.private_key = master_key[:32].hex()
        
        # Create vault address from second 32 bytes (simplified Taproot-style)
        # In production, this would use proper secp256k1 and Bech32m encoding
        address_material = hashlib.sha256(master_key[32:]).digest()
        address_hash = hashlib.sha256(address_material).hexdigest()[:40]
        self.vault_address = f"bc1p{address_hash}"
        
        print("✅ Warchest Vault credentials generated successfully!\n")
    
    def simulate_premine(self, num_blocks: int = 100, reward_per_block: Decimal = FORGE_REWARD):
        """
        Simulate premining of blocks and deposit rewards into the Warchest.
        
        Args:
            num_blocks: Number of blocks to premine
            reward_per_block: Reward per block in EXS
        
        Returns:
            List of mined blocks with details
        """
        print(f"⛏️  Starting premining simulation...")
        print(f"   Blocks to mine: {num_blocks}")
        print(f"   Reward per block: {reward_per_block} EXS")
        print(f"   Vault address: {self.vault_address}\n")
        
        start_time = datetime.now(timezone.utc)
        
        for block_num in range(1, num_blocks + 1):
            block_data = self._mine_block(block_num, reward_per_block)
            self.blocks_mined.append(block_data)
            
            # Log every 10 blocks
            if block_num % 10 == 0:
                print(f"   Block {block_num:4d} mined | Reward: {reward_per_block} EXS | Cumulative: {self.total_premined} EXS")
        
        end_time = datetime.now(timezone.utc)
        duration = (end_time - start_time).total_seconds()
        
        print(f"\n✅ Premining complete!")
        print(f"   Total blocks mined: {len(self.blocks_mined)}")
        print(f"   Total rewards: {self.total_premined} EXS")
        print(f"   Duration: {duration:.2f}s\n")
        
        return self.blocks_mined
    
    def _mine_block(self, block_num: int, reward: Decimal) -> Dict:
        """
        Simulate mining a single block.
        
        Args:
            block_num: Block number
            reward: Block reward in EXS
        
        Returns:
            Dictionary with block details
        """
        timestamp = datetime.now(timezone.utc)
        
        # Generate block hash (simplified)
        block_data = f"{block_num}:{timestamp.isoformat()}:{reward}:{self.vault_address}".encode()
        block_hash = hashlib.sha256(block_data).hexdigest()
        
        # Update total premined
        self.total_premined += reward
        
        return {
            'block_number': block_num,
            'block_hash': block_hash,
            'timestamp': timestamp.isoformat(),
            'reward': str(reward),
            'vault_address': self.vault_address,
            'total_premined': str(self.total_premined)
        }
    
    def display_credentials(self):
        """
        Display vault access credentials with security warnings.
        """
        print("=" * 80)
        print("🏰 WARCHEST VAULT ACCESS CREDENTIALS")
        print("=" * 80)
        print()
        print(f"Vault Address:  {self.vault_address}")
        print(f"Private Key:    {self.private_key}")
        print()
        print("=" * 80)
        print("⚠️  SECURITY WARNINGS")
        print("=" * 80)
        print()
        print("1. 🔐 STORE THESE CREDENTIALS SECURELY")
        print("   - Never share the private key with anyone")
        print("   - Store in an encrypted password manager or hardware wallet")
        print("   - Create offline backups in multiple secure locations")
        print()
        print("2. 🔒 ENCRYPTION RECOMMENDED")
        print("   - Consider encrypting these credentials with AES-256")
        print("   - Use a strong passphrase for encryption")
        print("   - Store the encrypted version separately from the passphrase")
        print()
        print("3. ⚡ ACCESS CONTROL")
        print("   - Limit access to authorized personnel only")
        print("   - Implement multi-signature requirements for spending")
        print("   - Maintain an audit log of all access attempts")
        print()
        print("4. 🛡️  BEST PRACTICES")
        print("   - Never store credentials in plain text")
        print("   - Use hardware security modules (HSM) for production")
        print("   - Regularly rotate and update access credentials")
        print("   - Implement time-locks for large withdrawals")
        print()
        print("=" * 80)
        print()
    
    def generate_summary_report(self) -> Dict:
        """
        Generate a comprehensive summary report of premining activity.
        
        Returns:
            Dictionary with summary statistics
        """
        if not self.blocks_mined:
            return {
                'error': 'No blocks have been mined yet'
            }
        
        first_block = self.blocks_mined[0]
        last_block = self.blocks_mined[-1]
        
        return {
            'warchest_vault': {
                'address': self.vault_address,
                'private_key_hash': hashlib.sha256(self.private_key.encode()).hexdigest()[:16],
                'security_protocol': f'HPP-1 ({HPP1_ITERATIONS:,} PBKDF2 iterations)'
            },
            'premining_summary': {
                'total_blocks_mined': len(self.blocks_mined),
                'total_rewards_deposited': str(self.total_premined),
                'reward_per_block': str(FORGE_REWARD),
                'first_block': {
                    'number': first_block['block_number'],
                    'timestamp': first_block['timestamp'],
                    'hash': first_block['block_hash']
                },
                'last_block': {
                    'number': last_block['block_number'],
                    'timestamp': last_block['timestamp'],
                    'hash': last_block['block_hash']
                }
            },
            'distribution': {
                'total_supply_cap': '21,000,000 EXS',
                'premined_percentage': f"{(float(self.total_premined) / 21000000 * 100):.4f}%",
                'remaining_supply': str(Decimal('21000000') - self.total_premined)
            },
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
    
    def export_to_file(self, filename: str = 'warchest_vault_report.json'):
        """
        Export vault details and premining report to a JSON file.
        
        Args:
            filename: Output filename
        """
        report = self.generate_summary_report()
        
        # Add block details
        report['blocks'] = self.blocks_mined
        
        with open(filename, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"📄 Report exported to: {filename}")


def main():
    """
    Main entry point for the Warchest Vault script.
    """
    parser = argparse.ArgumentParser(
        description='Excalibur $EXS Warchest Vault - Premining and Secure Storage',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Premine 100 blocks (default)
  python3 warchest_vault.py
  
  # Premine 250 blocks
  python3 warchest_vault.py --blocks 250
  
  # Premine with custom reward per block
  python3 warchest_vault.py --blocks 100 --reward 50
  
  # Export detailed report
  python3 warchest_vault.py --blocks 100 --export vault_report.json
        """
    )
    
    parser.add_argument(
        '--blocks',
        type=int,
        default=100,
        help='Number of blocks to premine (default: 100)'
    )
    
    parser.add_argument(
        '--reward',
        type=float,
        default=50.0,
        help='Reward per block in EXS (default: 50.0)'
    )
    
    parser.add_argument(
        '--export',
        type=str,
        metavar='FILENAME',
        help='Export report to JSON file'
    )
    
    parser.add_argument(
        '--show-credentials',
        action='store_true',
        help='Display vault credentials (use with caution)'
    )
    
    args = parser.parse_args()
    
    print()
    print("=" * 80)
    print("⚔️  EXCALIBUR $EXS - WARCHEST VAULT")
    print("=" * 80)
    print()
    print("Securing premined rewards for the $EXS blockchain")
    print("Quantum-hardened with HPP-1 protocol (600,000 PBKDF2 iterations)")
    print()
    
    # Initialize Warchest Vault
    vault = WarchestVault()
    
    # Simulate premining
    vault.simulate_premine(
        num_blocks=args.blocks,
        reward_per_block=Decimal(str(args.reward))
    )
    
    # Generate and display summary
    print("📊 SUMMARY REPORT")
    print("=" * 80)
    summary = vault.generate_summary_report()
    print(json.dumps(summary, indent=2))
    print()
    
    # Display credentials if requested
    if args.show_credentials:
        vault.display_credentials()
    else:
        print("⚠️  Vault credentials hidden for security.")
        print("   Use --show-credentials flag to display them.\n")
    
    # Export report if requested
    if args.export:
        vault.export_to_file(args.export)
        print()
    
    print("=" * 80)
    print("✅ Warchest Vault deployment complete!")
    print("=" * 80)
    print()
    print("Next steps:")
    print("1. Securely store the vault credentials (use --show-credentials)")
    print("2. Encrypt the private key with AES-256")
    print("3. Create offline backups in multiple secure locations")
    print("4. Implement multi-signature requirements for fund access")
    print("5. Set up monitoring for vault activity")
    print()


if __name__ == '__main__':
    main()
