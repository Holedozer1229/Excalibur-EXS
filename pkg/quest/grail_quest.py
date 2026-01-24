#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Excalibur Grail Quest
---------------------
Special legendary quest for finding the Holy Grail.

Author: Travis D. Jones <holedozer@icloud.com>
License: BSD 3-Clause
"""

import hashlib
from typing import Dict, List, Optional
from datetime import datetime, timezone


class GrailQuest:
    """
    The legendary Grail Quest - a special cryptographic challenge.
    
    The Grail Quest requires knights to find a sequence of hashes
    that form a perfect cryptographic pattern, symbolizing the
    discovery of the Holy Grail.
    """
    
    # The Grail pattern (leading zeros forming a chalice shape in binary)
    GRAIL_PATTERN = "000000"  # 6 leading zeros = legendary difficulty
    
    def __init__(self):
        """Initialize the Grail Quest."""
        self.attempts = []
        self.grail_found = False
        self.grail_finder = None
        
    def embark_on_quest(self, knight_id: str, axiom: str) -> Dict:
        """
        Begin the Grail Quest.
        
        Args:
            knight_id: Knight identifier
            axiom: The sacred axiom
            
        Returns:
            Quest initiation result
        """
        quest_id = hashlib.sha256(
            f"GRAIL:{knight_id}:{datetime.now(timezone.utc).isoformat()}".encode()
        ).hexdigest()[:16]
        
        return {
            "quest_id": quest_id,
            "knight_id": knight_id,
            "quest_type": "GRAIL_QUEST",
            "difficulty": "LEGENDARY",
            "pattern_required": self.GRAIL_PATTERN,
            "reward": 1000.0,  # Legendary reward
            "message": "The quest for the Holy Grail begins...",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    def submit_grail_attempt(
        self,
        knight_id: str,
        nonce: int,
        hash_result: str,
        axiom: str
    ) -> Dict:
        """
        Submit an attempt to find the Grail.
        
        Args:
            knight_id: Knight identifier
            nonce: Proof-of-work nonce
            hash_result: Hash result
            axiom: Axiom used
            
        Returns:
            Attempt result
        """
        # Record attempt
        attempt = {
            "knight_id": knight_id,
            "nonce": nonce,
            "hash": hash_result,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        self.attempts.append(attempt)
        
        # Check if Grail pattern achieved
        if hash_result.startswith(self.GRAIL_PATTERN):
            self.grail_found = True
            self.grail_finder = knight_id
            
            return {
                "success": True,
                "status": "GRAIL_FOUND",
                "knight_id": knight_id,
                "nonce": nonce,
                "hash": hash_result,
                "reward": 1000.0,
                "message": "🏆 THE HOLY GRAIL HAS BEEN FOUND! 🏆",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        
        # Calculate how close
        leading_zeros = self._count_leading_zeros(hash_result)
        closeness = (leading_zeros / len(self.GRAIL_PATTERN)) * 100
        
        return {
            "success": False,
            "status": "SEARCHING",
            "knight_id": knight_id,
            "leading_zeros": leading_zeros,
            "required_zeros": len(self.GRAIL_PATTERN),
            "closeness": closeness,
            "message": f"Keep searching... ({leading_zeros}/{len(self.GRAIL_PATTERN)} zeros)",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    def _count_leading_zeros(self, hex_string: str) -> int:
        """Count leading zero bytes."""
        count = 0
        for i in range(0, len(hex_string), 2):
            if hex_string[i:i+2] == '00':
                count += 1
            else:
                break
        return count
    
    def get_quest_status(self) -> Dict:
        """
        Get current Grail Quest status.
        
        Returns:
            Quest status
        """
        return {
            "grail_found": self.grail_found,
            "grail_finder": self.grail_finder,
            "total_attempts": len(self.attempts),
            "unique_knights": len(set(a["knight_id"] for a in self.attempts)),
            "pattern_required": self.GRAIL_PATTERN,
            "difficulty": "LEGENDARY",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    def get_attempt_history(
        self,
        knight_id: Optional[str] = None,
        limit: int = 10
    ) -> List[Dict]:
        """
        Get attempt history.
        
        Args:
            knight_id: Filter by knight (optional)
            limit: Maximum attempts to return
            
        Returns:
            List of attempts
        """
        attempts = self.attempts
        
        if knight_id:
            attempts = [a for a in attempts if a["knight_id"] == knight_id]
        
        return attempts[-limit:]
    
    def get_leaderboard(self, limit: int = 10) -> List[Dict]:
        """
        Get Grail Quest leaderboard.
        
        Args:
            limit: Number of entries
            
        Returns:
            Leaderboard
        """
        # Count attempts per knight and best result
        knight_stats = {}
        
        for attempt in self.attempts:
            knight = attempt["knight_id"]
            if knight not in knight_stats:
                knight_stats[knight] = {
                    "knight_id": knight,
                    "attempts": 0,
                    "best_zeros": 0
                }
            
            knight_stats[knight]["attempts"] += 1
            zeros = self._count_leading_zeros(attempt["hash"])
            if zeros > knight_stats[knight]["best_zeros"]:
                knight_stats[knight]["best_zeros"] = zeros
        
        # Sort by best result, then attempts
        leaderboard = sorted(
            knight_stats.values(),
            key=lambda x: (x["best_zeros"], -x["attempts"]),
            reverse=True
        )
        
        return leaderboard[:limit]


def main():
    """Demonstrate Grail Quest functionality."""
    print("🏆 Excalibur Grail Quest")
    print("=" * 60)
    print()
    
    grail = GrailQuest()
    
    # Embark on quest
    print("⚔️ Embarking on Grail Quest:")
    quest = grail.embark_on_quest(
        "SIR-GALAHAD",
        "sword legend pull magic kingdom artist stone destroy forget fire steel honey question"
    )
    print(f"  Knight: {quest['knight_id']}")
    print(f"  Difficulty: {quest['difficulty']}")
    print(f"  Reward: {quest['reward']} $EXS")
    print(f"  Pattern: {quest['pattern_required']}")
    print()
    
    # Submit attempts
    print("🔍 Submitting Attempts:")
    attempts = [
        ("SIR-GALAHAD", 1000, "00000abcd1234567890"),
        ("SIR-LANCELOT", 2000, "0000001234567890abc"),
        ("SIR-GALAHAD", 3000, "000000123456789abcd")  # Grail found!
    ]
    
    for knight, nonce, hash_val in attempts:
        result = grail.submit_grail_attempt(knight, nonce, hash_val, quest["quest_type"])
        print(f"  {knight}: {result['status']}")
        if result["success"]:
            print(f"  {result['message']}")
            print(f"  Reward: {result['reward']} $EXS")
    print()
    
    # Quest status
    print("📊 Quest Status:")
    status = grail.get_quest_status()
    print(f"  Grail Found: {status['grail_found']}")
    print(f"  Finder: {status['grail_finder']}")
    print(f"  Total Attempts: {status['total_attempts']}")
    print()
    
    # Leaderboard
    print("🏅 Leaderboard:")
    leaderboard = grail.get_leaderboard(limit=5)
    for i, entry in enumerate(leaderboard, 1):
        print(f"  {i}. {entry['knight_id']}: {entry['best_zeros']} zeros ({entry['attempts']} attempts)")
    print()
    
    print("✅ Grail Quest operational")


if __name__ == "__main__":
    main()
