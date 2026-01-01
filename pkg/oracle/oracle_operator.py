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
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timezone

# Handle imports for both package and standalone usage
try:
    from .blockchain_llm import BlockchainLLM, EXCALIBUR_TRUTH
except ImportError:
    from blockchain_llm import BlockchainLLM, EXCALIBUR_TRUTH


class ExcaliburOracle:
    """
    Oracle operator for the Excalibur protocol.
    
    Provides intelligent validation, prophecy interpretation, and
    protocol guidance using the Blockchain LLM.
    """
    
    def __init__(self):
        """Initialize the Excalibur Oracle."""
        self.llm = BlockchainLLM()
        self.forge_history = []
        self.query_count = 0
        self.start_time = datetime.now(timezone.utc)
        
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
        
        # Record valid forges
        if llm_result["verdict"] == "VALID":
            self.forge_history.append({
                "nonce": nonce,
                "hash": hash_result,
                "timestamp": oracle_result["timestamp"],
                "oracle_id": oracle_result["oracle_id"]
            })
        
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
        
        for keyword, cat in keyword_map.items():
            if keyword in query_lower:
                category = cat
                break
        
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
        
        return {
            "oracle_name": "Excalibur Protocol Oracle",
            "status": "OPERATIONAL",
            "llm_status": self.llm.get_protocol_stats()["status"],
            "queries_processed": self.query_count,
            "forges_validated": len(self.forge_history),
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
        
        return {
            "divination": divinations[index],
            "oracle_wisdom": "The future is written in the blockchain.",
            "protocol_status": "OPERATIONAL",
            "forges_today": len([f for f in self.forge_history 
                                if datetime.fromisoformat(f["timestamp"]).date() == datetime.now().date()]),
            "timestamp": datetime.now(timezone.utc).isoformat()
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
    
    print("✨ Oracle operational and ready to serve the protocol.")


if __name__ == "__main__":
    main()
