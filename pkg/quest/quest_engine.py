#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Excalibur Quest Engine
----------------------
Manages cryptographic quests and challenges.

Author: Travis D. Jones <holedozer@gmail.com>
License: BSD 3-Clause
"""

import hashlib
import random
from typing import Dict, List, Optional
from datetime import datetime, timezone, timedelta
from enum import Enum


class QuestStatus(Enum):
    """Status of a quest."""
    ACTIVE = "active"
    COMPLETED = "completed"
    FAILED = "failed"
    EXPIRED = "expired"


class QuestEngine:
    """
    Manages cryptographic quests for the Excalibur protocol.
    
    Quests are challenges that engage users with the prophecy system
    through proof-of-work, puzzle solving, and cryptographic validation.
    """
    
    def __init__(self):
        """Initialize the quest engine."""
        self.quests = {}
        self.quest_counter = 0
        self.knight_progress = {}
        
    def create_quest(
        self,
        title: str,
        description: str,
        quest_type: str,
        difficulty: int = 4,
        reward: float = 10.0,
        duration_hours: int = 48
    ) -> Dict:
        """
        Create a new quest.
        
        Args:
            title: Quest title
            description: Quest description
            quest_type: Type of quest ('mining', 'validation', 'puzzle')
            difficulty: Difficulty level (1-10)
            reward: EXS reward for completion
            duration_hours: Hours until quest expires
            
        Returns:
            Quest record
        """
        self.quest_counter += 1
        quest_id = f"QUEST-{self.quest_counter:06d}"
        
        now = datetime.now(timezone.utc)
        expires = now + timedelta(hours=duration_hours)
        
        quest = {
            "id": quest_id,
            "title": title,
            "description": description,
            "type": quest_type,
            "difficulty": difficulty,
            "reward": reward,
            "status": QuestStatus.ACTIVE.value,
            "created_at": now.isoformat(),
            "expires_at": expires.isoformat(),
            "participants": [],
            "completions": 0,
            "metadata": self._generate_quest_metadata(quest_type, difficulty)
        }
        
        self.quests[quest_id] = quest
        return quest
    
    def _generate_quest_metadata(self, quest_type: str, difficulty: int) -> Dict:
        """Generate quest-specific metadata."""
        if quest_type == "mining":
            return {
                "target_hashes": difficulty * 10,
                "min_leading_zeros": difficulty,
                "axiom_required": True
            }
        elif quest_type == "validation":
            return {
                "proofs_to_validate": difficulty * 5,
                "accuracy_required": 0.95
            }
        elif quest_type == "puzzle":
            # Generate a cryptographic puzzle
            puzzle_seed = hashlib.sha256(f"puzzle:{self.quest_counter}".encode()).hexdigest()
            return {
                "puzzle_seed": puzzle_seed,
                "solution_pattern": puzzle_seed[:difficulty * 2],
                "max_attempts": difficulty * 100
            }
        else:
            return {}
    
    def register_participant(self, quest_id: str, knight_id: str) -> Dict:
        """
        Register a knight for a quest.
        
        Args:
            quest_id: Quest ID
            knight_id: Knight identifier
            
        Returns:
            Registration result
        """
        if quest_id not in self.quests:
            return {
                "success": False,
                "error": "Quest not found"
            }
        
        quest = self.quests[quest_id]
        
        # Check if expired
        if datetime.now(timezone.utc) > datetime.fromisoformat(quest["expires_at"]):
            quest["status"] = QuestStatus.EXPIRED.value
            return {
                "success": False,
                "error": "Quest has expired"
            }
        
        # Check if already registered
        if knight_id in quest["participants"]:
            return {
                "success": False,
                "error": "Already registered for this quest"
            }
        
        # Register
        quest["participants"].append(knight_id)
        
        # Initialize knight progress
        if knight_id not in self.knight_progress:
            self.knight_progress[knight_id] = {}
        
        self.knight_progress[knight_id][quest_id] = {
            "started_at": datetime.now(timezone.utc).isoformat(),
            "progress": 0,
            "submissions": []
        }
        
        return {
            "success": True,
            "quest_id": quest_id,
            "knight_id": knight_id,
            "quest_title": quest["title"],
            "expires_at": quest["expires_at"]
        }
    
    def submit_quest_progress(
        self,
        quest_id: str,
        knight_id: str,
        submission: Dict
    ) -> Dict:
        """
        Submit progress for a quest.
        
        Args:
            quest_id: Quest ID
            knight_id: Knight identifier
            submission: Progress submission data
            
        Returns:
            Submission result
        """
        if quest_id not in self.quests:
            return {
                "success": False,
                "error": "Quest not found"
            }
        
        quest = self.quests[quest_id]
        
        # Check participation
        if knight_id not in quest["participants"]:
            return {
                "success": False,
                "error": "Not registered for this quest"
            }
        
        # Check expiry
        if datetime.now(timezone.utc) > datetime.fromisoformat(quest["expires_at"]):
            quest["status"] = QuestStatus.EXPIRED.value
            return {
                "success": False,
                "error": "Quest has expired"
            }
        
        # Record submission
        progress = self.knight_progress[knight_id][quest_id]
        progress["submissions"].append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": submission
        })
        
        # Validate submission based on quest type
        validation = self._validate_submission(quest, submission)
        
        if validation["valid"]:
            progress["progress"] += validation["progress_increment"]
            
            # Check if quest completed
            if progress["progress"] >= 100:
                return self.complete_quest(quest_id, knight_id)
        
        return {
            "success": True,
            "valid": validation["valid"],
            "progress": progress["progress"],
            "message": validation.get("message", "Progress updated")
        }
    
    def _validate_submission(self, quest: Dict, submission: Dict) -> Dict:
        """Validate a quest submission."""
        quest_type = quest["type"]
        
        if quest_type == "mining":
            # Validate mining proof
            if "hash" in submission and "nonce" in submission:
                hash_val = submission["hash"]
                leading_zeros = self._count_leading_zeros(hash_val)
                
                if leading_zeros >= quest["metadata"]["min_leading_zeros"]:
                    target = quest["metadata"]["target_hashes"]
                    increment = 100 / target
                    return {
                        "valid": True,
                        "progress_increment": increment,
                        "message": f"Valid hash with {leading_zeros} leading zeros"
                    }
        
        elif quest_type == "validation":
            # Validate proof validation
            if "validated_proofs" in submission:
                count = len(submission["validated_proofs"])
                target = quest["metadata"]["proofs_to_validate"]
                increment = (count / target) * 100
                return {
                    "valid": True,
                    "progress_increment": increment,
                    "message": f"Validated {count} proofs"
                }
        
        elif quest_type == "puzzle":
            # Validate puzzle solution
            if "solution" in submission:
                expected = quest["metadata"]["solution_pattern"]
                if submission["solution"] == expected:
                    return {
                        "valid": True,
                        "progress_increment": 100,
                        "message": "Puzzle solved!"
                    }
        
        return {
            "valid": False,
            "progress_increment": 0,
            "message": "Invalid submission"
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
    
    def complete_quest(self, quest_id: str, knight_id: str) -> Dict:
        """
        Mark a quest as completed.
        
        Args:
            quest_id: Quest ID
            knight_id: Knight identifier
            
        Returns:
            Completion result
        """
        if quest_id not in self.quests:
            return {
                "success": False,
                "error": "Quest not found"
            }
        
        quest = self.quests[quest_id]
        progress = self.knight_progress[knight_id][quest_id]
        
        progress["completed_at"] = datetime.now(timezone.utc).isoformat()
        quest["completions"] += 1
        
        return {
            "success": True,
            "quest_id": quest_id,
            "knight_id": knight_id,
            "quest_title": quest["title"],
            "reward": quest["reward"],
            "completion_time": progress["completed_at"],
            "message": f"Quest completed! Earned {quest['reward']} $EXS"
        }
    
    def get_quest(self, quest_id: str) -> Optional[Dict]:
        """Get quest details."""
        return self.quests.get(quest_id)
    
    def list_quests(
        self,
        status: Optional[str] = None,
        quest_type: Optional[str] = None
    ) -> List[Dict]:
        """
        List quests with optional filtering.
        
        Args:
            status: Filter by status
            quest_type: Filter by type
            
        Returns:
            List of quests
        """
        quests = list(self.quests.values())
        
        if status:
            quests = [q for q in quests if q["status"] == status]
        
        if quest_type:
            quests = [q for q in quests if q["type"] == quest_type]
        
        return quests
    
    def get_knight_progress(self, knight_id: str) -> Dict:
        """
        Get a knight's quest progress.
        
        Args:
            knight_id: Knight identifier
            
        Returns:
            Progress summary
        """
        if knight_id not in self.knight_progress:
            return {
                "knight_id": knight_id,
                "active_quests": 0,
                "completed_quests": 0,
                "total_rewards": 0.0
            }
        
        progress = self.knight_progress[knight_id]
        active = 0
        completed = 0
        rewards = 0.0
        
        for quest_id, quest_progress in progress.items():
            if "completed_at" in quest_progress:
                completed += 1
                quest = self.quests.get(quest_id)
                if quest:
                    rewards += quest["reward"]
            else:
                active += 1
        
        return {
            "knight_id": knight_id,
            "active_quests": active,
            "completed_quests": completed,
            "total_rewards": rewards,
            "quests": progress
        }
    
    def get_leaderboard(self, limit: int = 10) -> List[Dict]:
        """
        Get quest completion leaderboard.
        
        Args:
            limit: Number of knights to return
            
        Returns:
            Leaderboard entries
        """
        leaderboard = []
        
        for knight_id in self.knight_progress.keys():
            progress = self.get_knight_progress(knight_id)
            leaderboard.append({
                "knight_id": knight_id,
                "completed_quests": progress["completed_quests"],
                "total_rewards": progress["total_rewards"]
            })
        
        # Sort by completed quests, then rewards
        leaderboard.sort(
            key=lambda x: (x["completed_quests"], x["total_rewards"]),
            reverse=True
        )
        
        return leaderboard[:limit]


def main():
    """Demonstrate quest engine functionality."""
    print("⚔️ Excalibur Quest Engine")
    print("=" * 60)
    print()
    
    engine = QuestEngine()
    
    # Create quests
    print("📜 Creating Quests:")
    quest1 = engine.create_quest(
        title="The Sword in the Stone",
        description="Mine 40 valid hashes with 4 leading zeros",
        quest_type="mining",
        difficulty=4,
        reward=50.0
    )
    print(f"  Quest: {quest1['title']}")
    print(f"  Type: {quest1['type']}")
    print(f"  Reward: {quest1['reward']} $EXS")
    print()
    
    # Register participant
    print("🛡️ Registering Knight:")
    registration = engine.register_participant(quest1["id"], "SIR-LANCELOT")
    print(f"  Knight: {registration['knight_id']}")
    print(f"  Success: {registration['success']}")
    print()
    
    # Submit progress
    print("⚡ Submitting Progress:")
    submission = engine.submit_quest_progress(
        quest1["id"],
        "SIR-LANCELOT",
        {"hash": "00000000abcd1234", "nonce": 12345}
    )
    print(f"  Valid: {submission['valid']}")
    print(f"  Progress: {submission['progress']}%")
    print()
    
    # Get knight progress
    print("📊 Knight Progress:")
    progress = engine.get_knight_progress("SIR-LANCELOT")
    print(f"  Active Quests: {progress['active_quests']}")
    print(f"  Completed: {progress['completed_quests']}")
    print(f"  Total Rewards: {progress['total_rewards']} $EXS")
    print()
    
    print("✅ Quest engine operational")


if __name__ == "__main__":
    main()
