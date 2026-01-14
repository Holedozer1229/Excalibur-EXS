# GitHub Copilot Instructions for Excalibur-EXS

## Project Overview

Excalibur-EXS ($EXS) is a quantum-hardened, ambiguity-focused fork of Bitcoin utilizing the Ω′ Δ18 Tetra-PoW mining algorithm. The protocol forges unique, un-linkable Taproot (P2TR) vaults through the sacred 13-word prophecy axiom.

## Core Technologies

- **Languages**: Go 1.21+, Python 3.10+, TypeScript/JavaScript
- **Blockchain**: Bitcoin-based, Taproot (P2TR) native
- **Cryptography**: PBKDF2-HMAC-SHA512, SHA-256, Tetra-PoW
- **APIs**: Rosetta API v1.4.10, REST APIs

## Sacred Axiom

**CRITICAL**: All forge attempts MUST use this canonical 13-word axiom:

```
sword legend pull magic kingdom artist stone destroy forget fire steel honey question
```

Never modify, reorder, or substitute these words. This axiom is the foundational entropy source for the entire protocol.

## Code Style Guidelines

### Python Code

- **Follow PEP 8** style guidelines strictly
- **Use type hints** for all function parameters and return values
- **Include comprehensive docstrings** following Google/NumPy style:
  ```python
  def function_name(param: str) -> bool:
      """
      Brief description.
      
      Args:
          param: Parameter description
          
      Returns:
          Return value description
      """
  ```
- **Author attribution**: Include `Author: Travis D. Jones <holedozer@gmail.com>` in module docstrings
- **License**: Include `License: BSD 3-Clause` in module headers
- **Use dataclasses** for structured data (see `pkg/blockchain/block.py`)
- **Prefer `Decimal`** for financial calculations (tokenomics, fees)

### Go Code

- **Follow standard Go formatting** (`go fmt`)
- **Use clear, idiomatic Go** code
- **Comment all exported functions** with proper godoc format
- **Constants over magic numbers**: Define all protocol constants at package level
  ```go
  // HPP1Rounds defines the number of rounds for HPP-1 (600,000 rounds)
  const HPP1Rounds = 600000
  ```
- **Error handling**: Always return and check errors explicitly
- **Test coverage**: Include `_test.go` files for all packages

### TypeScript/JavaScript

- **Use semantic HTML** in web interfaces
- **Prefer vanilla JavaScript** for simple interactions (avoid heavy frameworks)
- **Ensure mobile responsiveness** for all UI components
- **Dark Arthurian theme**: Maintain the medieval/mystical aesthetic

## Cryptographic Standards

### HPP-1 Protocol

- **Iterations**: Always use exactly **600,000 PBKDF2-HMAC-SHA512 rounds**
- **Salt**: Use `Excalibur-ESX-Ω′Δ18` as the default salt
- **Key Length**: 64 bytes (512 bits)
- **Never reduce iterations** for performance - quantum resistance is critical

### Tetra-PoW Mining

- **Rounds**: 128-round nonlinear state shifts
- **State**: 4x uint64 array with bitwise mixing
- **Difficulty**: Leading zeros in SHA-256 hash output
- **Nonce**: Incrementing integer for proof-of-work search

### Zero-Torsion Validation

- Hash entropy must be uniformly distributed
- Torsion = variance of local entropy chunks
- Valid proofs must have torsion below threshold
- Used to prevent cryptographic manipulation

## Economic Constants

- **Total Supply**: 21,000,000 $EXS (fixed, never change)
- **Forge Reward**: 50 $EXS per successful forge
- **Treasury Fee**: 1% of all rewards (0.01)
- **Forge Fee**: 0.0001 BTC per forge submission
- **Distribution**: 60% PoF Miners / 15% Treasury / 20% Liquidity / 5% Airdrop
- **Halving**: Every 210,000 blocks

**IMPORTANT**: Never modify these constants without explicit approval. They are part of the protocol specification.

## Architecture Patterns

### Module Organization

```
pkg/
├── prophecy/         # Prophecy validation & rune system
├── mathematics/      # Möbius trajectories & Berry phases
├── engine/           # Zero-torsion validation
├── quest/            # Quest system & rewards
├── oracle/           # Enhanced oracle integration
├── blockchain/       # Block structure & chain management
├── crypto/           # Core cryptographic primitives
├── bitcoin/          # Taproot, Bech32m support
├── economy/          # Treasury and tokenomics
├── foundry/          # Forge processing
└── miner/            # Mining kernels

miners/               # All mining implementations
├── tetra-pow-go/     # Production Go miner
├── tetra-pow-python/ # Reference Python miner
├── dice-miner/       # Probabilistic dice miner
└── universal-miner/  # Multi-strategy miner
```

### Double-Portal Architecture

1. **Merlin's Portal** (`/admin/merlins-portal`): Admin dashboard
   - Treasury monitoring
   - Difficulty calibration
   - Forge analytics

2. **Knights' Round Table** (`/web/knights-round-table`): Public forge UI
   - Axiom entry interface
   - Mining visualization
   - P2TR vault generation

## Testing Guidelines

### Running Tests

- **Go**: `go test ./pkg/...`
- **Python**: `./test.sh` for integration tests
- **Miners**: Use benchmark mode with known test cases

### Test Requirements

- **Unit tests** for cryptographic functions (critical)
- **Integration tests** for forge validation flow
- **Performance benchmarks** for mining algorithms
- **Security tests** for zero-torsion validation

## Security Best Practices

### Critical Security Rules

1. **Never log or expose**:
   - Private keys
   - Wallet seeds/mnemonics
   - API credentials
   - User passwords

2. **Always validate**:
   - Axiom integrity (exact 13-word match)
   - Proof-of-work difficulty requirements
   - Zero-torsion properties
   - Taproot address format (bc1p...)

3. **Quantum hardening**:
   - Use HPP-1 for all key derivation
   - Never reduce PBKDF2 iterations
   - Validate entropy uniformity

4. **Report security issues**:
   - Email: holedozer@gmail.com
   - Do NOT open public issues for vulnerabilities

## API Design Patterns

### Enhanced Oracle API

- Base path: `/api/v1/oracle/`
- JSON request/response format
- RESTful conventions
- Error responses with descriptive messages

### Rosetta API

- Coinbase-compatible
- Version 1.4.10
- Located in `pkg/rosetta/` and `cmd/rosetta/`
- Follows Rosetta Construction API spec

## Git Commit Conventions

- **Use clear, descriptive messages**
- **Start with a verb**: "Add", "Fix", "Update", "Remove"
- **Reference issue numbers** when applicable
- **Example**:
  ```
  Add zero-torsion validation to prophecy engine
  
  Implements entropy uniformity checking for all prophecy
  validations to prevent cryptographic manipulation.
  
  Closes #456
  ```

## Mining Contributions

### Adding New Miners

1. Create directory under `miners/` with descriptive name
2. Implement consensus algorithm
3. Ensure compatibility with:
   - 13-word axiom system
   - Configurable difficulty targets
   - P2TR vault address generation
   - Treasury allocation (15% of rewards)
4. Add comprehensive README with:
   - Algorithm description
   - Installation instructions
   - Performance benchmarks
   - Security properties
5. Submit PR with tests

## Documentation Standards

- **Update README.md** for major feature changes
- **Add inline comments** for complex cryptographic logic
- **Include usage examples** in module docstrings
- **Update ARCHITECTURE.md** for architectural changes
- **Maintain CONTRIBUTING.md** for contribution guidelines

## Common Patterns

### Forge Validation Pattern

```python
def validate_forge(axiom: str, nonce: int, difficulty: int) -> bool:
    """Validate a forge attempt."""
    # 1. Verify axiom integrity
    if not verify_axiom(axiom):
        return False
    
    # 2. Compute HPP-1 key
    key = hpp1_derive_key(axiom, nonce)
    
    # 3. Perform Tetra-PoW rounds
    hash_result = tetrapow_hash(key, rounds=128)
    
    # 4. Check difficulty
    if not meets_difficulty(hash_result, difficulty):
        return False
    
    # 5. Validate zero-torsion
    if not validate_zero_torsion(hash_result):
        return False
    
    return True
```

### Error Handling Pattern (Go)

```go
func ProcessForge(axiom string, nonce int) (*ForgeResult, error) {
    if err := ValidateAxiom(axiom); err != nil {
        return nil, fmt.Errorf("axiom validation failed: %w", err)
    }
    
    result, err := ComputeHash(axiom, nonce)
    if err != nil {
        return nil, fmt.Errorf("hash computation failed: %w", err)
    }
    
    return result, nil
}
```

## Deployment Considerations

- **Docker**: Use provided `Dockerfile` and `docker-compose.yml`
- **Environment Variables**: Never commit `.env` files (use `.env.example`)
- **SSL/TLS**: Always use HTTPS in production
- **Health Checks**: Implement `/health` endpoints for monitoring

## Important Files

- **README.md**: Project overview and getting started
- **ARCHITECTURE.md**: Detailed system architecture
- **CONTRIBUTING.md**: Contribution guidelines
- **QUICKSTART.md**: Quick start guide
- **go.mod**: Go dependencies
- **requirements.txt**: Python dependencies

## AI Assistance Guidelines

When generating code:

1. **Preserve cryptographic integrity**: Never modify HPP-1, Tetra-PoW, or axiom handling
2. **Maintain backward compatibility**: Don't break existing APIs
3. **Follow existing patterns**: Match the style of surrounding code
4. **Test thoroughly**: Include tests for new functionality
5. **Document clearly**: Add comments for complex logic
6. **Consider security**: Apply defense-in-depth principles

## Contact

- **Lead Architect**: Travis D. Jones
- **Email**: holedozer@gmail.com
- **Repository**: https://github.com/Holedozer1229/Excalibur-EXS
- **Website**: https://www.excaliburcrypto.com

---

*"In ambiguity, we find certainty. In chaos, we forge order."*

Remember: The Excalibur protocol is built on rigorous cryptographic principles. Always prioritize security, correctness, and protocol integrity over convenience or performance.
