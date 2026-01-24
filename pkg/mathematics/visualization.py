#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Excalibur Mathematical Visualizer
----------------------------------
Generates ASCII and data visualizations for mathematical concepts.

Author: Travis D. Jones <holedozer@icloud.com>
License: BSD 3-Clause
"""

import math
import random
from typing import List, Tuple, Dict


class MathematicalVisualizer:
    """
    Generates visualizations for mathematical concepts in the Excalibur protocol.
    """
    
    def __init__(self, width: int = 80, height: int = 24):
        """
        Initialize visualizer.
        
        Args:
            width: ASCII canvas width
            height: ASCII canvas height
        """
        self.width = width
        self.height = height
        
    def render_ascii_trajectory(
        self,
        trajectory: List[Tuple[float, float, float]],
        projection: str = "xy"
    ) -> str:
        """
        Render a 3D trajectory as ASCII art.
        
        Args:
            trajectory: List of (x, y, z) points
            projection: Which plane to project ('xy', 'xz', 'yz')
            
        Returns:
            ASCII rendering
        """
        if not trajectory:
            return "No trajectory data"
        
        # Create canvas
        canvas = [[' ' for _ in range(self.width)] for _ in range(self.height)]
        
        # Determine bounds
        if projection == "xy":
            coords = [(p[0], p[1]) for p in trajectory]
        elif projection == "xz":
            coords = [(p[0], p[2]) for p in trajectory]
        else:  # yz
            coords = [(p[1], p[2]) for p in trajectory]
        
        min_x = min(c[0] for c in coords)
        max_x = max(c[0] for c in coords)
        min_y = min(c[1] for c in coords)
        max_y = max(c[1] for c in coords)
        
        # Scale to canvas
        def scale_point(x, y):
            if max_x - min_x > 0:
                sx = int((x - min_x) / (max_x - min_x) * (self.width - 1))
            else:
                sx = self.width // 2
            
            if max_y - min_y > 0:
                sy = int((y - min_y) / (max_y - min_y) * (self.height - 1))
            else:
                sy = self.height // 2
            
            return sx, self.height - 1 - sy  # Flip y for display
        
        # Plot trajectory
        chars = "●○◉◌"
        for i, (x, y) in enumerate(coords):
            sx, sy = scale_point(x, y)
            if 0 <= sx < self.width and 0 <= sy < self.height:
                char_idx = i % len(chars)
                canvas[sy][sx] = chars[char_idx]
        
        # Convert to string
        lines = [''.join(row) for row in canvas]
        return '\n'.join(lines)
    
    def render_ascii_phase_circle(
        self,
        berry_phase: float,
        radius: int = 10
    ) -> str:
        """
        Render Berry phase as circle with vector.
        
        Args:
            berry_phase: Phase angle in radians
            radius: Circle radius in characters
            
        Returns:
            ASCII rendering
        """
        size = 2 * radius + 1
        canvas = [[' ' for _ in range(size)] for _ in range(size)]
        center = radius
        
        # Draw circle
        for angle in range(0, 360, 5):
            rad = math.radians(angle)
            x = int(center + radius * math.cos(rad))
            y = int(center + radius * math.sin(rad))
            if 0 <= x < size and 0 <= y < size:
                canvas[y][x] = '○'
        
        # Draw phase vector
        phase_x = int(center + radius * math.cos(berry_phase))
        phase_y = int(center + radius * math.sin(berry_phase))
        
        # Draw line from center to phase point
        steps = radius
        for i in range(steps + 1):
            t = i / steps
            x = int(center + t * (phase_x - center))
            y = int(center + t * (phase_y - center))
            if 0 <= x < size and 0 <= y < size:
                canvas[y][x] = '─' if abs(y - center) < 1 else '│'
        
        # Mark phase point
        if 0 <= phase_x < size and 0 <= phase_y < size:
            canvas[phase_y][phase_x] = '●'
        
        # Mark center
        canvas[center][center] = '+'
        
        lines = [''.join(row) for row in canvas]
        return '\n'.join(lines)
    
    def generate_histogram(
        self,
        values: List[float],
        bins: int = 10,
        width: int = 50
    ) -> str:
        """
        Generate ASCII histogram.
        
        Args:
            values: Data values
            bins: Number of bins
            width: Width of bars
            
        Returns:
            ASCII histogram
        """
        if not values:
            return "No data"
        
        # Create bins
        min_val = min(values)
        max_val = max(values)
        bin_width = (max_val - min_val) / bins if bins > 0 else 1
        
        counts = [0] * bins
        for val in values:
            if bin_width > 0:
                bin_idx = int((val - min_val) / bin_width)
                bin_idx = min(bin_idx, bins - 1)  # Handle edge case
                counts[bin_idx] += 1
        
        # Find max count for scaling
        max_count = max(counts) if counts else 1
        
        # Generate bars
        lines = []
        for i, count in enumerate(counts):
            bin_start = min_val + i * bin_width
            bin_end = bin_start + bin_width
            
            bar_length = int(count / max_count * width) if max_count > 0 else 0
            bar = '█' * bar_length
            
            lines.append(f"[{bin_start:6.2f}-{bin_end:6.2f}] {bar} {count}")
        
        return '\n'.join(lines)
    
    def render_mobius_strip_ascii(self, width: int = 40) -> str:
        """
        Render a Möbius strip in ASCII.
        
        Args:
            width: Width of the rendering
            
        Returns:
            ASCII Möbius strip
        """
        lines = []
        height = width // 2
        
        for y in range(height):
            line = []
            for x in range(width):
                # Parametric equations for Möbius strip
                t = x / width * 2 * math.pi
                v = (y / height - 0.5) * 2
                
                # Twist parameter
                twist = math.cos(t / 2)
                
                # Determine character based on position
                if abs(v * twist) < 0.3:
                    line.append('█')
                elif abs(v * twist) < 0.6:
                    line.append('▓')
                elif abs(v * twist) < 0.9:
                    line.append('▒')
                else:
                    line.append('░')
            
            lines.append(''.join(line))
        
        return '\n'.join(lines)
    
    def create_3d_plot_data(
        self,
        trajectory: List[Tuple[float, float, float]]
    ) -> Dict:
        """
        Create data structure for 3D plotting libraries.
        
        Args:
            trajectory: 3D trajectory points
            
        Returns:
            Plot data dictionary
        """
        x_coords = [p[0] for p in trajectory]
        y_coords = [p[1] for p in trajectory]
        z_coords = [p[2] for p in trajectory]
        
        return {
            "x": x_coords,
            "y": y_coords,
            "z": z_coords,
            "type": "scatter3d",
            "mode": "lines+markers",
            "marker": {
                "size": 3,
                "color": z_coords,
                "colorscale": "Viridis"
            },
            "line": {
                "width": 2,
                "color": "blue"
            }
        }
    
    def create_phase_space_plot_data(
        self,
        points: List[Dict]
    ) -> Dict:
        """
        Create data for phase space visualization.
        
        Args:
            points: List of points with 'x', 'y' coordinates
            
        Returns:
            Plot data dictionary
        """
        x_coords = [p["x"] for p in points]
        y_coords = [p["y"] for p in points]
        
        return {
            "x": x_coords,
            "y": y_coords,
            "type": "scatter",
            "mode": "lines+markers",
            "marker": {
                "size": 8,
                "color": list(range(len(points))),
                "colorscale": "Portland"
            },
            "line": {
                "width": 2,
                "color": "rgba(100, 100, 255, 0.5)"
            }
        }


def main():
    """Demonstrate visualization capabilities."""
    print("🎨 Excalibur Mathematical Visualizer")
    print("=" * 60)
    print()
    
    viz = MathematicalVisualizer(width=60, height=20)
    
    # Generate sample trajectory
    print("🌀 Möbius Trajectory (XY Projection):")
    trajectory = []
    for i in range(64):
        t = i / 64 * 2 * math.pi
        x = math.cos(t)
        y = math.sin(t)
        z = 0.3 * math.sin(t / 2)
        trajectory.append((x, y, z))
    
    ascii_plot = viz.render_ascii_trajectory(trajectory, projection="xy")
    print(ascii_plot)
    print()
    
    # Berry phase circle
    print("🌊 Berry Phase Visualization:")
    phase = math.pi / 3  # 60 degrees
    phase_circle = viz.render_ascii_phase_circle(phase, radius=8)
    print(phase_circle)
    print(f"\nPhase: {phase:.4f} rad = {math.degrees(phase):.2f}°")
    print()
    
    # Histogram
    print("📊 Phase Distribution Histogram:")
    phases = [random.uniform(-math.pi, math.pi) for _ in range(100)]
    histogram = viz.generate_histogram(phases, bins=8, width=40)
    print(histogram)
    print()
    
    print("✅ Visualizer operational")


if __name__ == "__main__":
    main()
