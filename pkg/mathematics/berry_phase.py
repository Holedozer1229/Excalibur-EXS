#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Excalibur Berry Phase Calculator
---------------------------------
Calculates geometric Berry phases for cryptographic proofs.

Author: Travis D. Jones <holedozer@gmail.com>
License: BSD 3-Clause
"""

import math
import cmath
from typing import List, Tuple, Dict, Optional
from datetime import datetime, timezone


class BerryPhaseCalculator:
    """
    Calculates Berry phases - geometric phases acquired during cyclic evolution.
    
    In the context of Excalibur, Berry phases represent the geometric properties
    of hash trajectories through cryptographic parameter space.
    """
    
    def __init__(self):
        """Initialize the Berry phase calculator."""
        self.phase_history = []
        
    def compute_berry_phase(
        self,
        hash_sequence: List[str],
        normalize: bool = True
    ) -> float:
        """
        Compute Berry phase from a sequence of hashes.
        
        Args:
            hash_sequence: Ordered list of hash values
            normalize: Whether to normalize to [-π, π]
            
        Returns:
            Berry phase in radians
        """
        if len(hash_sequence) < 3:
            return 0.0
        
        # Convert hashes to complex states in parameter space
        states = []
        for hash_val in hash_sequence:
            # Extract real and imaginary parts from hash
            real = int(hash_val[:16], 16) / (16**16)
            imag = int(hash_val[16:32] if len(hash_val) >= 32 else hash_val[:16], 16) / (16**16)
            
            # Map to unit circle
            angle = 2 * math.pi * real
            states.append(complex(math.cos(angle), math.sin(angle) * imag))
        
        # Compute geometric phase using discrete path integral
        phase = 0.0
        for i in range(len(states) - 1):
            z1 = states[i]
            z2 = states[i + 1]
            
            # Parallel transport contribution
            if abs(z1) > 1e-10 and abs(z2) > 1e-10:
                # Phase difference
                delta_phase = cmath.phase(z2 / z1)
                phase += delta_phase
        
        # Close the loop
        if len(states) > 0:
            z_first = states[0]
            z_last = states[-1]
            if abs(z_first) > 1e-10 and abs(z_last) > 1e-10:
                phase += cmath.phase(z_first / z_last)
        
        # Normalize to [-π, π]
        if normalize:
            while phase > math.pi:
                phase -= 2 * math.pi
            while phase < -math.pi:
                phase += 2 * math.pi
        
        # Record phase
        self.phase_history.append({
            "phase": phase,
            "hash_count": len(hash_sequence),
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        return phase
    
    def compute_adiabatic_evolution(
        self,
        initial_hash: str,
        final_hash: str,
        intermediate_steps: int = 10
    ) -> Dict:
        """
        Compute adiabatic evolution between two hash states.
        
        Args:
            initial_hash: Starting hash
            final_hash: Target hash
            intermediate_steps: Number of interpolation steps
            
        Returns:
            Evolution analysis
        """
        # Generate intermediate states
        hash_sequence = [initial_hash]
        
        # Interpolate between hashes
        init_val = int(initial_hash[:16], 16)
        final_val = int(final_hash[:16], 16)
        
        for i in range(1, intermediate_steps):
            t = i / intermediate_steps
            interpolated = int(init_val * (1 - t) + final_val * t)
            hash_sequence.append(f"{interpolated:016x}")
        
        hash_sequence.append(final_hash)
        
        # Compute Berry phase
        berry_phase = self.compute_berry_phase(hash_sequence)
        
        return {
            "initial_hash": initial_hash,
            "final_hash": final_hash,
            "steps": len(hash_sequence),
            "berry_phase": berry_phase,
            "phase_degrees": math.degrees(berry_phase),
            "evolution_type": "ADIABATIC",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    def analyze_phase_distribution(
        self,
        hash_list: List[str]
    ) -> Dict:
        """
        Analyze the distribution of phases in a hash sequence.
        
        Args:
            hash_list: List of hashes to analyze
            
        Returns:
            Statistical analysis
        """
        if len(hash_list) < 2:
            return {
                "error": "Insufficient hashes for analysis",
                "min_required": 2
            }
        
        # Compute pairwise phases
        phases = []
        for i in range(len(hash_list) - 1):
            phase = self.compute_berry_phase([hash_list[i], hash_list[i + 1]], normalize=True)
            phases.append(phase)
        
        # Statistical measures
        avg_phase = sum(phases) / len(phases) if phases else 0
        
        # Variance
        variance = sum((p - avg_phase)**2 for p in phases) / len(phases) if phases else 0
        std_dev = math.sqrt(variance)
        
        # Entropy (discretize phases into bins)
        bins = 16
        histogram = [0] * bins
        for phase in phases:
            bin_idx = int((phase + math.pi) / (2 * math.pi) * bins) % bins
            histogram[bin_idx] += 1
        
        # Calculate entropy
        entropy = 0
        total = len(phases)
        for count in histogram:
            if count > 0:
                p = count / total
                entropy -= p * math.log2(p)
        
        return {
            "hash_count": len(hash_list),
            "phase_measurements": len(phases),
            "average_phase": avg_phase,
            "phase_degrees": math.degrees(avg_phase),
            "std_deviation": std_dev,
            "entropy": entropy,
            "max_entropy": math.log2(bins),
            "uniformity": entropy / math.log2(bins),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    def verify_geometric_invariance(
        self,
        hash_sequence: List[str]
    ) -> Dict:
        """
        Verify geometric invariance properties of the hash sequence.
        
        Args:
            hash_sequence: Sequence to verify
            
        Returns:
            Invariance verification result
        """
        if len(hash_sequence) < 3:
            return {
                "valid": False,
                "reason": "Insufficient hashes for invariance check"
            }
        
        # Compute Berry phase
        berry_phase = self.compute_berry_phase(hash_sequence)
        
        # Check if phase is topologically protected (quantized)
        # In ideal quantum systems, Berry phase is often an integer multiple of 2π
        phase_quotient = berry_phase / (2 * math.pi)
        nearest_integer = round(phase_quotient)
        deviation = abs(phase_quotient - nearest_integer)
        
        # Geometric invariance means small deviation from quantization
        is_invariant = deviation < 0.1
        
        return {
            "valid": is_invariant,
            "berry_phase": berry_phase,
            "phase_quotient": phase_quotient,
            "nearest_integer": nearest_integer,
            "deviation": deviation,
            "quality": "GEOMETRICALLY_INVARIANT" if is_invariant else "VARIANT",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    def compute_holonomy(
        self,
        cyclic_path: List[str]
    ) -> Dict:
        """
        Compute holonomy (parallel transport around closed loop).
        
        Args:
            cyclic_path: Closed path of hashes (first should equal last)
            
        Returns:
            Holonomy calculation
        """
        if len(cyclic_path) < 3:
            return {
                "error": "Path too short for holonomy calculation"
            }
        
        # Ensure path is closed
        if cyclic_path[0] != cyclic_path[-1]:
            cyclic_path = cyclic_path + [cyclic_path[0]]
        
        # Compute Berry phase for closed path
        berry_phase = self.compute_berry_phase(cyclic_path)
        
        # Holonomy is exp(i * Berry phase)
        holonomy = cmath.exp(1j * berry_phase)
        
        return {
            "berry_phase": berry_phase,
            "holonomy_real": holonomy.real,
            "holonomy_imag": holonomy.imag,
            "holonomy_magnitude": abs(holonomy),
            "path_length": len(cyclic_path),
            "is_closed": cyclic_path[0] == cyclic_path[-1],
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    def get_phase_history(self, limit: int = 10) -> List[Dict]:
        """
        Get recent Berry phase calculations.
        
        Args:
            limit: Maximum number to return
            
        Returns:
            List of phase records
        """
        return self.phase_history[-limit:]
    
    def visualize_phase_space(
        self,
        hash_sequence: List[str]
    ) -> Dict:
        """
        Generate phase space visualization data.
        
        Args:
            hash_sequence: Sequence of hashes
            
        Returns:
            Visualization data structure
        """
        # Convert hashes to points in phase space
        points = []
        for hash_val in hash_sequence:
            real = int(hash_val[:16], 16) / (16**16)
            imag = int(hash_val[16:32] if len(hash_val) >= 32 else hash_val[:16], 16) / (16**16)
            
            angle = 2 * math.pi * real
            x = math.cos(angle)
            y = math.sin(angle) * imag
            
            points.append({
                "x": x,
                "y": y,
                "hash": hash_val[:16]
            })
        
        # Compute Berry phase
        berry_phase = self.compute_berry_phase(hash_sequence)
        
        return {
            "points": points,
            "berry_phase": berry_phase,
            "phase_degrees": math.degrees(berry_phase),
            "point_count": len(points),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }


def main():
    """Demonstrate Berry phase calculation."""
    print("🌊 Excalibur Berry Phase Calculator")
    print("=" * 60)
    print()
    
    calculator = BerryPhaseCalculator()
    
    # Sample hash sequence
    print("📊 Computing Berry Phase:")
    hashes = [
        "00000000abcd1234567890ef",
        "0000001234567890abcdef00",
        "00000056789abcdef0123400"
    ]
    
    phase = calculator.compute_berry_phase(hashes)
    print(f"  Hash Count: {len(hashes)}")
    print(f"  Berry Phase: {phase:.6f} radians")
    print(f"  Phase (degrees): {math.degrees(phase):.2f}°")
    print()
    
    # Adiabatic evolution
    print("🔄 Adiabatic Evolution:")
    evolution = calculator.compute_adiabatic_evolution(
        hashes[0],
        hashes[-1],
        intermediate_steps=5
    )
    print(f"  Steps: {evolution['steps']}")
    print(f"  Berry Phase: {evolution['berry_phase']:.6f}")
    print(f"  Phase (degrees): {evolution['phase_degrees']:.2f}°")
    print()
    
    # Phase distribution
    print("📈 Phase Distribution Analysis:")
    distribution = calculator.analyze_phase_distribution(hashes)
    print(f"  Average Phase: {distribution['average_phase']:.6f}")
    print(f"  Entropy: {distribution['entropy']:.4f}")
    print(f"  Uniformity: {distribution['uniformity']:.4f}")
    print()
    
    # Geometric invariance
    print("✨ Geometric Invariance:")
    invariance = calculator.verify_geometric_invariance(hashes)
    print(f"  Valid: {invariance['valid']}")
    print(f"  Quality: {invariance['quality']}")
    print()
    
    print("✅ Berry phase calculator operational")


if __name__ == "__main__":
    main()
