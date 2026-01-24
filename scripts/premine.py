#!/usr/bin/env python3
"""
Excalibur $EXS Protocol - Premining Script
===========================================

This script initializes the Genesis block and premined blocks for the 
Tetra-PoW blockchain before the official network launch of $EXS 
(The Excalibur Anomaly Protocol).

Features:
- Genesis block setup with configurable reward
- Premined blocks simulation (configurable count)
- Block-by-block mining progress with timestamps
- Total rewards calculation and display
- Creator address for aggregated rewards

Author: Travis D. Jones <holedozer@icloud.com>
License: BSD 3-Clause
"""

import sys
import os
import time
import argparse
import json
from typing import Dict, List
from datetime import datetime, timezone

# Add repository root to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pkg.blockchain.block import Block, Blockchain
from pkg.foundry.exs_foundry import ExsFoundry


class PreMiner:
    """
    PreMining Manager for Excalibur $EXS Protocol.
    
    Handles Genesis block creation and premining of initial blocks
    before network launch.
    """
    
    # Default configuration
    DEFAULT_AXIOM = "sword legend pull magic kingdom artist stone destroy forget fire steel honey question"
    DEFAULT_CREATOR_ADDRESS = "bc1p7hcq8x7h3jf2rg9p5v8w2n4k6m8a0d2e4f6g8h0"  # Example P2TR address
    DEFAULT_BLOCKS = 100
    DEFAULT_REWARD = 50.0
    DEFAULT_TREASURY_PERCENT = 0.01  # 1%
    DEFAULT_DIFFICULTY = 4
    
    def __init__(
        self,
        creator_address: str = DEFAULT_CREATOR_ADDRESS,
        axiom: str = DEFAULT_AXIOM,
        num_blocks: int = DEFAULT_BLOCKS,
        reward_per_block: float = DEFAULT_REWARD,
        treasury_percent: float = DEFAULT_TREASURY_PERCENT,
        difficulty: int = DEFAULT_DIFFICULTY
    ):
        """
        Initialize the PreMiner.
        
        Args:
            creator_address: Creator's Taproot address for rewards
            axiom: The 13-word axiom
            num_blocks: Number of blocks to premine (including Genesis)
            reward_per_block: Reward per block in EXS
            treasury_percent: Treasury fee percentage (default: 1%)
            difficulty: Mining difficulty level
        """
        self.creator_address = creator_address
        self.axiom = axiom
        self.num_blocks = num_blocks
        self.reward_per_block = reward_per_block
        self.treasury_percent = treasury_percent
        self.difficulty = difficulty
        
        self.blockchain = Blockchain()
        self.foundry = ExsFoundry()
        self.mining_stats = {
            'start_time': None,
            'end_time': None,
            'blocks_mined': 0,
            'total_time': 0
        }
    
    def mine_genesis_block(self) -> Block:
        """
        Mine the Genesis block (Block 0).
        
        Returns:
            Genesis Block instance
        """
        print("=" * 70)
        print("⚔️  EXCALIBUR $EXS - GENESIS BLOCK MINING")
        print("=" * 70)
        print()
        
        treasury_fee = self.reward_per_block * self.treasury_percent
        
        print(f"📦 Block Height:      0 (Genesis)")
        print(f"🏛️  Creator Address:  {self.creator_address}")
        print(f"💰 Block Reward:      {self.reward_per_block} $EXS")
        print(f"🏦 Treasury Fee:      {treasury_fee} $EXS ({self.treasury_percent * 100}%)")
        print(f"⚡ Difficulty:        {self.difficulty} leading zeros")
        print(f"📜 Axiom:             {self.axiom[:50]}...")
        print()
        
        start_time = time.time()
        
        # Create Genesis block
        genesis_block = self.blockchain.create_genesis_block(
            axiom=self.axiom,
            creator_address=self.creator_address,
            reward=self.reward_per_block,
            treasury_fee=treasury_fee,
            difficulty=self.difficulty
        )
        
        end_time = time.time()
        mining_time = end_time - start_time
        
        print(f"✅ Genesis Block Mined!")
        print(f"   Hash:      {genesis_block.hash}")
        print(f"   Time:      {datetime.fromtimestamp(genesis_block.timestamp, timezone.utc).isoformat().replace('+00:00', 'Z')}")
        print(f"   Duration:  {mining_time:.4f} seconds")
        print()
        
        self.mining_stats['blocks_mined'] += 1
        
        return genesis_block
    
    def mine_premined_blocks(self) -> List[Block]:
        """
        Mine premined blocks (blocks 1 through num_blocks - 1).
        
        NOTE: This is deterministic premining for blockchain initialization,
        not competitive proof-of-work mining. These blocks are created by
        the protocol creator to establish the initial blockchain state
        before network launch.
        
        Returns:
            List of mined blocks
        """
        print("=" * 70)
        print("⛏️  PREMINING BLOCKS")
        print("=" * 70)
        print()
        
        premined_blocks = []
        treasury_fee = self.reward_per_block * self.treasury_percent
        
        # Mine blocks 1 through num_blocks - 1
        for block_height in range(1, self.num_blocks):
            start_time = time.time()
            
            # Get previous block
            previous_block = self.blockchain.get_latest_block()
            
            # Use deterministic nonce for premining (not competitive PoW)
            nonce = block_height * 1000 + 12345
            
            # Create the block
            new_block = Block(
                height=block_height,
                timestamp=time.time(),
                previous_hash=previous_block.hash,
                nonce=nonce,
                difficulty=self.difficulty,
                miner_address=self.creator_address,
                reward=self.reward_per_block,
                treasury_fee=treasury_fee,
                axiom=self.axiom,
                merkle_root=f"premine_{block_height}"
            )
            
            # Add block to blockchain
            if self.blockchain.add_block(new_block):
                end_time = time.time()
                mining_time = end_time - start_time
                
                premined_blocks.append(new_block)
                self.mining_stats['blocks_mined'] += 1
                
                # Print progress
                print(f"✅ Block #{block_height:04d} | Hash: {new_block.hash[:16]}... | "
                      f"Time: {datetime.fromtimestamp(new_block.timestamp, timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} UTC | "
                      f"Duration: {mining_time:.4f}s")
                
                # Add small delay to simulate mining time
                time.sleep(0.01)
            else:
                print(f"❌ Failed to mine block #{block_height}")
                break
        
        print()
        return premined_blocks
    
    def run_premining(self) -> Dict:
        """
        Execute the complete premining process.
        
        Returns:
            Dictionary with premining statistics
        """
        print()
        print("🏰" * 35)
        print()
        print("  ⚔️  EXCALIBUR $EXS PROTOCOL - PREMINING INITIALIZATION")
        print()
        print("🏰" * 35)
        print()
        
        self.mining_stats['start_time'] = time.time()
        
        # Mine Genesis block
        genesis_block = self.mine_genesis_block()
        
        # Mine premined blocks
        if self.num_blocks > 1:
            premined_blocks = self.mine_premined_blocks()
        
        self.mining_stats['end_time'] = time.time()
        self.mining_stats['total_time'] = self.mining_stats['end_time'] - self.mining_stats['start_time']
        
        # Calculate total rewards
        reward_stats = self.blockchain.calculate_total_rewards()
        
        # Print summary
        self.print_summary(reward_stats)
        
        return {
            'blockchain': self.blockchain,
            'mining_stats': self.mining_stats,
            'reward_stats': reward_stats
        }
    
    def print_summary(self, reward_stats: Dict):
        """
        Print premining summary.
        
        Args:
            reward_stats: Dictionary with reward statistics
        """
        print("=" * 70)
        print("📊 PREMINING SUMMARY")
        print("=" * 70)
        print()
        
        print(f"⛓️  Blockchain Status:")
        print(f"   Total Blocks:           {reward_stats['total_blocks']}")
        print(f"   Chain Valid:            {'✅ Yes' if self.blockchain.is_valid_chain() else '❌ No'}")
        print(f"   Genesis Block:          {self.blockchain.genesis_block.hash[:32]}...")
        print(f"   Latest Block:           {self.blockchain.get_latest_block().hash[:32]}...")
        print()
        
        print(f"💰 Reward Distribution:")
        print(f"   Total Rewards:          {reward_stats['total_rewards']:.2f} $EXS")
        print(f"   Creator Rewards:        {reward_stats['total_miner_rewards']:.2f} $EXS")
        print(f"   Treasury Fees:          {reward_stats['total_treasury_fees']:.2f} $EXS")
        print(f"   Creator Address:        {self.creator_address}")
        print()
        
        print(f"⏱️  Mining Statistics:")
        print(f"   Total Time:             {self.mining_stats['total_time']:.2f} seconds")
        print(f"   Blocks Mined:           {self.mining_stats['blocks_mined']}")
        print(f"   Average Time/Block:     {self.mining_stats['total_time'] / self.mining_stats['blocks_mined']:.4f} seconds")
        print()
        
        print("=" * 70)
        print("✅ PREMINING COMPLETE - BLOCKCHAIN INITIALIZED")
        print("=" * 70)
        print()
        print("🎉 The Excalibur $EXS blockchain is ready for network launch!")
        print()
    
    def export_blockchain(self, output_file: str):
        """
        Export the blockchain to a JSON file.
        
        Args:
            output_file: Output file path
        """
        blockchain_data = {
            'metadata': {
                'protocol': 'Excalibur $EXS',
                'version': '1.0.0',
                'total_blocks': len(self.blockchain),
                'creator_address': self.creator_address,
                'axiom': self.axiom,
                'export_timestamp': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
            },
            'genesis_block': self.blockchain.genesis_block.to_dict(),
            'blocks': [block.to_dict() for block in self.blockchain.chain],
            'statistics': self.blockchain.calculate_total_rewards()
        }
        
        with open(output_file, 'w') as f:
            json.dump(blockchain_data, f, indent=2)
        
        print(f"📁 Blockchain exported to: {output_file}")
        print()


def main():
    """Main entry point for the premining script."""
    parser = argparse.ArgumentParser(
        description='Excalibur $EXS Protocol - Premining Script',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
  # Mine 100 blocks with default settings
  python premine.py
  
  # Mine 500 blocks with custom creator address
  python premine.py --blocks 500 --creator bc1p...
  
  # Mine with custom reward and export to file
  python premine.py --blocks 200 --reward 50 --output blockchain.json
        '''
    )
    
    parser.add_argument(
        '--blocks',
        type=int,
        default=PreMiner.DEFAULT_BLOCKS,
        help=f'Number of blocks to premine (default: {PreMiner.DEFAULT_BLOCKS})'
    )
    
    parser.add_argument(
        '--creator',
        type=str,
        default=PreMiner.DEFAULT_CREATOR_ADDRESS,
        help='Creator Taproot address for rewards'
    )
    
    parser.add_argument(
        '--axiom',
        type=str,
        default=PreMiner.DEFAULT_AXIOM,
        help='The 13-word axiom (default: canonical axiom)'
    )
    
    parser.add_argument(
        '--reward',
        type=float,
        default=PreMiner.DEFAULT_REWARD,
        help=f'Reward per block in $EXS (default: {PreMiner.DEFAULT_REWARD})'
    )
    
    parser.add_argument(
        '--treasury-percent',
        type=float,
        default=PreMiner.DEFAULT_TREASURY_PERCENT,
        help=f'Treasury fee percentage (default: {PreMiner.DEFAULT_TREASURY_PERCENT * 100}%%)'
    )
    
    parser.add_argument(
        '--difficulty',
        type=int,
        default=PreMiner.DEFAULT_DIFFICULTY,
        help=f'Mining difficulty level (default: {PreMiner.DEFAULT_DIFFICULTY})'
    )
    
    parser.add_argument(
        '--output',
        type=str,
        help='Output file to export blockchain JSON (optional)'
    )
    
    args = parser.parse_args()
    
    # Create PreMiner instance
    preminer = PreMiner(
        creator_address=args.creator,
        axiom=args.axiom,
        num_blocks=args.blocks,
        reward_per_block=args.reward,
        treasury_percent=args.treasury_percent,
        difficulty=args.difficulty
    )
    
    # Run premining
    result = preminer.run_premining()
    
    # Export if output file specified
    if args.output:
        preminer.export_blockchain(args.output)
    
    # Exit with success
    return 0


if __name__ == '__main__':
    sys.exit(main())
