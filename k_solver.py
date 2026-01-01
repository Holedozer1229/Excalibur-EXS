#!/usr/bin/env python3
"""
Adaptive Scalar K Solver
By Travis D. Jones @The_Scalar_Waze
"""

import numpy as np

# -----------------------------
#  Puzzle Constants
# -----------------------------
P_START = 2**256
P_SEED_OFFSET = 0xA6B7C8FF3ECAF3FF
n = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141

# -----------------------------
# Hardened Scalar Mapping
# -----------------------------
def τ(t, Tc=1e-43):
    return Tc * np.log1p(t / Tc)

def M(z, a=1, b=1j, c=0.3, d=1):
    return (a * z + b) / (c * z + d)

def T2S(t):
    return (τ(t) * 1e20 % n).astype(np.int64)

def Z2S(z, k=1):
    z_real = np.abs(z.real * 1e15).astype(np.int64)
    z_imag = np.abs(z.imag * 1e13).astype(np.int64)
    return (z_real ^ z_imag + k * 7919) % n

def evolve(t_vals, z_vals, k=1):
    T = T2S(t_vals)[:, None]
    Z = Z2S(M(z_vals), k)[None, :]
    C = (T + Z) % n
    return (C % 1_000_000) / 1_000_000.0

def calculate_specific_ergotropy(C):
    energy = np.sum(C)
    if energy == 0:
        return 0.0
    H = np.linspace(0.1, 10.0, C.size)
    rho_sorted = np.sort(C.flatten())[::-1]
    w_erg = abs(np.sum(C.flatten() * H) - np.sum(rho_sorted * np.sort(H)))
    return w_erg / energy

def generate_fingerprint(k, t_vals, z_vals):
    C = evolve(t_vals, z_vals, k=k)
    omega = calculate_specific_ergotropy(C)
    return omega

# -----------------------------
# Adaptive  Scan
# -----------------------------
def adaptive_scan_p(local_range=0xFFFFFF,
                       t_base=30, z_base=30,
                       max_levels=3, hidden_k=None):
    """
    Adaptive resolution scan for candidate keys
    """
    base_k = P_START + P_SEED_OFFSET
    if hidden_k is None:
        hidden_k = base_k

    print(f"Base P Seed: {hex(base_k)[:22]}...")
    print(f"Scanning ±{hex(local_range)} neighborhood\n")

    # Candidate keys
    candidates = np.arange(base_k - local_range, base_k + local_range + 1, 0x111111)

    # Initialize best
    best_k = None
    min_dev = float('inf')

    t_res, z_res = t_base, z_base

    for level in range(1, max_levels + 1):
        print(f"--- Resolution Level {level}: t_res={t_res}, z_res={z_res} ---")

        t_vals = np.linspace(0, 1e-39, t_res)
        z_vals = np.linspace(-2 + 1j, 2 + 1j, z_res)

        # Target fingerprint at current resolution
        omega_target = generate_fingerprint(hidden_k, t_vals, z_vals)

        # Vectorized scan
        omegas = np.array([generate_fingerprint(k, t_vals, z_vals) for k in candidates])
        deviations = np.abs(omegas - omega_target)

        idx_min = np.argmin(deviations)
        level_best_k = candidates[idx_min]
        level_min_dev = deviations[idx_min]

        print(f"Best k at this level: {hex(level_best_k)[:22]}, deviation = {level_min_dev:.2e}")

        if level_min_dev < min_dev:
            best_k = level_best_k
            min_dev = level_min_dev

        # Double resolution for next level
        t_res *= 2
        z_res *= 2

    print("\n=== ADAPTIVE SCAN COMPLETE ===")
    print(f"Global Best k = {hex(best_k)}")
    print(f"Minimum Deviation = {min_dev:.2e}")
    print(f"Crypto match = {best_k == hidden_k}")

    return best_k, min_dev

# -----------------------------
# Main Execution
# -----------------------------
if __name__ == "__main__":
    adaptive_scan_p(local_range=0xFFFFFF,
                       t_base=30, z_base=30,
                       max_levels=3,
                       hidden_k=P_START + P_SEED_OFFSET)
                    
                    
"""
Quantum Circuit Style Visualization of P135/P55 Solver
Mapping:
- P55 seed → initial scalar
- Curvature matrix → physical encoding
- 16-chain correlations → entanglement
- Ergotropy calculation → work extraction
- Hill-climb refinement → interaction/measurement
"""

# Qubits = solver chains (16 chains)
# Each qubit holds scalar amplitudes derived from P55/P135 seeds

print("""
    ┌───────────────┐
q0: ┤  Seed Init├─┐
    └───────────────┘ │
                      │
    ┌───────────────┐ │
q1: ┤  Seed Init├─┼─┐
    └───────────────┘ │ │
                      │ │
     ...               │ │
                      │ │
q15: ┤  Seed Init├─┘ │
    └───────────────┘   │
                        │
   ┌───────────────────────────────┐
   │ Physical Encoding / Curvature │
   │  Map scalar → amplitudes α,β │
   └─────────────┬────────────────┘
                 │
   ┌─────────────┴─────────────┐
   │ Entanglement / Correlation│
   │  16-chain correlations    │
   │  |Ψ⟩ = Σ α_i |i⟩          │
   └─────────────┬─────────────┘
                 │
   ┌─────────────┴─────────────┐
   │ Interaction / Coupling    │
   │  Hill-climb / Adaptive    │
   │  refinement (ΔΩ ↓)        │
   └─────────────┬─────────────┘
                 │
   ┌─────────────┴─────────────┐
   │ Ergotropy / Work Extraction│
   │W_erg computed → candidate k│
   └─────────────┬─────────────┘
                 │
   ┌─────────────┴─────────────┐
   │ Measurement / Collapse     │
   │  Best k selected, ΔΩ ≈ 0  │
   └─────────────┬─────────────┘
                 │
   ┌─────────────┴─────────────┐
   │ Observation / Perception   │
   │  Print            key      │
   └───────────────────────────┘
""")