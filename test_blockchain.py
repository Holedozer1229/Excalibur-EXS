#!/usr/bin/env python3
"""
Tests for Excalibur $EXS Blockchain and Premining

This test suite validates the blockchain structure and premining functionality.

Author: Travis D. Jones <holedozer@gmail.com>
License: BSD 3-Clause
"""

import sys
import os
import time
import tempfile
import json
from unittest import TestCase, main as unittest_main

# Add repository root to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pkg.blockchain.block import Block, Blockchain
from scripts.premine import PreMiner


class TestBlock(TestCase):
    """Test cases for Block class."""
    
    def test_block_creation(self):
        """Test basic block creation."""
        block = Block(
            height=0,
            timestamp=time.time(),
            previous_hash="0" * 64,
            nonce=0,
            difficulty=4,
            miner_address="bc1p...",
            reward=50.0,
            treasury_fee=0.5,
            axiom="test axiom"
        )
        
        self.assertEqual(block.height, 0)
        self.assertIsNotNone(block.hash)
        self.assertEqual(len(block.hash), 64)
    
    def test_block_validation(self):
        """Test block hash validation."""
        block = Block(
            height=1,
            timestamp=time.time(),
            previous_hash="0" * 64,
            nonce=12345,
            difficulty=4,
            miner_address="bc1p...",
            reward=50.0,
            treasury_fee=0.5,
            axiom="test axiom"
        )
        
        self.assertTrue(block.is_valid())
        
        # Tamper with the block
        block.height = 2
        self.assertFalse(block.is_valid())
    
    def test_block_to_dict(self):
        """Test block dictionary conversion."""
        block = Block(
            height=0,
            timestamp=time.time(),
            previous_hash="0" * 64,
            nonce=0,
            difficulty=4,
            miner_address="bc1p...",
            reward=50.0,
            treasury_fee=0.5,
            axiom="test axiom"
        )
        
        block_dict = block.to_dict()
        self.assertIn('height', block_dict)
        self.assertIn('hash', block_dict)
        self.assertIn('timestamp', block_dict)
        self.assertIn('timestamp_iso', block_dict)


class TestBlockchain(TestCase):
    """Test cases for Blockchain class."""
    
    def test_blockchain_creation(self):
        """Test blockchain initialization."""
        blockchain = Blockchain()
        self.assertEqual(len(blockchain), 0)
        self.assertIsNone(blockchain.genesis_block)
    
    def test_genesis_block_creation(self):
        """Test Genesis block creation."""
        blockchain = Blockchain()
        genesis = blockchain.create_genesis_block(
            axiom="test axiom",
            creator_address="bc1p...",
            reward=50.0,
            treasury_fee=0.5
        )
        
        self.assertEqual(genesis.height, 0)
        self.assertEqual(genesis.previous_hash, "0" * 64)
        self.assertEqual(len(blockchain), 1)
        self.assertIsNotNone(blockchain.genesis_block)
    
    def test_add_block(self):
        """Test adding blocks to the blockchain."""
        blockchain = Blockchain()
        blockchain.create_genesis_block(
            axiom="test axiom",
            creator_address="bc1p...",
            reward=50.0,
            treasury_fee=0.5
        )
        
        # Add a valid block
        previous_block = blockchain.get_latest_block()
        new_block = Block(
            height=1,
            timestamp=time.time(),
            previous_hash=previous_block.hash,
            nonce=12345,
            difficulty=4,
            miner_address="bc1p...",
            reward=50.0,
            treasury_fee=0.5,
            axiom="test axiom"
        )
        
        result = blockchain.add_block(new_block)
        self.assertTrue(result)
        self.assertEqual(len(blockchain), 2)
    
    def test_chain_validation(self):
        """Test blockchain validation."""
        blockchain = Blockchain()
        blockchain.create_genesis_block(
            axiom="test axiom",
            creator_address="bc1p...",
            reward=50.0,
            treasury_fee=0.5
        )
        
        # Add several blocks
        for i in range(1, 5):
            previous_block = blockchain.get_latest_block()
            new_block = Block(
                height=i,
                timestamp=time.time(),
                previous_hash=previous_block.hash,
                nonce=i * 1000,
                difficulty=4,
                miner_address="bc1p...",
                reward=50.0,
                treasury_fee=0.5,
                axiom="test axiom"
            )
            blockchain.add_block(new_block)
        
        self.assertTrue(blockchain.is_valid_chain())
        self.assertEqual(len(blockchain), 5)
    
    def test_reward_calculation(self):
        """Test reward calculation."""
        blockchain = Blockchain()
        blockchain.create_genesis_block(
            axiom="test axiom",
            creator_address="bc1p...",
            reward=50.0,
            treasury_fee=0.5
        )
        
        # Add 9 more blocks (total 10)
        for i in range(1, 10):
            previous_block = blockchain.get_latest_block()
            new_block = Block(
                height=i,
                timestamp=time.time(),
                previous_hash=previous_block.hash,
                nonce=i * 1000,
                difficulty=4,
                miner_address="bc1p...",
                reward=50.0,
                treasury_fee=0.5,
                axiom="test axiom"
            )
            blockchain.add_block(new_block)
        
        stats = blockchain.calculate_total_rewards()
        self.assertEqual(stats['total_blocks'], 10)
        self.assertEqual(stats['total_rewards'], 500.0)
        self.assertEqual(stats['total_miner_rewards'], 495.0)
        self.assertEqual(stats['total_treasury_fees'], 5.0)


class TestPreMiner(TestCase):
    """Test cases for PreMiner class."""
    
    def test_preminer_initialization(self):
        """Test PreMiner initialization."""
        preminer = PreMiner(
            creator_address="bc1p...",
            axiom="test axiom",
            num_blocks=10
        )
        
        self.assertEqual(preminer.num_blocks, 10)
        self.assertEqual(len(preminer.blockchain), 0)
    
    def test_genesis_mining(self):
        """Test Genesis block mining."""
        preminer = PreMiner(
            creator_address="bc1p...",
            axiom="test axiom",
            num_blocks=1
        )
        
        genesis = preminer.mine_genesis_block()
        
        self.assertEqual(genesis.height, 0)
        self.assertEqual(genesis.previous_hash, "0" * 64)
        self.assertEqual(len(preminer.blockchain), 1)
    
    def test_premining_multiple_blocks(self):
        """Test premining multiple blocks."""
        preminer = PreMiner(
            creator_address="bc1p...",
            axiom="test axiom",
            num_blocks=10
        )
        
        result = preminer.run_premining()
        
        self.assertEqual(len(preminer.blockchain), 10)
        self.assertTrue(preminer.blockchain.is_valid_chain())
        
        stats = result['reward_stats']
        self.assertEqual(stats['total_blocks'], 10)
        self.assertEqual(stats['total_rewards'], 500.0)
    
    def test_blockchain_export(self):
        """Test blockchain export to JSON."""
        preminer = PreMiner(
            creator_address="bc1p...",
            axiom="test axiom",
            num_blocks=5
        )
        
        preminer.run_premining()
        
        # Export to temporary file
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json') as f:
            output_file = f.name
        
        try:
            preminer.export_blockchain(output_file)
            
            # Verify file exists and is valid JSON
            self.assertTrue(os.path.exists(output_file))
            
            with open(output_file, 'r') as f:
                data = json.load(f)
            
            self.assertIn('metadata', data)
            self.assertIn('genesis_block', data)
            self.assertIn('blocks', data)
            self.assertIn('statistics', data)
            
            self.assertEqual(data['metadata']['total_blocks'], 5)
            self.assertEqual(len(data['blocks']), 5)
        finally:
            # Clean up
            if os.path.exists(output_file):
                os.unlink(output_file)


if __name__ == '__main__':
    print("=" * 70)
    print("Excalibur $EXS - Blockchain & Premining Tests")
    print("=" * 70)
    print()
    
    unittest_main(verbosity=2)
