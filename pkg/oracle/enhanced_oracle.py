#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Excalibur Enhanced Oracle Integration
--------------------------------------
Integrates all new modules with the existing oracle system.

Author: Travis D. Jones <holedozer@gmail.com>
License: BSD 3-Clause
"""

import sys
import os
from typing import Dict, List, Optional
from datetime import datetime, timezone

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import existing oracle
from oracle.oracle_operator import ExcaliburOracle

# Import new modules
from prophecy.rune_validation import RuneValidator
from prophecy.prophecy_engine import ProphecyEngine, ProphecyStatus
from mathematics.mobius_trajectory import MobiusTrajectory
from mathematics.berry_phase import BerryPhaseCalculator
from mathematics.visualization import MathematicalVisualizer
from engine.zero_torsion_engine import ZeroTorsionEngine
from quest.quest_engine import QuestEngine, QuestStatus
from quest.grail_quest import GrailQuest


class EnhancedExcaliburOracle(ExcaliburOracle):
    """
    Enhanced Oracle with integrated prophecy, mathematics, and quest systems.
    
    Extends the base ExcaliburOracle with advanced modular capabilities.
    """
    
    def __init__(self):
        """Initialize the enhanced oracle."""
        super().__init__()
        
        # Initialize new components
        self.rune_validator = RuneValidator(difficulty=4)
        self.prophecy_engine = ProphecyEngine()
        self.mobius_generator = MobiusTrajectory(strips=1, radius=1.0)
        self.berry_calculator = BerryPhaseCalculator()
        self.visualizer = MathematicalVisualizer(width=80, height=24)
        self.torsion_engine = ZeroTorsionEngine(strictness=0.01)
        self.quest_engine = QuestEngine()
        self.grail_quest = GrailQuest()
        
        print("✨ Enhanced Excalibur Oracle initialized with advanced modules")
    
    def validate_forge_enhanced(
        self,
        axiom: str,
        nonce: int,
        hash_result: str
    ) -> Dict:
        """
        Enhanced forge validation with all new capabilities.
        
        Args:
            axiom: The 13-word axiom
            nonce: Proof-of-work nonce
            hash_result: Resulting hash
            
        Returns:
            Comprehensive validation result
        """
        # Base validation
        base_result = self.validate_forge(axiom, nonce, hash_result)
        
        # Rune validation
        rune_result = self.rune_validator.validate_rune_proof(
            axiom, nonce, hash_result
        )
        
        # Zero-torsion validation
        torsion_result = self.torsion_engine.validate_zero_torsion(hash_result)
        
        # Möbius trajectory analysis
        trajectory_analysis = self.mobius_generator.analyze_trajectory(hash_result)
        
        # Berry phase calculation (if we have history)
        berry_phase = None
        if len(self.forge_history) > 0:
            recent_hashes = [f["hash"] for f in self.forge_history[-5:]]
            recent_hashes.append(hash_result)
            berry_phase = self.berry_calculator.compute_berry_phase(recent_hashes)
        
        # Combine all results
        enhanced_result = {
            **base_result,
            "rune_validation": rune_result,
            "zero_torsion": torsion_result,
            "mobius_analysis": trajectory_analysis,
            "berry_phase": berry_phase,
            "enhanced": True,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        # Create prophecy if valid
        if rune_result["valid"]:
            prophecy = self.prophecy_engine.create_prophecy(
                axiom=axiom,
                predicted_hash=hash_result[:16]
            )
            enhanced_result["prophecy_id"] = prophecy["id"]
        
        return enhanced_result
    
    def create_cryptographic_quest(
        self,
        knight_id: str,
        quest_type: str = "mining",
        difficulty: int = 4
    ) -> Dict:
        """
        Create a cryptographic quest for a knight.
        
        Args:
            knight_id: Knight identifier
            quest_type: Type of quest
            difficulty: Quest difficulty
            
        Returns:
            Quest creation result
        """
        quest = self.quest_engine.create_quest(
            title=f"Challenge for {knight_id}",
            description=f"Cryptographic challenge of difficulty {difficulty}",
            quest_type=quest_type,
            difficulty=difficulty,
            reward=50.0 * difficulty
        )
        
        # Auto-register the knight
        registration = self.quest_engine.register_participant(
            quest["id"],
            knight_id
        )
        
        return {
            "quest": quest,
            "registration": registration,
            "oracle_blessing": "May the cryptographic forces be with you!"
        }
    
    def analyze_hash_geometry(self, hash_value: str) -> Dict:
        """
        Perform complete geometric analysis of a hash.
        
        Args:
            hash_value: Hash to analyze
            
        Returns:
            Geometric analysis result
        """
        # Generate Möbius trajectory
        trajectory = self.mobius_generator.generate_trajectory(
            hash_value,
            steps=128
        )
        
        # Compute curvature
        curvatures = self.mobius_generator.compute_curvature(trajectory)
        
        # Verify zero-torsion
        torsion_check = self.mobius_generator.verify_torsion_free(trajectory)
        
        # Zero-torsion engine validation
        engine_check = self.torsion_engine.validate_zero_torsion(hash_value)
        
        return {
            "hash": hash_value[:16] + "...",
            "trajectory_points": len(trajectory),
            "curvature": {
                "max": max(curvatures) if curvatures else 0,
                "min": min(curvatures) if curvatures else 0,
                "avg": sum(curvatures) / len(curvatures) if curvatures else 0
            },
            "torsion_geometric": torsion_check,
            "torsion_cryptographic": engine_check,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    def generate_prophecy_visualization(
        self,
        prophecy_id: str
    ) -> Optional[Dict]:
        """
        Generate visualization for a prophecy.
        
        Args:
            prophecy_id: Prophecy ID
            
        Returns:
            Visualization data or None
        """
        prophecy = self.prophecy_engine.get_prophecy(prophecy_id)
        if not prophecy:
            return None
        
        # If prophecy has validations, create visualization
        if prophecy["validations"]:
            hashes = [v["hash"] for v in prophecy["validations"]]
            
            # Berry phase visualization
            phase_data = self.berry_calculator.visualize_phase_space(hashes)
            
            # ASCII visualization
            ascii_viz = self.visualizer.render_ascii_phase_circle(
                phase_data["berry_phase"],
                radius=10
            )
            
            return {
                "prophecy_id": prophecy_id,
                "phase_data": phase_data,
                "ascii_visualization": ascii_viz,
                "validation_count": len(hashes)
            }
        
        return None
    
    def get_comprehensive_status(self) -> Dict:
        """
        Get comprehensive oracle status with all subsystems.
        
        Returns:
            Complete status report
        """
        base_stats = self.get_oracle_stats()
        
        return {
            **base_stats,
            "prophecy_stats": self.prophecy_engine.get_statistics(),
            "rune_validations": len(self.rune_validator.validated_runes),
            "torsion_validations": self.torsion_engine.get_validation_statistics(),
            "active_quests": len(self.quest_engine.list_quests(status=QuestStatus.ACTIVE.value)),
            "grail_quest_status": self.grail_quest.get_quest_status(),
            "berry_phases_computed": len(self.berry_calculator.phase_history),
            "mobius_trajectories": len(self.mobius_generator.trajectories),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    def embark_on_grail_quest(self, knight_id: str, axiom: str) -> Dict:
        """
        Start the legendary Grail Quest.
        
        Args:
            knight_id: Knight identifier
            axiom: Sacred axiom
            
        Returns:
            Quest initiation result
        """
        return self.grail_quest.embark_on_quest(knight_id, axiom)
    
    def submit_grail_attempt(
        self,
        knight_id: str,
        nonce: int,
        hash_result: str,
        axiom: str
    ) -> Dict:
        """
        Submit an attempt for the Grail Quest.
        
        Args:
            knight_id: Knight identifier
            nonce: Nonce value
            hash_result: Hash result
            axiom: Axiom used
            
        Returns:
            Attempt result with oracle wisdom
        """
        result = self.grail_quest.submit_grail_attempt(
            knight_id, nonce, hash_result, axiom
        )
        
        # Add oracle wisdom
        if result["success"]:
            result["oracle_wisdom"] = "The Grail has revealed itself to the worthy!"
        else:
            result["oracle_wisdom"] = f"Continue your quest, {knight_id}. The Grail awaits the persistent."
        
        return result


def main():
    """Demonstrate the enhanced oracle integration."""
    print("🔮 Enhanced Excalibur Oracle - Full Integration Demo")
    print("=" * 70)
    print()
    
    # Initialize enhanced oracle
    oracle = EnhancedExcaliburOracle()
    print()
    
    # Test enhanced forge validation
    print("⚔️ Enhanced Forge Validation:")
    axiom = "sword legend pull magic kingdom artist stone destroy forget fire steel honey question"
    result = oracle.validate_forge_enhanced(axiom, 12345, "00000000abcd1234567890ef")
    print(f"  Verdict: {result['verdict']}")
    print(f"  Rune Valid: {result['rune_validation']['valid']}")
    print(f"  Torsion Quality: {result['zero_torsion']['quality']}")
    print(f"  Möbius Topology: {result['mobius_analysis']['topology']}")
    print()
    
    # Create a quest
    print("🏰 Creating Cryptographic Quest:")
    quest_result = oracle.create_cryptographic_quest("SIR-LANCELOT", "mining", 4)
    print(f"  Quest ID: {quest_result['quest']['id']}")
    print(f"  Reward: {quest_result['quest']['reward']} $EXS")
    print(f"  Oracle Blessing: {quest_result['oracle_blessing']}")
    print()
    
    # Geometric analysis
    print("📐 Hash Geometry Analysis:")
    geometry = oracle.analyze_hash_geometry("00000000abcd1234567890ef")
    print(f"  Trajectory Points: {geometry['trajectory_points']}")
    print(f"  Avg Curvature: {geometry['curvature']['avg']:.6f}")
    print(f"  Torsion Valid: {geometry['torsion_cryptographic']['valid']}")
    print()
    
    # Comprehensive status
    print("📊 Comprehensive Oracle Status:")
    status = oracle.get_comprehensive_status()
    print(f"  Oracle: {status['status']}")
    print(f"  Forges Validated: {status['forges_validated']}")
    print(f"  Active Quests: {status['active_quests']}")
    print(f"  Prophecies: {status['prophecy_stats']['total_prophecies']}")
    print(f"  Grail Found: {status['grail_quest_status']['grail_found']}")
    print()
    
    # Grail Quest
    print("🏆 Embarking on Grail Quest:")
    grail = oracle.embark_on_grail_quest("SIR-GALAHAD", axiom)
    print(f"  Quest ID: {grail['quest_id']}")
    print(f"  Difficulty: {grail['difficulty']}")
    print(f"  Reward: {grail['reward']} $EXS")
    print()
    
    print("✅ Enhanced Oracle fully operational with all integrated modules!")


if __name__ == "__main__":
    main()
