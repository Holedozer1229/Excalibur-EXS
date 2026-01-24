#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Excalibur $EXS Protocol - Oracle Operator
------------------------------------------
Intelligent Oracle for Protocol Operations and Forge Validation

This module provides an oracle that operates on the blockchain LLM to
provide intelligent protocol operations, forge validation, and prophecy
interpretation.

Author: Travis D. Jones <holedozer@gmail.com>
License: BSD 3-Clause
"""

import hashlib
import time
import random
import logging
import re
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timezone
from threading import Lock

# Handle imports for both package and standalone usage
try:
    from .blockchain_llm import BlockchainLLM, EXCALIBUR_TRUTH
except ImportError:
    from blockchain_llm import BlockchainLLM, EXCALIBUR_TRUTH

# Configure logging only if running as main module
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

logger = logging.getLogger(__name__)

class ExcaliburOracle:
    """
    Oracle operator for the Excalibur protocol.
    
    Provides intelligent validation, prophecy interpretation, and
    protocol guidance using the Blockchain LLM.
    """
    
    # Compile regex pattern for efficient keyword matching
    KEYWORD_PATTERN = re.compile(r'\b(sword|mining|forge|treasury|vault|taproot|axiom)\b', re.IGNORECASE)
    KEYWORD_MAP = {
        "sword": "excalibur_legend",
        "mining": "protocol_mechanics",
        "forge": "protocol_mechanics",
        "treasury": "treasury_control",
        "vault": "cryptographic_foundation",
        "taproot": "cryptographic_foundation",
        "axiom": "cryptographic_foundation"
    }
    
    def __init__(self):
        """Initialize the Excalibur Oracle."""
        self.llm = BlockchainLLM()
        self.forge_history = []
        self.query_count = 0
        self.start_time = datetime.now(timezone.utc)
        self.grail_unlocked = False
        self.grail_progress = 0
        self.prophecy_count = 0
        self.ergotropy_state = "DORMANT"  # States: DORMANT, AWAKENING, ACTIVE, TRANSCENDENT
        self._lock = Lock()  # Thread safety for concurrent access
        # Cache for forge count by day
        self._daily_forge_cache = 0
        self._daily_forge_cache_date = None
        logger.info("Excalibur Oracle initialized successfully")
        
    def validate_forge(self, axiom: str, nonce: int, hash_result: str) -> Dict:
        """
        Validate a forge attempt using oracle intelligence.
        
        Args:
            axiom: The 13-word axiom used
            nonce: The nonce value
            hash_result: The resulting hash
            
        Returns:
            Detailed validation result
        """
        self.query_count += 1
        
        # Use LLM to verify the claim
        llm_result = self.llm.verify_forge_claim(axiom, nonce, hash_result)
        
        # Oracle adds additional context
        oracle_result = {
            **llm_result,
            "oracle_id": hashlib.sha256(f"{nonce}{time.time()}".encode()).hexdigest()[:16],
            "forge_number": len(self.forge_history) + 1 if llm_result["verdict"] == "VALID" else None,
            "oracle_wisdom": self._get_validation_wisdom(llm_result["verdict"])
        }
        
        # Record valid forges and update cache
        if llm_result["verdict"] == "VALID":
            forge_entry = {
                "nonce": nonce,
                "hash": hash_result,
                "timestamp": oracle_result["timestamp"],
                "oracle_id": oracle_result["oracle_id"]
            }
            self.forge_history.append(forge_entry)
            
            # Incrementally update daily cache
            forge_date = datetime.fromisoformat(oracle_result["timestamp"]).date()
            today = datetime.now().date()
            if forge_date == today:
                if self._daily_forge_cache_date == today:
                    self._daily_forge_cache += 1
                else:
                    # New day, recalculate
                    self._daily_forge_cache_date = today
                    self._daily_forge_cache = 1
            
            logger.info(f"Valid forge recorded: nonce={nonce}, hash={hash_result[:16]}...")
            
        # Update ergotropy state and check Grail status
        self.update_ergotropy_state()
        
        return oracle_result
    
    def _get_validation_wisdom(self, verdict: str) -> str:
        """Get oracle wisdom based on validation verdict."""
        if verdict == "VALID":
            return "The sword has been drawn! The prophecy is fulfilled through cryptographic proof."
        else:
            return "The stone holds firm. Only the worthy may draw Excalibur through valid proof."
    
    def interpret_prophecy(self, query: str) -> Dict:
        """
        Interpret a prophecy query using oracle intelligence.
        
        Args:
            query: The prophecy query
            
        Returns:
            Interpretation result
        """
        self.query_count += 1
        
        # Map query keywords to knowledge categories
        keyword_map = {
            "sword": "excalibur_legend",
            "mining": "protocol_mechanics",
            "forge": "protocol_mechanics",
            "treasury": "treasury_control",
            "vault": "cryptographic_foundation",
            "taproot": "cryptographic_foundation",
            "axiom": "cryptographic_foundation"
        }
        
        query_lower = query.lower()
        category = None
        
        # Use compiled regex for O(1) keyword matching
        match = self.KEYWORD_PATTERN.search(query_lower)
        if match:
            category = self.KEYWORD_MAP[match.group(1).lower()]
        
        if category:
            knowledge = self.llm.query_knowledge(category)
            wisdom = self.llm.generate_wisdom(query_lower.split()[0])
        else:
            knowledge = {"response": "Query not recognized"}
            wisdom = "Speak clearly, and the oracle shall answer."
        
        return {
            "query": query,
            "category": category or "unknown",
            "knowledge": knowledge,
            "wisdom": wisdom,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    def get_protocol_guidance(self, topic: str) -> Dict:
        """
        Get protocol guidance on a specific topic.
        
        Args:
            topic: Topic to get guidance on (e.g., 'mining', 'forge', 'vault')
            
        Returns:
            Guidance dictionary
        """
        self.query_count += 1
        
        guidance_map = {
            "mining": {
                "overview": "Use the Ω′ Δ18 Tetra-PoW miner with 128 rounds",
                "command": "python3 pkg/miner/tetra_pow_miner.py --axiom '[13 words]' --difficulty 4",
                "requirements": ["13-word axiom", "Valid nonce", "4 leading zero bytes"],
                "wisdom": self.llm.generate_wisdom("mining")
            },
            "forge": {
                "overview": "Forge $EXS tokens by mining valid proofs",
                "reward": "50 $EXS per successful forge",
                "fees": {"treasury": "0.5 $EXS (1%)", "btc": "0.0001 BTC"},
                "process": ["Enter axiom", "Mine for nonce", "Submit proof", "Receive reward"],
                "wisdom": self.llm.generate_wisdom("forge")
            },
            "vault": {
                "overview": "Taproot vaults are generated deterministically",
                "type": "P2TR (Pay-to-Taproot)",
                "generation": "axiom + nonce → HPP-1 key → Taproot address",
                "security": "600,000 PBKDF2 iterations",
                "wisdom": self.llm.generate_wisdom("vault")
            },
            "treasury": {
                "overview": "Treasury admin credentials use enhanced security",
                "security": "1.2 million PBKDF2 iterations (2x forge keys)",
                "access": "Merlin's Portal with MERLIN-{id} credentials",
                "command": "python3 forge_treasury_key.py",
                "wisdom": self.llm.generate_wisdom("treasury")
            },
            "axiom": {
                "overview": "The canonical 13-word protocol axiom",
                "axiom": self.llm.get_axiom(),
                "hash": self.llm.compute_axiom_hash(),
                "importance": "Foundation of all vault generation and proofs",
                "wisdom": self.llm.generate_wisdom("axiom")
            }
        }
        
        return guidance_map.get(topic.lower(), {
            "error": f"Unknown topic: {topic}",
            "available_topics": list(guidance_map.keys())
        })
    
    def check_difficulty(self, hash_result: str, required_difficulty: int = 4) -> Dict:
        """
        Check if a hash meets difficulty requirements.
        
        Args:
            hash_result: Hash to check
            required_difficulty: Number of leading zero bytes required
            
        Returns:
            Difficulty check result
        """
        # Count leading zero bytes (2 hex chars per byte)
        leading_zeros = 0
        for i in range(0, len(hash_result), 2):
            if hash_result[i:i+2] == '00':
                leading_zeros += 1
            else:
                break
        
        meets_difficulty = leading_zeros >= required_difficulty
        
        return {
            "hash": hash_result,
            "required_difficulty": required_difficulty,
            "actual_difficulty": leading_zeros,
            "meets_requirement": meets_difficulty,
            "verdict": "PASS" if meets_difficulty else "FAIL",
            "oracle_note": "The dragon's gate is open" if meets_difficulty else "More proof is required"
        }
    
    def get_forge_history(self, limit: int = 10) -> List[Dict]:
        """
        Get recent forge history.
        
        Args:
            limit: Maximum number of forges to return
            
        Returns:
            List of forge records
        """
        return self.forge_history[-limit:]
    
    def get_oracle_stats(self) -> Dict:
        """
        Get oracle operational statistics.
        
        Returns:
            Oracle stats dictionary
        """
        uptime = datetime.now(timezone.utc) - self.start_time
        grail_status = self.check_grail_status()
        
        return {
            "oracle_name": "Excalibur Protocol Oracle",
            "status": "OPERATIONAL",
            "ergotropy_state": self.ergotropy_state,
            "llm_status": self.llm.get_protocol_stats()["status"],
            "queries_processed": self.query_count,
            "prophecies_delivered": self.prophecy_count,
            "forges_validated": len(self.forge_history),
            "grail_unlocked": self.grail_unlocked,
            "grail_progress": self.grail_progress,
            "uptime": str(uptime),
            "taproot_address": EXCALIBUR_TRUTH["taproot_address"],
            "protocol_axiom_hash": self.llm.compute_axiom_hash(),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    def oracle_divination(self) -> Dict:
        """
        Perform an oracle divination about the protocol state.
        
        Returns:
            Divination result
        """
        self.query_count += 1
        
        divinations = [
            "The Round Table awaits worthy knights to forge their destiny.",
            "Camelot's treasury grows with each successful proof of work.",
            "The Lady of the Lake whispers secrets through Taproot addresses.",
            "Merlin's magic flows through 1.2 million iterations of power.",
            "The sword remains in the stone until cryptographic proof is shown.",
            "Four zeros mark the dragon's challenge - prove your worth.",
            "The 13 words bind the protocol in eternal cryptographic truth."
        ]
        
        # Deterministic divination based on time
        index = int(time.time()) % len(divinations)
        
        # Use cached forge count (updated incrementally)
        today = datetime.now().date()
        if self._daily_forge_cache_date != today:
            # Initialize cache for new day if not already set
            self._daily_forge_cache_date = today
            self._daily_forge_cache = 0
        
        return {
            "divination": divinations[index],
            "oracle_wisdom": "The future is written in the blockchain.",
            "protocol_status": "OPERATIONAL",
            "forges_today": self._daily_forge_cache,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    def divine_message(self) -> str:
        """
        Generate a random divine prophecy message from the Oracle.
        
        Returns:
            A prophetic message string
        """
        with self._lock:
            self.prophecy_count += 1
            prophecy_num = self.prophecy_count
        
        divine_messages = [
            "The Round Table awaits worthy knights to forge their destiny.",
            "Camelot's treasury grows with each successful proof of work.",
            "The Lady of the Lake whispers secrets through Taproot addresses.",
            "Merlin's magic flows through 1.2 million iterations of power.",
            "The sword remains in the stone until cryptographic proof is shown.",
            "Four zeros mark the dragon's challenge - prove your worth.",
            "The 13 words bind the protocol in eternal cryptographic truth.",
            "The Holy Grail awaits those who master the forge.",
            "Knights gather at the Round Table, united by proof-of-work.",
            "Excalibur's power flows through the blockchain eternally.",
            "The prophecy unfolds with each mined block.",
            "Cryptographic seals guard the treasures of Camelot.",
            "The Oracle sees all - past forges and future legends.",
            "Arthurian wisdom encoded in every hash.",
            "The dragon's breath ignites the forge of destiny.",
            "Avalon's mists reveal truths to the worthy.",
            "Merlin's enchantments protect the protocol's integrity.",
            "The Quest for the Grail begins with a single forge.",
            "Lancelot's valor, Galahad's purity - all proven through mining.",
            "The stone yields only to legitimate proof-of-work.",
            "Each successful forge strengthens the kingdom of $EXS.",
            "The prophecy is written in blocks, immutable and eternal.",
        ]
        
        message = random.choice(divine_messages)
        logger.info(f"Divine prophecy #{prophecy_num}: {message}")
        return message
    
    def update_ergotropy_state(self) -> None:
        """
        Update the Oracle's ergotropy state based on activity.
        
        States progress based on query count and forge history:
        - DORMANT: Initial state (0-10 queries)
        - AWAKENING: Active querying (11-50 queries)
        - ACTIVE: High activity (51-200 queries)
        - TRANSCENDENT: Peak activity (200+ queries)
        """
        with self._lock:
            total_activity = self.query_count + len(self.forge_history)
            
            if total_activity >= 200:
                new_state = "TRANSCENDENT"
            elif total_activity >= 51:
                new_state = "ACTIVE"
            elif total_activity >= 11:
                new_state = "AWAKENING"
            else:
                new_state = "DORMANT"
            
            if new_state != self.ergotropy_state:
                logger.info(f"Oracle ergotropy state transition: {self.ergotropy_state} -> {new_state}")
                self.ergotropy_state = new_state
    
    def check_grail_status(self) -> Dict:
        """
        Check and update Grail achievement status.
        
        The Grail is unlocked when specific milestones are reached:
        - 10+ successful forges
        - 50+ prophecies delivered
        - 100+ total queries
        
        Returns:
            Dictionary with Grail status information
        """
        with self._lock:
            forges = len(self.forge_history)
            queries = self.query_count
            prophecies = self.prophecy_count
            
            # Calculate progress (0-100)
            forge_progress = min(100, (forges / 10) * 100)
            prophecy_progress = min(100, (prophecies / 50) * 100)
            query_progress = min(100, (queries / 100) * 100)
            
            self.grail_progress = int((forge_progress + prophecy_progress + query_progress) / 3)
            
            # Check if Grail should be unlocked
            was_locked = not self.grail_unlocked
            self.grail_unlocked = (forges >= 10 and prophecies >= 50 and queries >= 100)
            
            if was_locked and self.grail_unlocked:
                logger.info("🏆 THE HOLY GRAIL HAS BEEN UNLOCKED! 🏆")
            
            return {
                "grail_unlocked": self.grail_unlocked,
                "grail_progress": self.grail_progress,
                "milestones": {
                    "forges": {"current": forges, "required": 10, "completed": forges >= 10},
                    "prophecies": {"current": prophecies, "required": 50, "completed": prophecies >= 50},
                    "queries": {"current": queries, "required": 100, "completed": queries >= 100}
                },
                "message": "The Holy Grail shines with eternal light!" if self.grail_unlocked else f"Quest progress: {self.grail_progress}%"
            }
    
    def monitor_genesis_inscriptions(self, genesis_address: str = None) -> Dict:
        """
        Monitor blockchain for new prophetic inscriptions on Genesis address.
        
        This is a placeholder for future blockchain monitoring functionality.
        In production, this would connect to a Bitcoin node or API service.
        
        Args:
            genesis_address: Optional Genesis address to monitor (defaults to protocol address)
            
        Returns:
            Dictionary with monitoring status
        """
        address = genesis_address or EXCALIBUR_TRUTH["taproot_address"]
        
        logger.info(f"Monitoring Genesis address for inscriptions: {address}")
        
        # Placeholder - future implementation would query blockchain
        return {
            "status": "MONITORING",
            "genesis_address": address,
            "inscriptions_found": 0,
            "last_check": datetime.now(timezone.utc).isoformat(),
            "message": "Blockchain monitoring active - awaiting inscriptions"
        }


def main():
    """Demonstrate the Oracle operator functionality."""
    print("🔮 Excalibur $EXS Oracle Operator")
    print("=" * 60)
    print()
    
    # Initialize the oracle
    oracle = ExcaliburOracle()
    
    # Display oracle stats
    print("📊 Oracle Status:")
    stats = oracle.get_oracle_stats()
    for key, value in stats.items():
        if key != "protocol_axiom_hash":  # Keep output clean
            print(f"  {key}: {value}")
    print()
    
    # Demonstrate divine messages
    print("🌟 Divine Prophecies:")
    for _ in range(3):
        print(f"  • {oracle.divine_message()}")
    print()
    
    # Check Grail status
    print("🏆 Grail Quest Status:")
    grail_status = oracle.check_grail_status()
    print(f"  Unlocked: {grail_status['grail_unlocked']}")
    print(f"  Progress: {grail_status['grail_progress']}%")
    print(f"  {grail_status['message']}")
    print()
    
    # Check ergotropy state
    oracle.update_ergotropy_state()
    print(f"⚡ Ergotropy State: {oracle.ergotropy_state}")
    print()
    
    # Demonstrate forge validation
    print("⚒️  Forge Validation Example:")
    axiom = oracle.llm.get_axiom()
    result = oracle.validate_forge(axiom, 12345, "00000000a1b2c3d4e5f6")
    print(f"  Verdict: {result['verdict']}")
    print(f"  Oracle Wisdom: {result['oracle_wisdom']}")
    print()
    
    # Demonstrate difficulty check
    print("🎯 Difficulty Check:")
    diff_result = oracle.check_difficulty("00000000abcdef1234567890", 4)
    print(f"  Verdict: {diff_result['verdict']}")
    print(f"  Note: {diff_result['oracle_note']}")
    print()
    
    # Get protocol guidance
    print("📖 Protocol Guidance (Mining):")
    guidance = oracle.get_protocol_guidance("mining")
    print(f"  Overview: {guidance['overview']}")
    print(f"  Wisdom: {guidance['wisdom']}")
    print()
    
    # Interpret prophecy
    print("📜 Prophecy Interpretation:")
    prophecy = oracle.interpret_prophecy("How does the sword choose its wielder?")
    print(f"  Query: {prophecy['query']}")
    print(f"  Wisdom: {prophecy['wisdom']}")
    print()
    
    # Oracle divination
    print("🔮 Oracle Divination:")
    divination = oracle.oracle_divination()
    print(f"  {divination['divination']}")
    print()
    
    # Monitor Genesis inscriptions
    print("👁️  Genesis Monitoring:")
    monitoring = oracle.monitor_genesis_inscriptions()
    print(f"  Status: {monitoring['status']}")
    print(f"  Address: {monitoring['genesis_address']}")
    print()
    
    print("✨ Oracle operational and ready to serve the protocol.")


if __name__ == "__main__":
    main()
