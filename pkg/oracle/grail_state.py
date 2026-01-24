#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Excalibur $EXS Protocol - Grail State Manager
----------------------------------------------
Manages Holy Grail energy, unlocking state, and Grail-related logic

This module handles the mystical Grail state system including:
- Grail energy accumulation
- Unlocking conditions and state
- Grail quest progression
- Sacred geometry calculations

Author: Travis D. Jones <holedozer@icloud.com>
License: BSD 3-Clause
"""

import hashlib
import time
from typing import Dict, Optional, List
from datetime import datetime, timezone
from enum import Enum


class GrailState(Enum):
    """Grail unlocking states"""
    SEALED = "sealed"
    AWAKENING = "awakening"
    RESONATING = "resonating"
    UNLOCKED = "unlocked"


class GrailEnergyManager:
    """
    Manages the Holy Grail's energy state and unlocking conditions.
    
    The Grail accumulates energy through valid forges and blockchain
    inscriptions, eventually unlocking deeper protocol wisdom.
    """
    
    # Configuration constants
    ENERGY_PER_ZERO_BYTE = 10  # Energy gained per leading zero byte in hash
    INSCRIPTION_ENERGY = 50    # Energy gained per inscription
    KNIGHT_TRIAL_ENERGY = 25   # Energy bonus for knight trial
    DRAGON_SLAIN_ENERGY = 200  # Energy bonus for slaying dragon
    
    def __init__(self):
        """Initialize the Grail Energy Manager."""
        self.state = GrailState.SEALED
        self.energy_level = 0
        self.total_forges_witnessed = 0
        self.inscriptions_detected = []
        self.quest_progress = {
            "knight_trials": 0,
            "dragon_slain": False,
            "lady_blessing": False,
            "round_table_seated": False
        }
        self.unlocking_threshold = {
            GrailState.AWAKENING: 100,
            GrailState.RESONATING: 500,
            GrailState.UNLOCKED: 1000
        }
        self.last_energy_update = datetime.now(timezone.utc)
    
    def add_forge_energy(self, nonce: int, hash_value: str) -> Dict:
        """
        Add energy from a valid forge.
        
        Args:
            nonce: The forge nonce
            hash_value: The forge hash
            
        Returns:
            Energy addition result
        """
        # Calculate energy based on hash difficulty
        leading_zeros = self._count_leading_zeros(hash_value)
        energy_gained = leading_zeros * self.ENERGY_PER_ZERO_BYTE
        
        self.energy_level += energy_gained
        self.total_forges_witnessed += 1
        self.last_energy_update = datetime.now(timezone.utc)
        
        # Update state based on energy level
        self._update_grail_state()
        
        return {
            "energy_gained": energy_gained,
            "total_energy": self.energy_level,
            "forge_number": self.total_forges_witnessed,
            "grail_state": self.state.value,
            "message": self._get_energy_message(energy_gained)
        }
    
    def add_inscription_energy(self, inscription_id: str, block_height: int) -> Dict:
        """
        Add energy from a blockchain inscription.
        
        Args:
            inscription_id: The inscription transaction ID
            block_height: Block height where inscription was found
            
        Returns:
            Energy addition result
        """
        # Check if already processed
        if inscription_id in [i["id"] for i in self.inscriptions_detected]:
            return {
                "status": "duplicate",
                "message": "Inscription already processed"
            }
        
        # Add inscription energy
        inscription_energy = self.INSCRIPTION_ENERGY
        self.energy_level += inscription_energy
        self.inscriptions_detected.append({
            "id": inscription_id,
            "block_height": block_height,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        self._update_grail_state()
        
        return {
            "energy_gained": inscription_energy,
            "total_energy": self.energy_level,
            "inscription_count": len(self.inscriptions_detected),
            "grail_state": self.state.value,
            "message": "The Grail glows brighter with the inscription's power"
        }
    
    def _count_leading_zeros(self, hash_value: str) -> int:
        """Count leading zero bytes in hash."""
        leading_zeros = 0
        for i in range(0, len(hash_value), 2):
            if hash_value[i:i+2] == '00':
                leading_zeros += 1
            else:
                break
        return leading_zeros
    
    def _update_grail_state(self):
        """Update Grail state based on energy level."""
        if self.energy_level >= self.unlocking_threshold[GrailState.UNLOCKED]:
            self.state = GrailState.UNLOCKED
            self.quest_progress["round_table_seated"] = True
        elif self.energy_level >= self.unlocking_threshold[GrailState.RESONATING]:
            self.state = GrailState.RESONATING
            self.quest_progress["lady_blessing"] = True
        elif self.energy_level >= self.unlocking_threshold[GrailState.AWAKENING]:
            self.state = GrailState.AWAKENING
    
    def _get_energy_message(self, energy_gained: int) -> str:
        """Get message based on energy gained."""
        if energy_gained >= 40:
            return "The Grail blazes with unprecedented power!"
        elif energy_gained >= 30:
            return "The Grail resonates with great energy!"
        elif energy_gained >= 20:
            return "The Grail glows warmly."
        else:
            return "The Grail accepts your offering."
    
    def advance_quest(self, quest_type: str) -> Dict:
        """
        Advance a specific quest progression.
        
        Args:
            quest_type: Type of quest to advance
            
        Returns:
            Quest advancement result
        """
        if quest_type == "knight_trial":
            self.quest_progress["knight_trials"] += 1
            energy_bonus = self.KNIGHT_TRIAL_ENERGY
            self.energy_level += energy_bonus
            
            return {
                "quest": quest_type,
                "trials_completed": self.quest_progress["knight_trials"],
                "energy_bonus": energy_bonus,
                "message": f"Knight's trial {self.quest_progress['knight_trials']} completed!"
            }
        
        elif quest_type == "dragon_slain":
            if not self.quest_progress["dragon_slain"]:
                self.quest_progress["dragon_slain"] = True
                energy_bonus = self.DRAGON_SLAIN_ENERGY
                self.energy_level += energy_bonus
                
                return {
                    "quest": quest_type,
                    "completed": True,
                    "energy_bonus": energy_bonus,
                    "message": "The dragon falls! The Grail's power surges!"
                }
            else:
                return {
                    "quest": quest_type,
                    "completed": True,
                    "message": "The dragon has already been slain."
                }
        
        return {"error": f"Unknown quest type: {quest_type}"}
    
    def get_grail_state(self) -> Dict:
        """
        Get current Grail state information.
        
        Returns:
            Complete Grail state dictionary
        """
        next_threshold = None
        energy_to_next = None
        
        if self.state != GrailState.UNLOCKED:
            for state, threshold in self.unlocking_threshold.items():
                if self.energy_level < threshold:
                    next_threshold = state.value
                    energy_to_next = threshold - self.energy_level
                    break
        
        return {
            "state": self.state.value,
            "energy_level": self.energy_level,
            "forges_witnessed": self.total_forges_witnessed,
            "inscriptions_detected": len(self.inscriptions_detected),
            "quest_progress": self.quest_progress,
            "next_threshold": next_threshold,
            "energy_to_next": energy_to_next,
            "last_update": self.last_energy_update.isoformat(),
            "prophecy": self._get_state_prophecy()
        }
    
    def _get_state_prophecy(self) -> str:
        """Get prophecy based on current state."""
        prophecies = {
            GrailState.SEALED: "The Grail sleeps, awaiting the worthy.",
            GrailState.AWAKENING: "The Grail stirs, sensing the approach of destiny.",
            GrailState.RESONATING: "The Grail sings with power, nearly ready to reveal its secrets.",
            GrailState.UNLOCKED: "The Grail is unlocked! Its infinite wisdom flows freely."
        }
        return prophecies[self.state]
    
    def calculate_sacred_geometry(self) -> Dict:
        """
        Calculate sacred geometric patterns based on Grail state.
        
        Returns:
            Sacred geometry calculations
        """
        # Golden ratio (φ)
        phi = (1 + 5 ** 0.5) / 2
        
        # Calculate resonance frequency
        base_frequency = 432  # Hz, sacred frequency
        resonance = base_frequency * (self.energy_level / 1000) * phi
        
        # Calculate prime factorization influence
        energy_str = str(self.energy_level)
        energy_hash = hashlib.sha256(energy_str.encode()).hexdigest()
        geometry_signature = int(energy_hash[:8], 16) % 360  # Angle in degrees
        
        return {
            "golden_ratio": phi,
            "resonance_frequency": round(resonance, 2),
            "geometry_signature": geometry_signature,
            "energy_phase": (self.energy_level % 360),
            "harmonic_index": round(self.energy_level / phi, 2)
        }
    
    def check_unlocking_conditions(self) -> Dict:
        """
        Check if Grail unlocking conditions are met.
        
        Returns:
            Conditions check result
        """
        conditions = {
            "energy_sufficient": self.energy_level >= self.unlocking_threshold[GrailState.UNLOCKED],
            "knight_trials_passed": self.quest_progress["knight_trials"] >= 3,
            "dragon_defeated": self.quest_progress["dragon_slain"],
            "lady_blessed": self.quest_progress["lady_blessing"]
        }
        
        all_met = all(conditions.values())
        
        return {
            "conditions": conditions,
            "all_conditions_met": all_met,
            "can_unlock": all_met,
            "message": "All conditions met! The Grail awaits unlocking." if all_met 
                      else "More trials must be completed."
        }


def main():
    """Demonstrate Grail State Manager functionality."""
    print("🏆 Excalibur $EXS Grail State Manager")
    print("=" * 60)
    print()
    
    # Initialize manager
    grail = GrailEnergyManager()
    
    # Display initial state
    print("📊 Initial Grail State:")
    state = grail.get_grail_state()
    print(f"  State: {state['state']}")
    print(f"  Energy: {state['energy_level']}")
    print(f"  Prophecy: {state['prophecy']}")
    print()
    
    # Simulate forge energy
    print("⚒️  Adding Forge Energy:")
    result = grail.add_forge_energy(12345, "00000000abcd1234")
    print(f"  Energy Gained: {result['energy_gained']}")
    print(f"  Total Energy: {result['total_energy']}")
    print(f"  Message: {result['message']}")
    print()
    
    # Add inscription energy
    print("📜 Adding Inscription Energy:")
    result = grail.add_inscription_energy("tx123abc", 840001)
    print(f"  Energy Gained: {result['energy_gained']}")
    print(f"  Message: {result['message']}")
    print()
    
    # Advance quest
    print("🗡️  Advancing Knight's Trial:")
    result = grail.advance_quest("knight_trial")
    print(f"  Trials Completed: {result['trials_completed']}")
    print(f"  Energy Bonus: {result['energy_bonus']}")
    print()
    
    # Sacred geometry
    print("📐 Sacred Geometry:")
    geometry = grail.calculate_sacred_geometry()
    print(f"  Golden Ratio: {geometry['golden_ratio']}")
    print(f"  Resonance: {geometry['resonance_frequency']} Hz")
    print(f"  Geometry Signature: {geometry['geometry_signature']}°")
    print()
    
    # Check conditions
    print("✅ Unlocking Conditions:")
    check = grail.check_unlocking_conditions()
    print(f"  Can Unlock: {check['can_unlock']}")
    print(f"  Message: {check['message']}")
    print()
    
    print("✨ Grail State Manager operational.")


if __name__ == "__main__":
    main()
