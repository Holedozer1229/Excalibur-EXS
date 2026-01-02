# Excalibur-EXS Jupyter Notebooks

This directory contains Jupyter notebooks demonstrating the mathematical and cryptographic foundations of the Excalibur protocol.

## Available Notebooks

### 1. Mathematical Proofs (`mathematical_proofs.ipynb`)

Demonstrates:
- Möbius trajectory generation and topological invariance
- Berry phase calculations and quantization
- Zero-torsion validation and entropy analysis
- Rune signature cryptography
- Complete workflow integration

## Running the Notebooks

### Prerequisites

```bash
pip install jupyter numpy matplotlib
```

### Launch Jupyter

```bash
cd notebooks/
jupyter notebook
```

Then open `mathematical_proofs.ipynb` in your browser.

### Running from Command Line

You can also execute notebooks from the command line:

```bash
jupyter nbconvert --to notebook --execute mathematical_proofs.ipynb
```

## Notebook Structure

Each notebook follows this structure:

1. **Setup**: Import modules and initialize components
2. **Theorems**: Mathematical statements with proofs
3. **Visualizations**: ASCII art and data visualizations
4. **Integration**: Complete workflow demonstrations
5. **Conclusions**: Summary of findings

## Example Usage

```python
# In a Jupyter cell
import sys
sys.path.append('../pkg')

from prophecy import RuneValidator
from mathematics import MobiusTrajectory, BerryPhaseCalculator
from engine import ZeroTorsionEngine

# Initialize components
validator = RuneValidator()
generator = MobiusTrajectory()
calculator = BerryPhaseCalculator()
engine = ZeroTorsionEngine()

# Run demonstrations
# ... (see notebook for details)
```

## Topics Covered

### Cryptographic Mathematics
- Hash function analysis
- Entropy calculations
- Signature schemes
- Proof-of-work validation

### Geometric Analysis
- Möbius strip parametrization
- Curvature and torsion
- Winding numbers
- Topological invariants

### Quantum-Inspired Methods
- Berry phase calculations
- Geometric phases
- Adiabatic evolution
- Phase quantization

### Statistical Analysis
- Entropy distribution
- Zero-torsion metrics
- Statistical validation
- Batch processing

## Contributing

To add new notebooks:

1. Create notebook in this directory
2. Follow the existing structure
3. Include comprehensive documentation
4. Add visualizations where appropriate
5. Update this README

## References

- [ARCHITECTURE.md](../ARCHITECTURE.md) - System architecture
- [QUICKSTART_ENHANCED.md](../QUICKSTART_ENHANCED.md) - Usage guide
- [Module Documentation](../pkg/) - Module source code

---

**Note**: These notebooks are educational and demonstrate the mathematical foundations. For production use, refer to the Python modules in `pkg/`.
