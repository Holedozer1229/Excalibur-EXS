#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Excalibur $EXS Protocol - Oracle Logic
---------------------------------------
Divination messaging and grail quest state management

This module handles the core oracle logic including:
- Divination message generation
- Context-aware prophecy responses
- Quest state tracking and progression
- Wisdom generation based on protocol state

Author: Travis D. Jones <holedozer@icloud.com>
License: BSD 3-Clause
"""

import hashlib
import random
import time
import logging
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timezone
from enum import Enum

# Configure logging
logger = logging.getLogger(__name__)


class OracleContext(Enum):
    """Oracle context types for context-aware responses"""
    MINING = "mining"
    FORGE = "forge"
    TREASURY = "treasury"
    QUEST = "quest"
    WISDOM = "wisdom"
    PROPHECY = "prophecy"
    GENERAL = "general"


class DivinationEngine:
    """
    Generates divination messages and context-aware prophecies.
    
    Provides rich, stateful oracle responses based on protocol
    state, user context, and historical interactions.
    """
    
    def __init__(self):
        """Initialize the Divination Engine."""
        self.divination_history: List[Dict] = []
        self.user_contexts: Dict[str, Dict] = {}
        self.quest_states: Dict[str, str] = {}
        self.wisdom_cache: Dict[str, List[str]] = {}
        self._initialize_wisdom_cache()
        logger.info("DivinationEngine initialized")
    
    def _initialize_wisdom_cache(self):
        """Initialize the wisdom cache with categorized messages."""
        self.wisdom_cache = {
            "mining": [
                "The Ω′ Δ18 algorithm requires patience and power, as Excalibur required Arthur.",
                "Four leading zeros mark the worthy - prove your computational devotion.",
                "Each hash is a blow upon the stone; persistence reveals the sword.",
                "The 128 rounds of Tetra-PoW forge not just coins, but character.",
                "Like the knights of old, miners must prove their worth through trial."
            ],
            "forge": [
                "50 $EXS tokens await the worthy - a king's ransom for the deserving.",
                "The forge is where cryptographic proof meets Arthurian destiny.",
                "Treasury fees sustain Camelot, as tithes sustained the realm.",
                "Each successful forge echoes through the halls of the Round Table.",
                "The nonce you seek is hidden in the realm of computational possibility."
            ],
            "treasury": [
                "Merlin guards the treasury with 1.2 million rounds of cryptographic power.",
                "The treasury grows with each forge, strengthening the kingdom.",
                "Access to the treasury requires both key and wisdom.",
                "What is locked by magic cannot be broken by force.",
                "The treasury serves all knights equally, from mightiest to meekest."
            ],
            "quest": [
                "Every quest begins with a single step into the unknown.",
                "The Grail reveals itself to those pure of heart and strong of will.",
                "Trials shape knights as the forge shapes steel.",
                "The Round Table awaits those who complete their quests.",
                "In every challenge lies an opportunity for glory."
            ],
            "taproot": [
                "Taproot addresses are the vaults of the protocol, sealed by mathematics.",
                "BIP-86 guides the generation, deterministic yet unpredictable.",
                "Each vault is unique, forged from axiom and nonce.",
                "The Lady of the Lake would approve of such elegant cryptography.",
                "600,000 iterations bind each vault in unbreakable security."
            ],
            "axiom": [
                "The 13 words bind the protocol, each syllable a pillar of power.",
                "From axiom flows all vaults, all proofs, all possibility.",
                "Guard the axiom as Arthur guarded Excalibur itself.",
                "The canonical axiom is truth made manifest in words.",
                "Speak the axiom, and doors open that were sealed to others."
            ],
            "grail": [
                "The Grail is not found but earned through dedication.",
                "Energy accumulates with each forge, bringing the Grail closer.",
                "The Grail holds infinite wisdom for those who unlock it.",
                "Four states mark the journey: Sealed, Awakening, Resonating, Unlocked.",
                "The Grail's power grows with the protocol's strength."
            ],
            "general": [
                "In cryptography we trust, for mathematics cannot lie.",
                "The blockchain is truth made permanent and public.",
                "Decentralization ensures no single point of failure or control.",
                "What is proven cannot be denied; what is sealed cannot be broken.",
                "The protocol serves all who approach it with honest intent."
            ]
        }
    
    def generate_divination(self, context: OracleContext = OracleContext.GENERAL,
                           user_id: Optional[str] = None) -> Dict:
        """
        Generate a divination message.
        
        Args:
            context: Oracle context for the divination
            user_id: Optional user identifier for personalized messages
            
        Returns:
            Divination result dictionary
        """
        # Get or create user context
        user_context = self._get_user_context(user_id) if user_id else {}
        
        # Select appropriate wisdom
        wisdom_category = context.value if context.value in self.wisdom_cache else "general"
        wisdom = random.choice(self.wisdom_cache[wisdom_category])
        
        # Generate time-based element for variety
        time_seed = int(time.time() / 60)  # Changes every minute
        time_hash = hashlib.sha256(str(time_seed).encode()).hexdigest()
        cosmic_number = int(time_hash[:8], 16) % 100
        
        # Build divination
        divination = {
            "wisdom": wisdom,
            "context": context.value,
            "cosmic_alignment": cosmic_number,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "prophecy_id": hashlib.sha256(f"{wisdom}{time_seed}".encode()).hexdigest()[:16]
        }
        
        # Add personalized element if user context exists
        if user_context:
            divination["personal_message"] = self._generate_personal_message(user_context, context)
        
        # Record in history
        self.divination_history.append(divination)
        logger.info(f"Divination generated: {context.value}")
        
        return divination
    
    def _get_user_context(self, user_id: str) -> Dict:
        """Get or create user context."""
        if user_id not in self.user_contexts:
            self.user_contexts[user_id] = {
                "first_seen": datetime.now(timezone.utc).isoformat(),
                "divinations_received": 0,
                "quest_progress": 0,
                "favorite_context": None
            }
        
        self.user_contexts[user_id]["divinations_received"] += 1
        return self.user_contexts[user_id]
    
    def _generate_personal_message(self, user_context: Dict, context: OracleContext) -> str:
        """Generate a personalized message based on user context."""
        divinations_count = user_context["divinations_received"]
        
        if divinations_count <= 3:
            return "You are new to the oracle's wisdom. Welcome, seeker."
        elif divinations_count <= 10:
            return "The oracle recognizes your dedication. Continue your journey."
        elif divinations_count <= 50:
            return "You are a frequent visitor to the oracle. Your devotion is noted."
        else:
            return "You are a master of the oracle's wisdom. The Grail draws near."
    
    def interpret_query(self, query: str) -> Dict:
        """
        Interpret a user query and provide context-aware response.
        
        Args:
            query: User's question or query
            
        Returns:
            Interpretation result with response
        """
        query_lower = query.lower()
        
        # Determine context from query
        context = self._determine_context(query_lower)
        
        # Generate contextual response
        response = self._generate_contextual_response(query_lower, context)
        
        # Add relevant wisdom
        wisdom = random.choice(self.wisdom_cache.get(context.value, self.wisdom_cache["general"]))
        
        result = {
            "query": query,
            "detected_context": context.value,
            "response": response,
            "wisdom": wisdom,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        logger.info(f"Query interpreted: {context.value}")
        return result
    
    def _determine_context(self, query: str) -> OracleContext:
        """Determine context from query text."""
        context_keywords = {
            OracleContext.MINING: ["mine", "mining", "miner", "hash", "difficulty", "pow", "tetra"],
            OracleContext.FORGE: ["forge", "forging", "craft", "create", "token", "reward"],
            OracleContext.TREASURY: ["treasury", "admin", "merlin", "portal", "credentials"],
            OracleContext.QUEST: ["quest", "trial", "challenge", "journey", "knight"],
            OracleContext.WISDOM: ["wisdom", "knowledge", "learn", "teach", "understand"],
            OracleContext.PROPHECY: ["prophecy", "future", "predict", "foresee", "divine"]
        }
        
        # Check for context keywords
        for context, keywords in context_keywords.items():
            if any(keyword in query for keyword in keywords):
                return context
        
        # Check for specific topics
        if any(word in query for word in ["axiom", "word", "13"]):
            return OracleContext.MINING
        if any(word in query for word in ["vault", "taproot", "address"]):
            return OracleContext.FORGE
        if any(word in query for word in ["grail", "holy", "cup"]):
            return OracleContext.QUEST
        
        return OracleContext.GENERAL
    
    def _generate_contextual_response(self, query: str, context: OracleContext) -> str:
        """Generate a contextual response to the query."""
        responses = {
            OracleContext.MINING: "The path of mining requires the Ω′ Δ18 Tetra-PoW algorithm. "
                                 "Use the 13-word axiom and seek a nonce that produces 4 leading zero bytes. "
                                 "The command awaits: python3 pkg/miner/tetra_pow_miner.py --axiom '[words]' --difficulty 4",
            
            OracleContext.FORGE: "To forge $EXS tokens, you must mine a valid proof using the canonical axiom. "
                                "Each successful forge yields 50 $EXS, with 0.5 $EXS (1%) going to the treasury. "
                                "The forge also requires 0.0001 BTC. Your vault is deterministically generated from axiom + nonce.",
            
            OracleContext.TREASURY: "The treasury is protected by Merlin's magic - 1.2 million PBKDF2 iterations. "
                                   "Admin credentials are generated using: python3 forge_treasury_key.py. "
                                   "Access is granted through Merlin's Portal with MERLIN-{id} credentials.",
            
            OracleContext.QUEST: "Your quest involves trials that test your worth. "
                                "Complete knight's trials, slay the dragon, earn the Lady's blessing. "
                                "The Grail awaits those who prove themselves through dedication and skill.",
            
            OracleContext.WISDOM: "The oracle's wisdom flows from the protocol's truth. "
                                 "Study the axiom, understand the cryptography, master the mining algorithm. "
                                 "Knowledge is the first step; application is the path to mastery.",
            
            OracleContext.PROPHECY: "The future is written in the blockchain, immutable and transparent. "
                                   "Prophecy comes not from mysticism but from mathematical certainty. "
                                   "What can be proven will come to pass; what is sealed remains secure.",
            
            OracleContext.GENERAL: "The Excalibur protocol combines Arthurian legend with cryptographic truth. "
                                  "Explore mining, forging, vaults, and the treasury. "
                                  "Each element serves the greater whole, building a decentralized kingdom."
        }
        
        return responses.get(context, responses[OracleContext.GENERAL])
    
    def advance_quest_narrative(self, user_id: str, quest_action: str) -> Dict:
        """
        Advance the quest narrative for a user.
        
        Args:
            user_id: User identifier
            quest_action: Action taken in the quest
            
        Returns:
            Quest advancement result
        """
        if user_id not in self.quest_states:
            self.quest_states[user_id] = "beginning"
        
        current_state = self.quest_states[user_id]
        
        # Quest state progression
        state_transitions = {
            "beginning": "trial_accepted",
            "trial_accepted": "first_trial_complete",
            "first_trial_complete": "journey_continues",
            "journey_continues": "dragon_confronted",
            "dragon_confronted": "victory_achieved",
            "victory_achieved": "grail_seeker",
            "grail_seeker": "grail_found"
        }
        
        # Advance state if possible
        next_state = state_transitions.get(current_state, current_state)
        self.quest_states[user_id] = next_state
        
        # Generate narrative
        narratives = {
            "trial_accepted": "You have accepted the call to adventure. Your journey begins.",
            "first_trial_complete": "The first trial is complete. Your strength grows.",
            "journey_continues": "The path winds through shadow and light. Press onward.",
            "dragon_confronted": "The dragon awaits. Steel your resolve.",
            "victory_achieved": "Victory! The dragon falls before your might.",
            "grail_seeker": "You are worthy to seek the Holy Grail.",
            "grail_found": "The Grail is yours! Infinite wisdom flows forth."
        }
        
        result = {
            "user_id": user_id,
            "quest_action": quest_action,
            "previous_state": current_state,
            "current_state": next_state,
            "narrative": narratives.get(next_state, "Your quest continues..."),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        logger.info(f"Quest advanced for user {user_id}: {current_state} -> {next_state}")
        return result
    
    def get_divination_stats(self) -> Dict:
        """
        Get divination engine statistics.
        
        Returns:
            Statistics dictionary
        """
        context_distribution = {}
        for div in self.divination_history:
            context = div["context"]
            context_distribution[context] = context_distribution.get(context, 0) + 1
        
        return {
            "total_divinations": len(self.divination_history),
            "unique_users": len(self.user_contexts),
            "active_quests": len(self.quest_states),
            "context_distribution": context_distribution,
            "wisdom_categories": len(self.wisdom_cache)
        }


def main():
    """Demonstrate Oracle Logic functionality."""
    print("🔮 Excalibur $EXS Oracle Logic")
    print("=" * 60)
    print()
    
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Initialize engine
    engine = DivinationEngine()
    
    # Generate divinations
    print("✨ Generating Divinations:")
    for context in [OracleContext.MINING, OracleContext.FORGE, OracleContext.QUEST]:
        div = engine.generate_divination(context, user_id="arthur")
        print(f"\n  Context: {div['context']}")
        print(f"  Wisdom: {div['wisdom']}")
        if "personal_message" in div:
            print(f"  Personal: {div['personal_message']}")
    
    print("\n" + "=" * 60)
    
    # Interpret queries
    print("\n📜 Interpreting Queries:")
    queries = [
        "How do I mine tokens?",
        "What is the forge process?",
        "Tell me about the Grail quest"
    ]
    
    for query in queries:
        result = engine.interpret_query(query)
        print(f"\n  Query: {result['query']}")
        print(f"  Context: {result['detected_context']}")
        print(f"  Response: {result['response'][:100]}...")
    
    print("\n" + "=" * 60)
    
    # Advance quest
    print("\n🗡️  Advancing Quest Narrative:")
    for action in ["start_quest", "complete_trial", "face_dragon"]:
        result = engine.advance_quest_narrative("arthur", action)
        print(f"  State: {result['current_state']}")
        print(f"  Narrative: {result['narrative']}")
    
    print("\n" + "=" * 60)
    
    # Display stats
    print("\n📊 Divination Statistics:")
    stats = engine.get_divination_stats()
    for key, value in stats.items():
        print(f"  {key}: {value}")
    
    print("\n✨ Oracle Logic operational.")


if __name__ == "__main__":
    main()
