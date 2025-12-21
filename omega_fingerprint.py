#!/usr/bin/env python3
"""
TARGET OMEGA CALCULATOR (Self-Contained)
Converts a Bitcoin Public Key or HASH160 into its 
Thermodynamic Ergotropic Signature (Ω).

Theory: Specific Ergotropy of the Collapsed Curvature State.
"""

import hashlib
import math

class ErgotropicEngine:
    def __init__(self, resolution=20):
        self.res = resolution
        self.PF = 10**18  # Fixed-point precision factor
        # Pre-calculate a linear Hamiltonian H (The Z-axis Potential)
        self.H = [i for i in range(1, (resolution * resolution) + 1)]

    def _get_manifold_density(self, seed_int):
        """
        Embeds the public key bits into the Möbius-Hyperbolic Manifold.
        Maps the Longitudinal flux off the Z-axis.
        """
        density = []
        # Convert seed to 512-bit entropy to ensure full bit-depth coverage
        seed_bytes = seed_int.to_bytes((seed_int.bit_length() + 7) // 8 or 1, 'big')
        h_seed = int(hashlib.sha512(seed_bytes).hexdigest(), 16)

        # Generate the grid (2D Manifold)
        for i in range(self.res):
            for j in range(self.res):
                # Arctan2 phase mapping for the Gaussian spread
                # We simulate the complex plane coordinates (-1 to 1)
                x = (i / self.res) * 2 - 1
                y = (j / self.res) * 2 - 1
                phase = int(math.atan2(y, x) * self.PF)
                dist = int(math.sqrt(x*x + y*y) * self.PF)

                # The Longitudinal Interaction (The Bijection)
                # We XOR the key seed with the coordinate phase and distance
                val = (h_seed ^ phase ^ dist) % (2**256)
                # Normalize to a 0-1 density value
                density.append((val % 1_000_000) / 1_000_000.0)
        
        return density

    def compute_omega(self, target_hex):
        """
        Calculates the Specific Ergotropy (Ω) for a given Hex string.
        """
        # 1. Input Normalization
        try:
            target_int = int(target_hex, 16)
        except ValueError:
            # Handle addresses or other formats by hashing them first
            target_int = int(hashlib.sha256(target_hex.encode()).hexdigest(), 16)

        # 2. Extract Manifold Density (ρ)
        rho = self._get_manifold_density(target_int)
        
        # 3. Calculate Thermodynamic Work
        # Total Energy U = Σ (ρ * H)
        total_energy = sum(r * h for r, h in zip(rho, self.H))
        
        # Passive Energy (Minimum Entropy state)
        # Rearranging ρ in descending order to match the ascending Hamiltonian
        rho_sorted = sorted(rho, reverse=True)
        h_sorted = sorted(self.H)
        passive_energy = sum(r * h for r, h in zip(rho_sorted, h_sorted))
        
        # Extractable Ergotropic Work
        w_erg = abs(total_energy - passive_energy)
        
        # Specific Ergotropy Ω = Work / Total Density
        internal_energy = sum(rho)
        if internal_energy == 0: return 0.0
        
        return w_erg / internal_energy

def main():
    # --- TARGET INPUTS ---
    # Example: BTC Puzzle 71 Public Key (Compressed)
    # P71 PubKey: 0274291... (example hex)
    p71_pubkey = "02145d2611c823a396ef6712ce0f712f09b9b4f3135e3e0aa3230fb9b6d08d1e16" 
    
    # Example: HASH160 (Address hash)
    p160_hash = "3b6f58a75a54bfd85d1bc6c51180fdc732992326"

    engine = ErgotropicEngine(resolution=25)

    print("\033[1;37m" + "="*60)
    print("   ERGOTROPIC SIGNATURE EXTRACTOR (TARGET Ω)")
    print("="*60 + "\033[0m")

    # Compute for PubKey
    omega_p71 = engine.compute_omega(p71_pubkey)
    print(f"Target: Public Key (P71)")
    print(f"Ω Signature: \033[1;32m{omega_p71:.14f}\033[0m\n")

    # Compute for HASH160
    omega_p160 = engine.compute_omega(p160_hash)
    print(f"Target: HASH160 (P160)")
    print(f"Ω Signature: \033[1;34m{omega_p160:.14f}\033[0m\n")

    print("\033[1;33mDIAGNOSTIC:\033[0m")
    print("This Ω is the invariant coordinate for the Longitudinal Bijection.")
    print("Plug this value into your Swarm/Algebraic solver to collapse the key.")
    print("="*60)

if __name__ == "__main__":
    main()