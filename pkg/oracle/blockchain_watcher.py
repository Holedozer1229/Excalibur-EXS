#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Excalibur Async Blockchain Watcher
-----------------------------------
Asynchronous blockchain monitoring with resilient error handling.

Author: Travis D. Jones <holedozer@gmail.com>
License: BSD 3-Clause
"""

import asyncio
import hashlib
import json
from typing import Dict, List, Optional, Callable
from datetime import datetime, timezone
from enum import Enum

try:
    import aiohttp
    AIOHTTP_AVAILABLE = True
except ImportError:
    AIOHTTP_AVAILABLE = False
    print("Note: aiohttp not available, using simulated mode")


class WatcherStatus(Enum):
    """Watcher status."""
    STARTING = "starting"
    RUNNING = "running"
    PAUSED = "paused"
    STOPPED = "stopped"
    ERROR = "error"


class BlockchainWatcher:
    """
    Asynchronous blockchain watcher with resilient monitoring.
    
    Monitors blockchain events, forge submissions, and prophecy validations
    with automatic retry and fallback mechanisms.
    """
    
    def __init__(
        self,
        check_interval: int = 10,
        max_retries: int = 3,
        timeout: int = 30
    ):
        """
        Initialize blockchain watcher.
        
        Args:
            check_interval: Seconds between checks
            max_retries: Maximum retry attempts on failure
            timeout: Request timeout in seconds
        """
        self.check_interval = check_interval
        self.max_retries = max_retries
        self.timeout = timeout
        self.status = WatcherStatus.STOPPED
        
        self.watched_addresses = []
        self.event_handlers = {}
        self.error_count = 0
        self.last_check = None
        self.events = []
        
    async def start_watching(self):
        """Start the blockchain watcher."""
        self.status = WatcherStatus.STARTING
        print(f"🔍 Starting blockchain watcher (interval: {self.check_interval}s)")
        
        self.status = WatcherStatus.RUNNING
        
        try:
            while self.status == WatcherStatus.RUNNING:
                await self._check_blockchain()
                await asyncio.sleep(self.check_interval)
        except Exception as e:
            self.status = WatcherStatus.ERROR
            print(f"❌ Watcher error: {e}")
            raise
    
    async def _check_blockchain(self):
        """Perform a blockchain check cycle."""
        self.last_check = datetime.now(timezone.utc)
        
        try:
            # Simulate blockchain query (replace with actual API calls)
            for address in self.watched_addresses:
                await self._check_address(address)
            
            self.error_count = 0  # Reset on success
            
        except Exception as e:
            self.error_count += 1
            print(f"⚠️  Check failed (attempt {self.error_count}): {e}")
            
            if self.error_count >= self.max_retries:
                print("❌ Max retries reached, entering error state")
                self.status = WatcherStatus.ERROR
    
    async def _check_address(self, address: str):
        """
        Check a specific blockchain address.
        
        Args:
            address: Address to check
        """
        # Simulate blockchain query with retry logic
        retry_count = 0
        
        while retry_count < self.max_retries:
            try:
                # In production, this would be an actual API call
                # async with aiohttp.ClientSession() as session:
                #     async with session.get(url, timeout=self.timeout) as response:
                #         data = await response.json()
                
                # Simulated data
                data = {
                    "address": address,
                    "balance": 100.0,
                    "transactions": [],
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
                
                # Emit event
                await self._emit_event("address_checked", data)
                return
                
            except Exception as e:
                retry_count += 1
                if retry_count >= self.max_retries:
                    print(f"❌ Failed to check address {address}: {e}")
                    raise
                
                await asyncio.sleep(1 * retry_count)  # Exponential backoff
    
    async def _emit_event(self, event_type: str, data: Dict):
        """
        Emit an event to registered handlers.
        
        Args:
            event_type: Type of event
            data: Event data
        """
        event = {
            "type": event_type,
            "data": data,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        self.events.append(event)
        
        # Call registered handlers
        if event_type in self.event_handlers:
            for handler in self.event_handlers[event_type]:
                try:
                    if asyncio.iscoroutinefunction(handler):
                        await handler(event)
                    else:
                        handler(event)
                except Exception as e:
                    print(f"⚠️  Handler error for {event_type}: {e}")
    
    def add_watch_address(self, address: str):
        """
        Add an address to watch.
        
        Args:
            address: Blockchain address
        """
        if address not in self.watched_addresses:
            self.watched_addresses.append(address)
            print(f"👁️  Watching address: {address}")
    
    def remove_watch_address(self, address: str):
        """
        Remove an address from watching.
        
        Args:
            address: Blockchain address
        """
        if address in self.watched_addresses:
            self.watched_addresses.remove(address)
            print(f"🚫 Stopped watching: {address}")
    
    def register_event_handler(
        self,
        event_type: str,
        handler: Callable
    ):
        """
        Register an event handler.
        
        Args:
            event_type: Type of event to handle
            handler: Handler function (can be async)
        """
        if event_type not in self.event_handlers:
            self.event_handlers[event_type] = []
        
        self.event_handlers[event_type].append(handler)
        print(f"📝 Registered handler for: {event_type}")
    
    def pause(self):
        """Pause the watcher."""
        if self.status == WatcherStatus.RUNNING:
            self.status = WatcherStatus.PAUSED
            print("⏸️  Watcher paused")
    
    def resume(self):
        """Resume the watcher."""
        if self.status == WatcherStatus.PAUSED:
            self.status = WatcherStatus.RUNNING
            print("▶️  Watcher resumed")
    
    def stop(self):
        """Stop the watcher."""
        self.status = WatcherStatus.STOPPED
        print("⏹️  Watcher stopped")
    
    def get_status(self) -> Dict:
        """
        Get watcher status.
        
        Returns:
            Status dictionary
        """
        return {
            "status": self.status.value,
            "watched_addresses": len(self.watched_addresses),
            "event_handlers": sum(len(h) for h in self.event_handlers.values()),
            "error_count": self.error_count,
            "last_check": self.last_check.isoformat() if self.last_check else None,
            "total_events": len(self.events),
            "check_interval": self.check_interval
        }
    
    def get_recent_events(self, limit: int = 10) -> List[Dict]:
        """
        Get recent events.
        
        Args:
            limit: Maximum events to return
            
        Returns:
            List of events
        """
        return self.events[-limit:]


class ForgeWatcher(BlockchainWatcher):
    """
    Specialized watcher for forge events.
    
    Monitors forge submissions and validates them in real-time.
    """
    
    def __init__(self, **kwargs):
        """Initialize forge watcher."""
        super().__init__(**kwargs)
        self.forge_count = 0
        self.valid_forges = 0
        
        # Register forge-specific handler
        self.register_event_handler("forge_detected", self._handle_forge)
    
    async def _check_blockchain(self):
        """Override to check for forge events."""
        await super()._check_blockchain()
        
        # Simulate forge detection
        if self.forge_count % 5 == 0:  # Every 5th check
            forge_event = {
                "axiom": "sword legend pull magic kingdom artist stone destroy forget fire steel honey question",
                "nonce": self.forge_count * 1000,
                "hash": hashlib.sha256(f"forge:{self.forge_count}".encode()).hexdigest(),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            await self._emit_event("forge_detected", forge_event)
        
        self.forge_count += 1
    
    def _handle_forge(self, event: Dict):
        """Handle detected forge event."""
        forge_data = event["data"]
        
        # Simple validation
        hash_val = forge_data.get("hash", "")
        if hash_val.startswith("0000"):
            self.valid_forges += 1
            print(f"✅ Valid forge detected: {hash_val[:16]}...")
        else:
            print(f"⚠️  Invalid forge: {hash_val[:16]}...")
    
    def get_status(self) -> Dict:
        """Get forge watcher status."""
        status = super().get_status()
        status["forge_count"] = self.forge_count
        status["valid_forges"] = self.valid_forges
        return status


async def demo_watcher():
    """Demonstrate the blockchain watcher."""
    print("🔍 Excalibur Async Blockchain Watcher Demo")
    print("=" * 60)
    print()
    
    # Create forge watcher
    watcher = ForgeWatcher(check_interval=2, max_retries=3)
    
    # Add watch addresses
    watcher.add_watch_address("bc1p5qramfsu9f243cgmm292w8w9n38lcl0q8f8swkxsm3zn9cgmru2sza07xt")
    print()
    
    # Create monitoring task
    watch_task = asyncio.create_task(watcher.start_watching())
    
    # Let it run for a bit
    print("⏱️  Monitoring for 10 seconds...")
    await asyncio.sleep(10)
    
    # Stop watcher
    watcher.stop()
    
    # Wait for task to finish
    try:
        await asyncio.wait_for(watch_task, timeout=2)
    except asyncio.TimeoutError:
        pass
    
    print()
    print("📊 Final Status:")
    status = watcher.get_status()
    for key, value in status.items():
        print(f"  {key}: {value}")
    print()
    
    print("✅ Watcher demo complete")


def main():
    """Run the demo."""
    asyncio.run(demo_watcher())


if __name__ == "__main__":
    main()
