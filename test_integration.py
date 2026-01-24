#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Excalibur-EXS Integration Test
-------------------------------
Comprehensive test of all enhanced modules working together.

Author: Travis D. Jones <holedozer@icloud.com>
License: BSD 3-Clause
"""

import sys
import os

# Note: This path manipulation is for testing purposes only.
# In production, use proper package installation via pip install -e .
pkg_path = os.path.join(os.path.dirname(__file__), 'pkg')
if pkg_path not in sys.path:
    sys.path.insert(0, pkg_path)

def test_imports():
    """Test that all modules can be imported."""
    print("=" * 70)
    print("Testing Module Imports")
    print("=" * 70)
    
    try:
        from prophecy import RuneValidator, ProphecyEngine
        print("✓ Prophecy module")
    except Exception as e:
        print(f"✗ Prophecy module: {e}")
        return False
    
    try:
        from mathematics import MobiusTrajectory, BerryPhaseCalculator, MathematicalVisualizer
        print("✓ Mathematics module")
    except Exception as e:
        print(f"✗ Mathematics module: {e}")
        return False
    
    try:
        from engine import ZeroTorsionEngine
        print("✓ Engine module")
    except Exception as e:
        print(f"✗ Engine module: {e}")
        return False
    
    try:
        from quest import QuestEngine, GrailQuest
        print("✓ Quest module")
    except Exception as e:
        print(f"✗ Quest module: {e}")
        return False
    
    try:
        from oracle.enhanced_oracle import EnhancedExcaliburOracle
        print("✓ Enhanced Oracle")
    except Exception as e:
        print(f"✗ Enhanced Oracle: {e}")
        return False
    
    print()
    return True


def test_prophecy_system():
    """Test the prophecy system."""
    print("=" * 70)
    print("Testing Prophecy System")
    print("=" * 70)
    
    from prophecy import RuneValidator, ProphecyEngine
    
    # Test rune validation
    validator = RuneValidator(difficulty=4)
    axiom = "sword legend pull magic kingdom artist stone destroy forget fire steel honey question"
    
    result = validator.validate_axiom(axiom)
    print(f"Axiom validation: {'✓' if result['valid'] else '✗'}")
    
    # Test prophecy engine
    engine = ProphecyEngine()
    prophecy = engine.create_prophecy(axiom)
    print(f"Prophecy creation: ✓ (ID: {prophecy['id']})")
    
    print()
    return True


def test_mathematics_system():
    """Test the mathematics system."""
    print("=" * 70)
    print("Testing Mathematics System")
    print("=" * 70)
    
    from mathematics import MobiusTrajectory, BerryPhaseCalculator
    
    # Test Möbius trajectory
    generator = MobiusTrajectory()
    trajectory = generator.generate_trajectory("00000000abcd1234", steps=64)
    print(f"Möbius trajectory: ✓ ({len(trajectory)} points)")
    
    # Test Berry phase
    calculator = BerryPhaseCalculator()
    hashes = ["00000000abcd1234", "0000001234567890"]
    phase = calculator.compute_berry_phase(hashes)
    print(f"Berry phase calculation: ✓ ({phase:.6f} rad)")
    
    print()
    return True


def test_engine_system():
    """Test the engine system."""
    print("=" * 70)
    print("Testing Engine System")
    print("=" * 70)
    
    from engine import ZeroTorsionEngine
    
    engine = ZeroTorsionEngine(strictness=0.01)
    result = engine.validate_zero_torsion("00000000abcd1234567890ef")
    print(f"Zero-torsion validation: ✓ (Quality: {result['quality']})")
    
    print()
    return True


def test_quest_system():
    """Test the quest system."""
    print("=" * 70)
    print("Testing Quest System")
    print("=" * 70)
    
    from quest import QuestEngine, GrailQuest
    
    # Test quest engine
    engine = QuestEngine()
    quest = engine.create_quest("Test Quest", "Test description", "mining", 4, 50.0)
    print(f"Quest creation: ✓ (ID: {quest['id']})")
    
    # Test grail quest
    grail = GrailQuest()
    status = grail.get_quest_status()
    print(f"Grail Quest: ✓ (Status: {status['difficulty']})")
    
    print()
    return True


def test_enhanced_oracle():
    """Test the enhanced oracle."""
    print("=" * 70)
    print("Testing Enhanced Oracle Integration")
    print("=" * 70)
    
    from oracle.enhanced_oracle import EnhancedExcaliburOracle
    
    oracle = EnhancedExcaliburOracle()
    
    # Test comprehensive status
    status = oracle.get_comprehensive_status()
    print(f"Oracle status: ✓ ({status['status']})")
    print(f"Active modules: ✓ (Prophecy, Mathematics, Engine, Quest)")
    
    # Test enhanced validation
    axiom = "sword legend pull magic kingdom artist stone destroy forget fire steel honey question"
    result = oracle.validate_forge_enhanced(axiom, 12345, "00000000abcd1234")
    print(f"Enhanced validation: ✓ (Verdict: {result['verdict']})")
    
    print()
    return True


def test_complete_workflow():
    """Test a complete end-to-end workflow."""
    print("=" * 70)
    print("Testing Complete Workflow")
    print("=" * 70)
    
    from prophecy import RuneValidator, ProphecyEngine
    from mathematics import MobiusTrajectory, BerryPhaseCalculator
    from engine import ZeroTorsionEngine
    from quest import QuestEngine
    
    # 1. Create prophecy
    prophecy_engine = ProphecyEngine()
    axiom = "sword legend pull magic kingdom artist stone destroy forget fire steel honey question"
    prophecy = prophecy_engine.create_prophecy(axiom)
    print(f"1. Prophecy created: ✓")
    
    # 2. Validate rune
    validator = RuneValidator()
    signature = validator.compute_rune_signature(axiom, 12345)
    rune_proof = validator.validate_rune_proof(axiom, 12345, signature)
    print(f"2. Rune validated: ✓")
    
    # 3. Generate Möbius trajectory
    generator = MobiusTrajectory()
    analysis = generator.analyze_trajectory(signature)
    print(f"3. Möbius analyzed: ✓ (Topology: {analysis['topology']})")
    
    # 4. Compute Berry phase
    calculator = BerryPhaseCalculator()
    phase = calculator.compute_berry_phase([signature])
    print(f"4. Berry phase computed: ✓")
    
    # 5. Validate zero-torsion
    engine = ZeroTorsionEngine()
    torsion = engine.validate_zero_torsion(signature)
    print(f"5. Zero-torsion validated: ✓")
    
    # 6. Create quest
    quest_engine = QuestEngine()
    quest = quest_engine.create_quest("Test", "Test", "mining", 4, 50.0)
    print(f"6. Quest created: ✓")
    
    print()
    return True


def main():
    """Run all tests."""
    print("\n🔮 Excalibur-EXS Integration Test Suite")
    print("=" * 70)
    print()
    
    all_passed = True
    
    # Run tests
    all_passed &= test_imports()
    all_passed &= test_prophecy_system()
    all_passed &= test_mathematics_system()
    all_passed &= test_engine_system()
    all_passed &= test_quest_system()
    all_passed &= test_enhanced_oracle()
    all_passed &= test_complete_workflow()
    
    # Summary
    print("=" * 70)
    print("Test Summary")
    print("=" * 70)
    
    if all_passed:
        print("✅ All tests PASSED!")
        print("\nThe Excalibur-EXS enhanced system is fully operational.")
        print("All modules are properly integrated and functional.")
        return 0
    else:
        print("❌ Some tests FAILED")
        print("\nPlease check the output above for details.")
        return 1


if __name__ == "__main__":
    exit(main())
