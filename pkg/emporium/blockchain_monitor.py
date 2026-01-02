#!/usr/bin/env python3
"""
Blockchain Monitor - Monitors blockchain for prophecy inscriptions and transactions

This module provides functionality for monitoring the blockchain, tracking prophecy
inscriptions, and handling related transactions for the Emporium of Man system.

Features:
- Real-time blockchain monitoring
- Prophecy inscription tracking
- Transaction validation
- Event streaming for live updates

Author: Travis D. Jones <holedozer@gmail.com>
License: BSD 3-Clause
Copyright (c) 2025, Travis D. Jones
"""

import hashlib
import json
import logging
import time
from datetime import datetime
from typing import Dict, List, Optional, Callable
from dataclasses import dataclass, asdict
from decimal import Decimal


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class ProphecyInscription:
    """Represents a prophecy inscription on the blockchain."""
    inscription_id: str
    block_height: int
    timestamp: datetime
    axiom: str
    prophecy_hash: str
    vault_address: str
    txid: str
    confirmed: bool = False
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization."""
        data = asdict(self)
        data['timestamp'] = self.timestamp.isoformat()
        return data


@dataclass
class BlockchainEvent:
    """Represents a blockchain event."""
    event_type: str  # 'inscription', 'transaction', 'block'
    block_height: int
    timestamp: datetime
    data: Dict
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization."""
        result = asdict(self)
        result['timestamp'] = self.timestamp.isoformat()
        return result


class BlockchainMonitor:
    """
    Monitors the blockchain for prophecy inscriptions and relevant transactions.
    
    This class provides real-time monitoring capabilities for the Emporium of Man
    system, tracking prophecy inscriptions and related blockchain events.
    """
    
    def __init__(self, network: str = 'mainnet', start_block: Optional[int] = None):
        """
        Initialize the blockchain monitor.
        
        Args:
            network: Network to monitor ('mainnet', 'testnet', 'regtest')
            start_block: Starting block height for monitoring (None = latest)
        """
        self.network = network
        self.current_block = start_block or 0
        self.inscriptions: List[ProphecyInscription] = []
        self.events: List[BlockchainEvent] = []
        self.event_callbacks: List[Callable] = []
        self.is_monitoring = False
        
        logger.info(f"BlockchainMonitor initialized for {network}")
    
    def add_event_callback(self, callback: Callable[[BlockchainEvent], None]) -> None:
        """
        Add a callback function to be called when new events are detected.
        
        Args:
            callback: Function to call with BlockchainEvent parameter
        """
        self.event_callbacks.append(callback)
        logger.info(f"Added event callback: {callback.__name__}")
    
    def start_monitoring(self) -> None:
        """Start monitoring the blockchain."""
        self.is_monitoring = True
        logger.info(f"Started monitoring blockchain from block {self.current_block}")
    
    def stop_monitoring(self) -> None:
        """Stop monitoring the blockchain."""
        self.is_monitoring = False
        logger.info("Stopped monitoring blockchain")
    
    def process_block(self, block_height: int) -> List[BlockchainEvent]:
        """
        Process a block and extract relevant events.
        
        Args:
            block_height: Height of the block to process
            
        Returns:
            List of blockchain events found in the block
        """
        events = []
        
        # In a real implementation, this would connect to a Bitcoin node
        # For now, we simulate block processing
        logger.debug(f"Processing block {block_height}")
        
        # Create a block event
        block_event = BlockchainEvent(
            event_type='block',
            block_height=block_height,
            timestamp=datetime.utcnow(),
            data={'height': block_height}
        )
        events.append(block_event)
        self.events.append(block_event)
        
        # Notify callbacks
        for callback in self.event_callbacks:
            try:
                callback(block_event)
            except Exception as e:
                logger.error(f"Error in event callback: {e}")
        
        self.current_block = block_height
        return events
    
    def record_prophecy_inscription(
        self,
        axiom: str,
        vault_address: str,
        txid: str,
        block_height: Optional[int] = None
    ) -> ProphecyInscription:
        """
        Record a new prophecy inscription.
        
        Args:
            axiom: The 13-word prophecy axiom
            vault_address: The Taproot vault address
            txid: Transaction ID
            block_height: Block height (None = pending)
            
        Returns:
            The created ProphecyInscription object
        """
        # Generate inscription ID
        inscription_data = f"{axiom}:{vault_address}:{txid}"
        inscription_id = hashlib.sha256(inscription_data.encode()).hexdigest()[:16]
        
        # Generate prophecy hash
        prophecy_hash = hashlib.sha256(axiom.encode()).hexdigest()
        
        inscription = ProphecyInscription(
            inscription_id=inscription_id,
            block_height=block_height or 0,
            timestamp=datetime.utcnow(),
            axiom=axiom,
            prophecy_hash=prophecy_hash,
            vault_address=vault_address,
            txid=txid,
            confirmed=block_height is not None
        )
        
        self.inscriptions.append(inscription)
        
        # Create event
        event = BlockchainEvent(
            event_type='inscription',
            block_height=inscription.block_height,
            timestamp=inscription.timestamp,
            data=inscription.to_dict()
        )
        self.events.append(event)
        
        # Notify callbacks
        for callback in self.event_callbacks:
            try:
                callback(event)
            except Exception as e:
                logger.error(f"Error in event callback: {e}")
        
        logger.info(f"Recorded prophecy inscription: {inscription_id}")
        return inscription
    
    def get_inscriptions(
        self,
        limit: int = 100,
        confirmed_only: bool = False
    ) -> List[ProphecyInscription]:
        """
        Get prophecy inscriptions.
        
        Args:
            limit: Maximum number of inscriptions to return
            confirmed_only: Only return confirmed inscriptions
            
        Returns:
            List of prophecy inscriptions
        """
        inscriptions = self.inscriptions
        
        if confirmed_only:
            inscriptions = [i for i in inscriptions if i.confirmed]
        
        # Sort by timestamp descending (most recent first)
        inscriptions = sorted(inscriptions, key=lambda x: x.timestamp, reverse=True)
        
        return inscriptions[:limit]
    
    def get_inscription_by_id(self, inscription_id: str) -> Optional[ProphecyInscription]:
        """
        Get a specific inscription by ID.
        
        Args:
            inscription_id: The inscription ID
            
        Returns:
            ProphecyInscription if found, None otherwise
        """
        for inscription in self.inscriptions:
            if inscription.inscription_id == inscription_id:
                return inscription
        return None
    
    def get_recent_events(self, limit: int = 50) -> List[BlockchainEvent]:
        """
        Get recent blockchain events.
        
        Args:
            limit: Maximum number of events to return
            
        Returns:
            List of recent blockchain events
        """
        # Sort by timestamp descending
        events = sorted(self.events, key=lambda x: x.timestamp, reverse=True)
        return events[:limit]
    
    def get_status(self) -> Dict:
        """
        Get current monitoring status.
        
        Returns:
            Dictionary with monitoring status information
        """
        return {
            'is_monitoring': self.is_monitoring,
            'network': self.network,
            'current_block': self.current_block,
            'total_inscriptions': len(self.inscriptions),
            'confirmed_inscriptions': len([i for i in self.inscriptions if i.confirmed]),
            'pending_inscriptions': len([i for i in self.inscriptions if not i.confirmed]),
            'total_events': len(self.events),
        }
    
    def validate_transaction(self, txid: str) -> bool:
        """
        Validate a transaction exists and is properly formatted.
        
        Args:
            txid: Transaction ID to validate
            
        Returns:
            True if valid, False otherwise
        """
        # Basic validation - check format
        if not txid or len(txid) != 64:
            return False
        
        try:
            # Verify it's a valid hex string
            int(txid, 16)
            return True
        except ValueError:
            return False
    
    def confirm_inscription(self, inscription_id: str, block_height: int) -> bool:
        """
        Confirm a pending inscription.
        
        Args:
            inscription_id: The inscription ID to confirm
            block_height: The block height where it was confirmed
            
        Returns:
            True if confirmed successfully, False otherwise
        """
        inscription = self.get_inscription_by_id(inscription_id)
        
        if not inscription:
            logger.warning(f"Inscription not found: {inscription_id}")
            return False
        
        inscription.confirmed = True
        inscription.block_height = block_height
        
        logger.info(f"Confirmed inscription {inscription_id} at block {block_height}")
        return True
