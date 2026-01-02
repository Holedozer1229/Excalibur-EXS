#!/usr/bin/env python3
"""
Excalibur-EXS Wallet CLI
HD Wallet with Taproot support, 13-word prophecy axiom, and full Knights' Round Table features
"""

import os
import sys
import json
import hashlib
import secrets
from pathlib import Path
from typing import List, Optional, Dict, Any
import argparse

# Default 13-word prophecy axiom
DEFAULT_PROPHECY = [
    "sword", "legend", "pull", "magic", "kingdom", "artist",
    "stone", "destroy", "forget", "fire", "steel", "honey", "question"
]

class ExcaliburWallet:
    """Excalibur-EXS HD Wallet with Taproot support"""
    
    def __init__(self, data_dir: Optional[Path] = None):
        if data_dir is None:
            data_dir = Path.home() / ".excalibur-exs" / "wallets"
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
    
    def create_wallet(self, name: str, use_prophecy: bool = True, 
                     passphrase: Optional[str] = None) -> Dict[str, Any]:
        """Create a new HD wallet"""
        wallet_path = self.data_dir / f"{name}.json"
        if wallet_path.exists():
            raise ValueError(f"Wallet '{name}' already exists")
        
        # Generate seed
        if use_prophecy:
            seed_words = DEFAULT_PROPHECY
        else:
            # Generate random 24-word mnemonic (BIP39-like)
            seed_words = self._generate_seed_words(24)
        
        # Derive master key using HPP-1 (600,000 rounds)
        master_key = self._hpp1_derive(seed_words, passphrase or "")
        
        # Generate first address (Taproot P2TR)
        address = self._generate_p2tr_address(master_key, 0)
        
        wallet_data = {
            "name": name,
            "version": "1.0.0",
            "type": "hd",
            "prophecy_mode": use_prophecy,
            "encrypted": passphrase is not None,
            "addresses": [address],
            "master_key_hash": hashlib.sha256(master_key).hexdigest(),
            "created_at": str(Path(wallet_path).stat().st_mtime if wallet_path.exists() else 0)
        }
        
        # Save wallet (encrypted if passphrase provided)
        if passphrase:
            wallet_data["seed_encrypted"] = self._encrypt_seed(seed_words, passphrase)
        else:
            wallet_data["seed_warning"] = "UNENCRYPTED - Store securely!"
            wallet_data["seed_words"] = " ".join(seed_words)
        
        with open(wallet_path, 'w') as f:
            json.dump(wallet_data, f, indent=2)
        
        return {
            "name": name,
            "seed_words": seed_words,
            "address": address,
            "encrypted": passphrase is not None
        }
    
    def list_wallets(self) -> List[Dict[str, Any]]:
        """List all wallets"""
        wallets = []
        for wallet_file in self.data_dir.glob("*.json"):
            try:
                with open(wallet_file, 'r') as f:
                    data = json.load(f)
                    wallets.append({
                        "name": data.get("name", wallet_file.stem),
                        "type": data.get("type", "hd"),
                        "encrypted": data.get("encrypted", False),
                        "addresses": len(data.get("addresses", []))
                    })
            except Exception as e:
                print(f"Warning: Could not read {wallet_file}: {e}", file=sys.stderr)
        return wallets
    
    def get_balance(self, wallet_name: str) -> Dict[str, float]:
        """Get wallet balance (placeholder)"""
        # TODO: Implement actual balance checking via blockchain
        return {
            "confirmed": 0.0,
            "unconfirmed": 0.0,
            "total": 0.0
        }
    
    def generate_address(self, wallet_name: str) -> str:
        """Generate new receiving address"""
        wallet_path = self.data_dir / f"{wallet_name}.json"
        if not wallet_path.exists():
            raise ValueError(f"Wallet '{wallet_name}' not found")
        
        with open(wallet_path, 'r') as f:
            data = json.load(f)
        
        # Generate next address
        index = len(data.get("addresses", []))
        # TODO: Derive from actual master key
        address = f"bc1p{secrets.token_hex(32)}"
        
        data["addresses"].append(address)
        
        with open(wallet_path, 'w') as f:
            json.dump(data, f, indent=2)
        
        return address
    
    def _hpp1_derive(self, seed_words: List[str], salt: str) -> bytes:
        """HPP-1: 600,000 rounds of PBKDF2-HMAC-SHA512"""
        seed = " ".join(seed_words).encode('utf-8')
        salt_bytes = salt.encode('utf-8') + b"Excalibur-EXS"
        
        # 600,000 rounds (HPP-1 specification)
        key = hashlib.pbkdf2_hmac(
            'sha512',
            seed,
            salt_bytes,
            600000,
            dklen=64
        )
        return key
    
    def _generate_p2tr_address(self, master_key: bytes, index: int) -> str:
        """Generate Taproot P2TR address (simplified)"""
        # Derive child key
        child_data = master_key + index.to_bytes(4, 'big')
        child_hash = hashlib.sha256(child_data).digest()
        
        # Generate Bech32m address (simplified - real implementation would use proper taproot)
        address_data = hashlib.sha256(child_hash).hexdigest()[:64]
        return f"bc1p{address_data}"
    
    def _generate_seed_words(self, count: int) -> List[str]:
        """Generate random seed words (BIP39-like)"""
        # Simplified: In production, use proper BIP39 wordlist
        wordlist = ["abandon", "ability", "able", "about", "above"] * 500
        return [wordlist[secrets.randbelow(len(wordlist))] for _ in range(count)]
    
    def _encrypt_seed(self, seed_words: List[str], passphrase: str) -> str:
        """Encrypt seed with passphrase (simplified)"""
        seed = " ".join(seed_words).encode('utf-8')
        key = self._hpp1_derive(seed_words, passphrase)
        # Simplified encryption - use proper AES in production
        encrypted = hashlib.sha256(seed + key).hexdigest()
        return encrypted


def main():
    parser = argparse.ArgumentParser(
        description="Excalibur-EXS Wallet CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Commands')
    
    # Create wallet
    create_parser = subparsers.add_parser('create', help='Create new wallet')
    create_parser.add_argument('name', help='Wallet name')
    create_parser.add_argument('--prophecy', action='store_true', default=True,
                              help='Use 13-word prophecy axiom')
    create_parser.add_argument('--passphrase', '-p', help='Encryption passphrase')
    
    # List wallets
    subparsers.add_parser('list', help='List all wallets')
    
    # Balance
    balance_parser = subparsers.add_parser('balance', help='Show wallet balance')
    balance_parser.add_argument('name', help='Wallet name')
    
    # Generate address
    addr_parser = subparsers.add_parser('address', help='Generate new address')
    addr_parser.add_argument('name', help='Wallet name')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    wallet = ExcaliburWallet()
    
    try:
        if args.command == 'create':
            result = wallet.create_wallet(
                args.name,
                use_prophecy=args.prophecy,
                passphrase=args.passphrase
            )
            print(f"✓ Wallet '{result['name']}' created successfully!")
            print(f"\nSeed phrase ({len(result['seed_words'])} words):")
            print("  " + " ".join(result['seed_words']))
            print(f"\nFirst address: {result['address']}")
            print("\n⚠️  IMPORTANT: Write down your seed phrase and store it securely!")
            
        elif args.command == 'list':
            wallets = wallet.list_wallets()
            if not wallets:
                print("No wallets found.")
            else:
                print("Available wallets:")
                for w in wallets:
                    encrypted = "🔒" if w['encrypted'] else "🔓"
                    print(f"  {encrypted} {w['name']} ({w['type']}, {w['addresses']} addresses)")
        
        elif args.command == 'balance':
            balance = wallet.get_balance(args.name)
            print(f"Wallet: {args.name}")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print(f"Confirmed:    {balance['confirmed']:.8f} EXS")
            print(f"Unconfirmed:  {balance['unconfirmed']:.8f} EXS")
            print(f"Total:        {balance['total']:.8f} EXS")
        
        elif args.command == 'address':
            address = wallet.generate_address(args.name)
            print(f"New address: {address}")
            print("Type: P2TR (Taproot)")
    
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
