# File: cmd/diceminer/dice_roll_miner.py
# Purpose: Python probabilistic dice-roll miner
# Integrates with: Tetra-PoW miner, Treasury API, Forge UI
# Uses: Arthurian 13-word axiom as hashed entropy source

import hashlib
import multiprocessing
import argparse
import time
import json
import random
import requests
from typing import Optional, Dict, Any

# Arthurian 13-word prophecy axiom (reference only)
DEFAULT_AXIOM = "sword legend pull magic kingdom artist stone destroy forget fire steel honey question"

# Mining parameters
BLOCK_REWARD = 50.0  # EXS
TREASURY_ALLOCATION = 7.5  # 15% of block reward
MINER_REWARD = 42.5  # 85% of block reward
TARGET_DIFFICULTY = 4  # Leading zero bytes

class DiceRollMiner:
    """
    Probabilistic dice-roll mining engine.
    Each attempt simulates rolling dice - high rolls find valid hashes faster.
    Uses hashed Arthurian axiom as entropy seed.
    """
    
    def __init__(self, axiom: str, difficulty: int = TARGET_DIFFICULTY, 
                 treasury_url: str = "http://localhost:8080",
                 rosetta_url: str = "http://localhost:8081"):
        self.axiom_hash = self._hash_axiom(axiom)
        self.difficulty = difficulty
        self.treasury_url = treasury_url
        self.rosetta_url = rosetta_url
        self.stats = {
            'attempts': 0,
            'valid_blocks': 0,
            'start_time': time.time(),
            'last_block_time': None
        }
        
        print(f"🎲 Dice-Roll Miner Initialized")
        print(f"🔑 Axiom Hash: {self.axiom_hash[:16]}...")
        print(f"📊 Difficulty: {self.difficulty}")
        print(f"🏛️  Treasury: {self.treasury_url}")
        print(f"🌹 Rosetta: {self.rosetta_url}")
    
    def _hash_axiom(self, axiom: str) -> str:
        """Hash the Arthurian axiom for use as entropy seed"""
        # Normalize: lowercase, single spaces
        normalized = ' '.join(axiom.lower().strip().split())
        return hashlib.sha256(normalized.encode()).hexdigest()
    
    def mine(self, nonce: int, timestamp: Optional[int] = None) -> Dict[str, Any]:
        """
        Execute one mining round with probabilistic dice roll.
        
        Probability model:
        - Roll d100 (0-99)
        - If roll >= 95, higher chance of valid hash
        - Uses axiom hash as RNG seed for deterministic results
        """
        if timestamp is None:
            timestamp = int(time.time())
        
        self.stats['attempts'] += 1
        
        # Seed RNG with axiom hash + nonce for deterministic randomness
        seed = int(self.axiom_hash[:16], 16) ^ nonce ^ timestamp
        random.seed(seed)
        
        # Roll the dice (d100)
        dice_roll = random.randint(0, 99)
        
        # Create block hash candidate
        block_data = f"{self.axiom_hash}{nonce}{timestamp}".encode()
        block_hash = hashlib.sha256(block_data).hexdigest()
        
        # Check if hash meets difficulty (probabilistic boost from high dice roll)
        success = self._check_difficulty(block_hash, dice_roll)
        
        result = {
            'success': success,
            'nonce': nonce,
            'timestamp': timestamp,
            'dice_roll': dice_roll,
            'difficulty': self.difficulty,
            'attempts': self.stats['attempts']
        }
        
        if success:
            result['block_hash'] = block_hash
            result['vault_address'] = self._generate_vault_address(block_hash)
            result['treasury_alloc'] = TREASURY_ALLOCATION
            result['miner_reward'] = MINER_REWARD
            
            self.stats['valid_blocks'] += 1
            self.stats['last_block_time'] = time.time()
            
            print(f"✅ Valid block found! Dice roll: {dice_roll}/100")
            print(f"🎯 Block hash: {block_hash[:32]}...")
            print(f"🏦 Vault: {result['vault_address'][:20]}...")
        
        return result
    
    def _check_difficulty(self, block_hash: str, dice_roll: int) -> bool:
        """
        Check if hash meets difficulty target with probabilistic boost.
        High dice rolls (95+) give better chance of valid hash.
        """
        # Base check: leading zero bytes
        zero_bytes = 0
        for i in range(0, len(block_hash), 2):
            if block_hash[i:i+2] == '00':
                zero_bytes += 1
            else:
                break
        
        # Probabilistic boost: high dice rolls reduce effective difficulty
        effective_difficulty = self.difficulty
        if dice_roll >= 95:
            effective_difficulty = max(1, self.difficulty - 1)
        elif dice_roll >= 90:
            effective_difficulty = self.difficulty
        else:
            effective_difficulty = self.difficulty + 1
        
        return zero_bytes >= effective_difficulty
    
    def _generate_vault_address(self, block_hash: str) -> str:
        """Generate P2TR vault address from block hash + axiom hash"""
        vault_seed = hashlib.sha256(
            (block_hash + self.axiom_hash).encode()
        ).hexdigest()
        return f"bc1p{vault_seed[:58]}"
    
    def get_stats(self) -> Dict[str, Any]:
        """Return current mining statistics"""
        elapsed = time.time() - self.stats['start_time']
        hashrate = self.stats['attempts'] / elapsed if elapsed > 0 else 0
        
        return {
            'total_attempts': self.stats['attempts'],
            'valid_blocks': self.stats['valid_blocks'],
            'hashrate': hashrate,
            'uptime_seconds': elapsed,
            'last_block_time': self.stats['last_block_time']
        }
    
    def benchmark(self, rounds: int = 1000):
        """Run benchmark test"""
        print(f"🏃 Running benchmark ({rounds} rounds)...")
        start = time.time()
        
        for i in range(rounds):
            self.mine(i)
        
        elapsed = time.time() - start
        hashrate = rounds / elapsed
        
        print(f"⚡ Benchmark complete:")
        print(f"  Rounds: {rounds}")
        print(f"  Time: {elapsed:.2f}s")
        print(f"  Hashrate: {hashrate:.2f} H/s")
        print(f"  Valid blocks: {self.stats['valid_blocks']}")

def main():
    parser = argparse.ArgumentParser(description='EXS Dice-Roll Probabilistic Miner')
    parser.add_argument('command', choices=['mine', 'benchmark', 'stats'],
                       help='Command to execute')
    parser.add_argument('--axiom', type=str, default=DEFAULT_AXIOM,
                       help='13-word Arthurian prophecy axiom')
    parser.add_argument('--difficulty', type=int, default=TARGET_DIFFICULTY,
                       help='Mining difficulty (leading zero bytes)')
    parser.add_argument('--nonce', type=int, default=0,
                       help='Starting nonce value')
    parser.add_argument('--rounds', type=int, default=1000,
                       help='Number of rounds for benchmark')
    parser.add_argument('--treasury', type=str, default='http://localhost:8080',
                       help='Treasury API URL')
    parser.add_argument('--rosetta', type=str, default='http://localhost:8081',
                       help='Rosetta API URL')
    
    args = parser.parse_args()
    
    # Initialize miner
    miner = DiceRollMiner(
        axiom=args.axiom,
        difficulty=args.difficulty,
        treasury_url=args.treasury,
        rosetta_url=args.rosetta
    )
    
    if args.command == 'mine':
        print(f"⛏️  Starting mining (nonce: {args.nonce})...")
        result = miner.mine(args.nonce)
        print(json.dumps(result, indent=2))
    
    elif args.command == 'benchmark':
        miner.benchmark(args.rounds)
    
    elif args.command == 'stats':
        stats = miner.get_stats()
        print(json.dumps(stats, indent=2))

if __name__ == "__main__":
    main()
