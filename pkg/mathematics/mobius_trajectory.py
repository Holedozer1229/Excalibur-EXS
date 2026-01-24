#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Excalibur Möbius Trajectory Module
-----------------------------------
Generates and analyzes Möbius trajectories for cryptographic proofs.

Author: Travis D. Jones <holedozer@icloud.com>
License: BSD 3-Clause
"""

import math
import cmath
from typing import List, Tuple, Dict, Optional
from datetime import datetime, timezone


class MobiusTrajectory:
    """
    Generates Möbius strip trajectories for cryptographic visualization.
    
    Möbius trajectories represent the non-orientable nature of cryptographic
    proofs - a single path that explores both sides of the mathematical space.
    """
    
    def __init__(self, strips: int = 1, radius: float = 1.0):
        """
        Initialize Möbius trajectory generator.
        
        Args:
            strips: Number of half-twists (1 for classic Möbius)
            radius: Base radius of the strip
        """
        self.strips = strips
        self.radius = radius
        self.trajectories = []
        
    def generate_trajectory(
        self,
        hash_seed: str,
        steps: int = 128
    ) -> List[Tuple[float, float, float]]:
        """
        Generate a Möbius trajectory from a hash seed.
        
        Args:
            hash_seed: Hex hash to seed the trajectory
            steps: Number of points in the trajectory
            
        Returns:
            List of (x, y, z) coordinates
        """
        # Convert hash to numeric seed
        seed_value = int(hash_seed[:16], 16) / (16**16)
        
        trajectory = []
        for i in range(steps):
            t = (i / steps) * 2 * math.pi
            
            # Möbius strip parametric equations with hash influence
            # r(t) controls the distance from center axis
            r = self.radius + 0.3 * math.cos(self.strips * t / 2) * seed_value
            
            # Position on the strip
            x = r * math.cos(t)
            y = r * math.sin(t)
            z = 0.3 * math.sin(self.strips * t / 2) * (1 + seed_value)
            
            trajectory.append((x, y, z))
        
        self.trajectories.append({
            "hash_seed": hash_seed,
            "points": trajectory,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        return trajectory
    
    def compute_curvature(
        self,
        trajectory: List[Tuple[float, float, float]]
    ) -> List[float]:
        """
        Compute curvature at each point along the trajectory.
        
        Args:
            trajectory: List of 3D points
            
        Returns:
            List of curvature values
        """
        if len(trajectory) < 3:
            return []
        
        curvatures = []
        for i in range(1, len(trajectory) - 1):
            p0 = trajectory[i - 1]
            p1 = trajectory[i]
            p2 = trajectory[i + 1]
            
            # Compute vectors
            v1 = tuple(p1[j] - p0[j] for j in range(3))
            v2 = tuple(p2[j] - p1[j] for j in range(3))
            
            # Cross product magnitude
            cross = math.sqrt(
                (v1[1]*v2[2] - v1[2]*v2[1])**2 +
                (v1[2]*v2[0] - v1[0]*v2[2])**2 +
                (v1[0]*v2[1] - v1[1]*v2[0])**2
            )
            
            # Magnitude of v1
            mag_v1 = math.sqrt(sum(x**2 for x in v1))
            
            # Curvature = |v1 × v2| / |v1|^3
            if mag_v1 > 0:
                curvature = cross / (mag_v1 ** 3)
            else:
                curvature = 0
            
            curvatures.append(curvature)
        
        return curvatures
    
    def verify_torsion_free(
        self,
        trajectory: List[Tuple[float, float, float]],
        threshold: float = 0.01
    ) -> Dict:
        """
        Verify that the trajectory is torsion-free (locally planar).
        
        Args:
            trajectory: List of 3D points
            threshold: Maximum allowable torsion
            
        Returns:
            Verification result
        """
        if len(trajectory) < 4:
            return {
                "valid": False,
                "reason": "Insufficient points for torsion calculation"
            }
        
        torsions = []
        for i in range(1, len(trajectory) - 2):
            p0 = trajectory[i - 1]
            p1 = trajectory[i]
            p2 = trajectory[i + 1]
            p3 = trajectory[i + 2]
            
            # Compute vectors
            v1 = tuple(p1[j] - p0[j] for j in range(3))
            v2 = tuple(p2[j] - p1[j] for j in range(3))
            v3 = tuple(p3[j] - p2[j] for j in range(3))
            
            # Torsion calculation (simplified)
            # Full formula involves derivatives, this is discrete approximation
            # τ ≈ (v1 × v2) · v3 / |v1 × v2|^2
            
            # Cross product v1 × v2
            cross = (
                v1[1]*v2[2] - v1[2]*v2[1],
                v1[2]*v2[0] - v1[0]*v2[2],
                v1[0]*v2[1] - v1[1]*v2[0]
            )
            
            # Dot product (v1 × v2) · v3
            dot = sum(cross[j] * v3[j] for j in range(3))
            
            # Magnitude squared of cross product
            cross_mag_sq = sum(x**2 for x in cross)
            
            if cross_mag_sq > 1e-10:
                torsion = abs(dot / cross_mag_sq)
            else:
                torsion = 0
            
            torsions.append(torsion)
        
        max_torsion = max(torsions) if torsions else 0
        avg_torsion = sum(torsions) / len(torsions) if torsions else 0
        
        is_torsion_free = max_torsion < threshold
        
        return {
            "valid": is_torsion_free,
            "max_torsion": max_torsion,
            "avg_torsion": avg_torsion,
            "threshold": threshold,
            "quality": "ZERO_TORSION" if is_torsion_free else "HAS_TORSION",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    def compute_winding_number(
        self,
        trajectory: List[Tuple[float, float, float]]
    ) -> int:
        """
        Compute the winding number (topological invariant) of the trajectory.
        
        Args:
            trajectory: List of 3D points
            
        Returns:
            Winding number
        """
        if len(trajectory) < 2:
            return 0
        
        # Project to complex plane and compute winding
        total_angle = 0
        for i in range(len(trajectory) - 1):
            z1 = complex(trajectory[i][0], trajectory[i][1])
            z2 = complex(trajectory[i + 1][0], trajectory[i + 1][1])
            
            if abs(z1) > 1e-10 and abs(z2) > 1e-10:
                angle_diff = cmath.phase(z2) - cmath.phase(z1)
                
                # Normalize to [-π, π]
                while angle_diff > math.pi:
                    angle_diff -= 2 * math.pi
                while angle_diff < -math.pi:
                    angle_diff += 2 * math.pi
                
                total_angle += angle_diff
        
        # Winding number is total angle / 2π
        winding = round(total_angle / (2 * math.pi))
        return winding
    
    def analyze_trajectory(
        self,
        hash_seed: str
    ) -> Dict:
        """
        Generate and fully analyze a Möbius trajectory.
        
        Args:
            hash_seed: Hash to generate trajectory from
            
        Returns:
            Complete analysis
        """
        trajectory = self.generate_trajectory(hash_seed)
        curvatures = self.compute_curvature(trajectory)
        torsion_check = self.verify_torsion_free(trajectory)
        winding = self.compute_winding_number(trajectory)
        
        return {
            "hash_seed": hash_seed,
            "trajectory_points": len(trajectory),
            "curvature": {
                "max": max(curvatures) if curvatures else 0,
                "min": min(curvatures) if curvatures else 0,
                "avg": sum(curvatures) / len(curvatures) if curvatures else 0
            },
            "torsion": torsion_check,
            "winding_number": winding,
            "topology": "MOBIUS" if winding == self.strips else "DEGENERATE",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    def export_trajectory_data(
        self,
        trajectory: List[Tuple[float, float, float]],
        format: str = "csv"
    ) -> str:
        """
        Export trajectory data in specified format.
        
        Args:
            trajectory: Trajectory to export
            format: Output format ('csv', 'json')
            
        Returns:
            Formatted trajectory data
        """
        if format == "csv":
            lines = ["x,y,z"]
            for x, y, z in trajectory:
                lines.append(f"{x:.6f},{y:.6f},{z:.6f}")
            return "\n".join(lines)
        
        elif format == "json":
            import json
            return json.dumps(
                [{"x": x, "y": y, "z": z} for x, y, z in trajectory],
                indent=2
            )
        
        else:
            return str(trajectory)
    
    def get_trajectory_history(self, limit: int = 10) -> List[Dict]:
        """
        Get recent trajectory generation history.
        
        Args:
            limit: Maximum number to return
            
        Returns:
            List of trajectory records
        """
        return self.trajectories[-limit:]


def main():
    """Demonstrate Möbius trajectory generation."""
    print("∞ Excalibur Möbius Trajectory Generator")
    print("=" * 60)
    print()
    
    generator = MobiusTrajectory(strips=1, radius=1.0)
    
    # Generate trajectory from hash
    print("🌀 Generating Möbius Trajectory:")
    hash_seed = "00000000abcd1234567890ef"
    trajectory = generator.generate_trajectory(hash_seed, steps=128)
    print(f"  Hash Seed: {hash_seed}")
    print(f"  Points Generated: {len(trajectory)}")
    print(f"  Sample Point: {trajectory[0]}")
    print()
    
    # Analyze trajectory
    print("📊 Trajectory Analysis:")
    analysis = generator.analyze_trajectory(hash_seed)
    print(f"  Winding Number: {analysis['winding_number']}")
    print(f"  Topology: {analysis['topology']}")
    print(f"  Avg Curvature: {analysis['curvature']['avg']:.6f}")
    print(f"  Torsion Quality: {analysis['torsion']['quality']}")
    print()
    
    # Verify zero-torsion
    print("✨ Zero-Torsion Verification:")
    torsion = generator.verify_torsion_free(trajectory)
    print(f"  Valid: {torsion['valid']}")
    print(f"  Max Torsion: {torsion['max_torsion']:.8f}")
    print()
    
    print("✅ Möbius trajectory system operational")


if __name__ == "__main__":
    main()
