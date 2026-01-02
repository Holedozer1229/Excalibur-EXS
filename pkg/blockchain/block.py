#!/usr/bin/env python3
"""
Excalibur $EXS Protocol - Blockchain Block Structure

This module defines the block structure for the Excalibur blockchain,
including Genesis block support and block validation.

Author: Travis D. Jones <holedozer@gmail.com>
License: BSD 3-Clause
"""

import hashlib
import time
from typing import Optional, Dict, List
from datetime import datetime, timezone
from dataclasses import dataclass, field


@dataclass
class Block:
    """
    Blockchain block structure for Excalibur $EXS Protocol.
    
    Each block contains mining proof, reward distribution, and links
    to the previous block to form the blockchain.
    """
    
    height: int
    timestamp: float
    previous_hash: str
    nonce: int
    difficulty: int
    miner_address: str
    reward: float
    treasury_fee: float
    axiom: str
    hash: Optional[str] = None
    merkle_root: Optional[str] = None
    
    def __post_init__(self):
        """Calculate block hash after initialization if not provided."""
        if self.hash is None:
            self.hash = self.calculate_hash()
    
    def calculate_hash(self) -> str:
        """
        Calculate the block hash using SHA-256.
        
        Returns:
            Hexadecimal hash string
        """
        # Construct block header data
        block_data = (
            f"{self.height}"
            f"{self.timestamp}"
            f"{self.previous_hash}"
            f"{self.nonce}"
            f"{self.difficulty}"
            f"{self.miner_address}"
            f"{self.reward}"
            f"{self.treasury_fee}"
            f"{self.axiom}"
        )
        
        # Double SHA-256 (Bitcoin-style)
        first_hash = hashlib.sha256(block_data.encode('utf-8')).digest()
        second_hash = hashlib.sha256(first_hash).hexdigest()
        
        return second_hash
    
    def is_valid(self) -> bool:
        """
        Validate the block hash.
        
        Returns:
            True if block hash is valid, False otherwise
        """
        calculated_hash = self.calculate_hash()
        return calculated_hash == self.hash
    
    def to_dict(self) -> Dict:
        """
        Convert block to dictionary representation.
        
        Returns:
            Dictionary with all block fields
        """
        return {
            'height': self.height,
            'timestamp': self.timestamp,
            'timestamp_iso': datetime.fromtimestamp(self.timestamp, timezone.utc).isoformat().replace('+00:00', 'Z'),
            'previous_hash': self.previous_hash,
            'hash': self.hash,
            'nonce': self.nonce,
            'difficulty': self.difficulty,
            'miner_address': self.miner_address,
            'reward': self.reward,
            'treasury_fee': self.treasury_fee,
            'axiom': self.axiom[:50] + '...' if len(self.axiom) > 50 else self.axiom,
            'merkle_root': self.merkle_root
        }


class Blockchain:
    """
    Blockchain manager for Excalibur $EXS Protocol.
    
    Manages the chain of blocks, validates new blocks, and maintains
    blockchain state.
    """
    
    def __init__(self):
        """Initialize an empty blockchain."""
        self.chain: List[Block] = []
        self.genesis_block: Optional[Block] = None
    
    def create_genesis_block(
        self,
        axiom: str,
        creator_address: str,
        reward: float = 50.0,
        treasury_fee: float = 0.5,
        difficulty: int = 4
    ) -> Block:
        """
        Create the Genesis block (block 0).
        
        Args:
            axiom: The 13-word axiom
            creator_address: The creator's address
            reward: Genesis block reward (default: 50 EXS)
            treasury_fee: Treasury fee from genesis (default: 0.5 EXS)
            difficulty: Mining difficulty
            
        Returns:
            Genesis Block instance
        """
        genesis_block = Block(
            height=0,
            timestamp=time.time(),
            previous_hash="0" * 64,  # Genesis has no previous block
            nonce=0,
            difficulty=difficulty,
            miner_address=creator_address,
            reward=reward,
            treasury_fee=treasury_fee,
            axiom=axiom,
            merkle_root="genesis"
        )
        
        self.genesis_block = genesis_block
        self.chain.append(genesis_block)
        
        return genesis_block
    
    def add_block(self, block: Block) -> bool:
        """
        Add a new block to the blockchain.
        
        Args:
            block: Block to add
            
        Returns:
            True if block was added, False if validation failed
        """
        # Validate block
        if not block.is_valid():
            return False
        
        # Check that previous hash matches
        if len(self.chain) > 0:
            if block.previous_hash != self.chain[-1].hash:
                return False
            
            # Check that height is sequential
            if block.height != self.chain[-1].height + 1:
                return False
        
        self.chain.append(block)
        return True
    
    def get_latest_block(self) -> Optional[Block]:
        """
        Get the most recent block in the chain.
        
        Returns:
            Latest Block or None if chain is empty
        """
        return self.chain[-1] if self.chain else None
    
    def get_block_by_height(self, height: int) -> Optional[Block]:
        """
        Get a block by its height.
        
        Args:
            height: Block height
            
        Returns:
            Block at the specified height or None if not found
        """
        if 0 <= height < len(self.chain):
            return self.chain[height]
        return None
    
    def calculate_total_rewards(self) -> Dict[str, float]:
        """
        Calculate total rewards in the blockchain.
        
        Returns:
            Dictionary with total miner rewards and treasury fees
        """
        total_miner_rewards = sum(block.reward - block.treasury_fee for block in self.chain)
        total_treasury_fees = sum(block.treasury_fee for block in self.chain)
        total_rewards = sum(block.reward for block in self.chain)
        
        return {
            'total_blocks': len(self.chain),
            'total_rewards': total_rewards,
            'total_miner_rewards': total_miner_rewards,
            'total_treasury_fees': total_treasury_fees
        }
    
    def is_valid_chain(self) -> bool:
        """
        Validate the entire blockchain.
        
        Returns:
            True if blockchain is valid, False otherwise
        """
        for i, block in enumerate(self.chain):
            # Validate block hash
            if not block.is_valid():
                return False
            
            # Skip genesis block for previous hash check
            if i == 0:
                continue
            
            # Check previous hash linkage
            if block.previous_hash != self.chain[i - 1].hash:
                return False
        
        return True
    
    def __len__(self) -> int:
        """Return the number of blocks in the chain."""
        return len(self.chain)
    
    def __repr__(self) -> str:
        """String representation of the blockchain."""
        return f"Blockchain(blocks={len(self.chain)}, valid={self.is_valid_chain()})"
