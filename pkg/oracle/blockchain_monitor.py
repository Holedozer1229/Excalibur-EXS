#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Excalibur $EXS Protocol - Blockchain Monitor
---------------------------------------------
Block monitoring and prophecy inscription detection

This module monitors the Bitcoin blockchain for:
- New block arrivals
- Prophecy inscriptions (Ordinals)
- Protocol-related transactions
- Forge confirmation tracking

Author: Travis D. Jones <holedozer@gmail.com>
License: BSD 3-Clause
"""

import hashlib
import time
import logging
from typing import Dict, List, Optional, Callable
from datetime import datetime, timezone
from dataclasses import dataclass


# Configure logging
logger = logging.getLogger(__name__)


@dataclass
class BlockInfo:
    """Information about a monitored block"""
    height: int
    hash: str
    timestamp: datetime
    inscriptions_found: int
    prophecy_detected: bool


class BlockchainMonitor:
    """
    Monitors Bitcoin blockchain for protocol-relevant events.
    
    Tracks new blocks, searches for inscriptions, and detects
    prophecy-related transactions in the blockchain.
    """
    
    def __init__(self, start_height: Optional[int] = None):
        """
        Initialize the Blockchain Monitor.
        
        Args:
            start_height: Block height to start monitoring from
        """
        self.current_height = start_height or 840001  # Ordinals start
        self.monitored_blocks: List[BlockInfo] = []
        self.inscriptions_detected = []
        self.prophecy_count = 0
        self.monitoring_active = False
        self.callbacks: List[Callable] = []
        self.retry_config = {
            "max_retries": 3,
            "retry_delay": 5,  # seconds
            "backoff_factor": 2
        }
        logger.info(f"BlockchainMonitor initialized at height {self.current_height}")
    
    def register_callback(self, callback: Callable):
        """
        Register a callback for blockchain events.
        
        Args:
            callback: Function to call when events occur
        """
        self.callbacks.append(callback)
        logger.info(f"Registered callback: {callback.__name__}")
    
    def start_monitoring(self):
        """Start blockchain monitoring."""
        self.monitoring_active = True
        logger.info("Blockchain monitoring started")
    
    def stop_monitoring(self):
        """Stop blockchain monitoring."""
        self.monitoring_active = False
        logger.info("Blockchain monitoring stopped")
    
    def check_new_blocks(self, latest_height: int) -> List[BlockInfo]:
        """
        Check for new blocks since last check.
        
        Args:
            latest_height: Current blockchain height
            
        Returns:
            List of new blocks detected
        """
        new_blocks = []
        
        if latest_height > self.current_height:
            for height in range(self.current_height + 1, latest_height + 1):
                block = self._fetch_block_info(height)
                if block:
                    new_blocks.append(block)
                    self.monitored_blocks.append(block)
                    logger.info(f"New block detected: {height}")
                    
                    # Trigger callbacks
                    for callback in self.callbacks:
                        try:
                            callback("new_block", block)
                        except Exception as e:
                            logger.error(f"Callback error: {e}")
            
            self.current_height = latest_height
        
        return new_blocks
    
    def _fetch_block_info(self, height: int) -> Optional[BlockInfo]:
        """
        Fetch information about a block.
        
        This is a placeholder for actual blockchain API integration.
        In production, this would call a Bitcoin RPC or REST API.
        
        Args:
            height: Block height to fetch
            
        Returns:
            BlockInfo if successful, None otherwise
        """
        # Simulate block data (in production, call actual API)
        block_hash = hashlib.sha256(f"block_{height}".encode()).hexdigest()
        
        # Simulate inscription detection
        inscriptions_found = 0
        prophecy_detected = False
        
        # Check for inscriptions (simulated)
        if height >= 840001:  # Ordinals start
            # Simulate random inscription detection
            check_hash = int(hashlib.sha256(f"{height}".encode()).hexdigest()[:8], 16)
            if check_hash % 100 < 5:  # 5% chance
                inscriptions_found = 1
                prophecy_detected = self._check_for_prophecy(height, block_hash)
        
        return BlockInfo(
            height=height,
            hash=block_hash,
            timestamp=datetime.now(timezone.utc),
            inscriptions_found=inscriptions_found,
            prophecy_detected=prophecy_detected
        )
    
    def _check_for_prophecy(self, height: int, block_hash: str) -> bool:
        """
        Check if block contains prophecy inscription.
        
        Args:
            height: Block height
            block_hash: Block hash
            
        Returns:
            True if prophecy detected
        """
        # Placeholder for prophecy detection logic
        # In production, would parse inscription data
        prophecy_keywords = ["excalibur", "exs", "sword", "grail", "camelot"]
        
        # Simulate prophecy detection
        prophecy_check = int(hashlib.sha256(f"prophecy_{height}".encode()).hexdigest()[:8], 16)
        if prophecy_check % 1000 < 10:  # 1% of inscriptions
            self.prophecy_count += 1
            inscription_data = {
                "block_height": height,
                "block_hash": block_hash,
                "inscription_id": hashlib.sha256(f"inscription_{height}".encode()).hexdigest(),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            self.inscriptions_detected.append(inscription_data)
            logger.info(f"Prophecy inscription detected at height {height}")
            
            # Trigger callbacks
            for callback in self.callbacks:
                try:
                    callback("prophecy_detected", inscription_data)
                except Exception as e:
                    logger.error(f"Callback error: {e}")
            
            return True
        
        return False
    
    def search_inscriptions(self, start_height: int, end_height: int, 
                           keywords: Optional[List[str]] = None) -> List[Dict]:
        """
        Search for inscriptions in a block range.
        
        Args:
            start_height: Starting block height
            end_height: Ending block height
            keywords: Optional keywords to filter inscriptions
            
        Returns:
            List of matching inscriptions
        """
        logger.info(f"Searching inscriptions from {start_height} to {end_height}")
        found_inscriptions = []
        
        for height in range(start_height, end_height + 1):
            block = self._fetch_block_info(height)
            if block and block.inscriptions_found > 0:
                inscription = {
                    "block_height": height,
                    "block_hash": block.hash,
                    "timestamp": block.timestamp.isoformat(),
                    "prophecy": block.prophecy_detected
                }
                
                # Apply keyword filter if provided
                if keywords:
                    # In production, would check actual inscription content
                    if block.prophecy_detected:
                        found_inscriptions.append(inscription)
                else:
                    found_inscriptions.append(inscription)
        
        logger.info(f"Found {len(found_inscriptions)} inscriptions")
        return found_inscriptions
    
    def get_monitoring_stats(self) -> Dict:
        """
        Get blockchain monitoring statistics.
        
        Returns:
            Monitoring stats dictionary
        """
        return {
            "current_height": self.current_height,
            "blocks_monitored": len(self.monitored_blocks),
            "inscriptions_detected": len(self.inscriptions_detected),
            "prophecy_count": self.prophecy_count,
            "monitoring_active": self.monitoring_active,
            "callbacks_registered": len(self.callbacks)
        }
    
    def fetch_with_retry(self, fetch_func: Callable, *args, **kwargs) -> Optional[any]:
        """
        Execute a fetch function with retry logic.
        
        Args:
            fetch_func: Function to execute
            *args, **kwargs: Arguments to pass to function
            
        Returns:
            Result of fetch_func or None if all retries fail
        """
        max_retries = self.retry_config["max_retries"]
        retry_delay = self.retry_config["retry_delay"]
        backoff_factor = self.retry_config["backoff_factor"]
        
        for attempt in range(max_retries):
            try:
                result = fetch_func(*args, **kwargs)
                return result
            except Exception as e:
                logger.warning(f"Fetch attempt {attempt + 1} failed: {e}")
                
                if attempt < max_retries - 1:
                    wait_time = retry_delay * (backoff_factor ** attempt)
                    logger.info(f"Retrying in {wait_time} seconds...")
                    time.sleep(wait_time)
                else:
                    logger.error(f"All {max_retries} attempts failed")
                    return None
    
    def verify_inscription_on_chain(self, inscription_id: str) -> Dict:
        """
        Verify an inscription exists on-chain.
        
        Args:
            inscription_id: Inscription transaction ID
            
        Returns:
            Verification result
        """
        # Placeholder for actual on-chain verification
        # In production, would query Bitcoin node or indexer
        
        # Check in our detected inscriptions
        for inscription in self.inscriptions_detected:
            if inscription.get("inscription_id") == inscription_id:
                return {
                    "verified": True,
                    "inscription_id": inscription_id,
                    "block_height": inscription["block_height"],
                    "timestamp": inscription["timestamp"],
                    "message": "Inscription verified on-chain"
                }
        
        return {
            "verified": False,
            "inscription_id": inscription_id,
            "message": "Inscription not found in monitored blocks"
        }
    
    def get_recent_blocks(self, count: int = 10) -> List[BlockInfo]:
        """
        Get most recent monitored blocks.
        
        Args:
            count: Number of recent blocks to return
            
        Returns:
            List of recent blocks
        """
        return self.monitored_blocks[-count:] if self.monitored_blocks else []
    
    def calculate_inscription_density(self, block_range: int = 100) -> float:
        """
        Calculate inscription density over recent blocks.
        
        Args:
            block_range: Number of blocks to analyze
            
        Returns:
            Inscriptions per block ratio
        """
        recent_blocks = self.get_recent_blocks(block_range)
        if not recent_blocks:
            return 0.0
        
        total_inscriptions = sum(b.inscriptions_found for b in recent_blocks)
        return total_inscriptions / len(recent_blocks)


def main():
    """Demonstrate Blockchain Monitor functionality."""
    print("⛓️  Excalibur $EXS Blockchain Monitor")
    print("=" * 60)
    print()
    
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Initialize monitor
    monitor = BlockchainMonitor(start_height=840000)
    
    # Display initial stats
    print("📊 Initial Monitoring Stats:")
    stats = monitor.get_monitoring_stats()
    for key, value in stats.items():
        print(f"  {key}: {value}")
    print()
    
    # Register a callback
    def on_blockchain_event(event_type: str, data):
        print(f"🔔 Event: {event_type}")
        if event_type == "new_block":
            print(f"   Block Height: {data.height}")
        elif event_type == "prophecy_detected":
            print(f"   Inscription ID: {data['inscription_id']}")
    
    monitor.register_callback(on_blockchain_event)
    
    # Start monitoring
    monitor.start_monitoring()
    print("✅ Monitoring started")
    print()
    
    # Simulate checking for new blocks
    print("🔍 Checking for new blocks...")
    new_blocks = monitor.check_new_blocks(840010)
    print(f"Found {len(new_blocks)} new blocks")
    print()
    
    # Search for inscriptions
    print("📜 Searching for inscriptions...")
    inscriptions = monitor.search_inscriptions(840001, 840010)
    print(f"Found {len(inscriptions)} inscriptions")
    if inscriptions:
        print(f"  First inscription at height: {inscriptions[0]['block_height']}")
    print()
    
    # Display final stats
    print("📊 Final Monitoring Stats:")
    stats = monitor.get_monitoring_stats()
    for key, value in stats.items():
        print(f"  {key}: {value}")
    print()
    
    # Calculate density
    density = monitor.calculate_inscription_density(10)
    print(f"📈 Inscription Density: {density:.3f} per block")
    print()
    
    print("✨ Blockchain Monitor operational.")


if __name__ == "__main__":
    main()
