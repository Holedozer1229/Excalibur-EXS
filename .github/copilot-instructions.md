# Copilot Instructions for Excalibur-EXS

## Project Overview

Excalibur-EXS ($EXS) is a quantum-hardened, ambiguity-focused cryptocurrency fork of Bitcoin utilizing the pioneering **Ω′ Δ18 Tetra-PoW** mining algorithm. The project emphasizes security, privacy, and institutional compatibility through Taproot (P2TR) vaults and the sacred 13-word prophecy axiom.

**Core Technologies:**
- **Backend:** Go 1.21+ for treasury, Rosetta API, and core services
- **Mining/Foundry:** Python 3.10+ for cryptographic operations
- **Frontend:** React/TypeScript (Next.js) for web portals
- **Mobile:** React Native for iOS/Android apps

## Architecture

### Key Components

1. **Mining Layer** (`pkg/miner/`, `cmd/miner/`)
   - Ω′ Δ18 Tetra-PoW: 128-round nonlinear mining algorithm
   - HPP-1 quantum-hardening: 600,000 PBKDF2-HMAC-SHA512 rounds
   - Provably fair dice mining system

2. **Cryptography** (`pkg/crypto/`, `pkg/foundry/`)
   - Bitcoin Taproot (P2TR) vault generation
   - Deterministic axiomatic address generation
   - HPP-1 protocol implementation

3. **Economic Layer** (`pkg/economy/`)
   - Tokenomics: 21M $EXS total supply, 50 $EXS forge reward
   - Treasury management with time-locked outputs
   - Multi-stream revenue management

4. **Rosetta API** (`pkg/rosetta/`, `cmd/rosetta/`)
   - v1.4.10 standard for institutional integration
   - Network, account, and construction endpoints
   - Exchange and cross-platform compatibility

5. **Web Portals** (`web/`, `admin/`)
   - Knights' Round Table: Public forge UI
   - Merlin's Portal: Admin dashboard for treasury monitoring

6. **Mobile App** (`mobile-app/`)
   - Cross-platform React Native application
   - Axiom challenge and forge tracking

## The Sacred 13-Word Axiom

**IMPORTANT:** All forge operations MUST use this canonical sequence:
```
sword legend pull magic kingdom artist stone destroy forget fire steel honey question
```

Never modify, substitute, or accept alternative axiom sequences.

## Coding Standards

### Go (Backend, Treasury, Rosetta)

- **Version:** Go 1.21+
- **Style:** Follow standard Go formatting (`go fmt`)
- Write idiomatic Go code
- Include comments for all exported functions, types, and constants
- Use meaningful variable names (avoid single-letter except for loops)
- Error handling: Always check and handle errors appropriately
- Testing: Write table-driven tests when appropriate

**Example:**
```go
// GenerateVault creates a new Taproot vault using HPP-1 protocol
func GenerateVault(axiom string, network *chaincfg.Params) (*Vault, error) {
    if axiom != CanonicalAxiom {
        return nil, ErrInvalidAxiom
    }
    // Implementation...
}
```

### Python (Mining, Foundry, Revenue)

- **Version:** Python 3.10+
- **Style:** Follow PEP 8 guidelines strictly
- Include docstrings for all functions, classes, and modules
- Use type hints for function parameters and return values
- Keep functions focused and single-purpose
- Use descriptive variable names
- Testing: Use unittest or pytest frameworks

**Example:**
```python
def tetra_pow_hash(data: bytes, rounds: int = 128) -> bytes:
    """
    Compute Tetra-PoW hash with nonlinear state shifts.
    
    Args:
        data: Input data to hash
        rounds: Number of mining rounds (default: 128)
    
    Returns:
        The computed hash as bytes
    """
    # Implementation...
```

### TypeScript/JavaScript (Web Portals)

- **Version:** TypeScript 5.0+, Node.js 18+
- Use TypeScript for type safety
- Follow React best practices (functional components, hooks)
- Use semantic HTML for accessibility
- Ensure mobile responsiveness
- Keep components focused and reusable
- Testing: Use Jest and React Testing Library

**Example:**
```typescript
interface ForgeResult {
  nonce: number;
  vault: string;
  reward: number;
}

const ForgeInitiation: React.FC = () => {
  // Component implementation...
};
```

### React Native (Mobile)

- Follow React Native best practices
- Test on both iOS and Android platforms
- Use platform-specific code when necessary
- Ensure dark theme consistency with Arthurian aesthetic

## Security Considerations

### Critical Security Requirements

1. **Never commit secrets or private keys** to the repository
2. **Always validate the 13-word axiom** before processing forge operations
3. **Use quantum-hardened cryptography** (600,000 PBKDF2 iterations)
4. **Validate all Taproot addresses** using proper bech32m encoding
5. **Sanitize all user inputs** to prevent injection attacks
6. **Use parameterized queries** for any database operations
7. **Implement rate limiting** for API endpoints
8. **Follow principle of least privilege** for access controls

### Vulnerability Prevention

- **Cross-Site Scripting (XSS):** Sanitize all HTML output, use React's built-in protections
- **SQL Injection:** Use parameterized queries (though this project uses file-based storage primarily)
- **Command Injection:** Never pass unsanitized user input to shell commands
- **Path Traversal:** Validate and sanitize all file paths
- **Cryptographic Weaknesses:** Always use the HPP-1 protocol, never reduce iteration counts

## Testing Practices

### Running Tests

**Go Tests:**
```bash
go test ./pkg/... -v
```

**Integration Tests:**
```bash
./test.sh
```

**Miner Benchmark:**
```bash
cd cmd/miner
go run main.go benchmark --rounds 1000
```

**Web UI Development:**
```bash
cd web/forge-ui
npm install
npm run dev
```

### Test Requirements

- Write unit tests for all new functionality
- Maintain or improve code coverage
- Test edge cases and error conditions
- Include integration tests for API endpoints
- Test cryptographic operations with known test vectors
- Validate Taproot address generation against Bitcoin test vectors

## Build and Deployment

### Local Development

**Build Go binaries:**
```bash
cd cmd/miner && go build
cd cmd/rosetta && go build
```

**Run Rosetta API:**
```bash
cd cmd/rosetta
./rosetta serve --port 8080 --network mainnet
```

**Test health endpoint:**
```bash
curl http://localhost:8080/health
```

### Deployment Options

- **Docker:** `docker-compose up -d` (see `DOCKER_DEPLOY.md`)
- **Vercel:** For web portals (see `VERCEL_DEPLOY.md`)
- **GitHub Pages:** For static content (see `GITHUB_PAGES_DEPLOY.md`)
- **VPS:** Traditional deployment (see `DEPLOY.md`)

### CI/CD

GitHub Actions workflows:
- `.github/workflows/forge-exs.yml`: Validates forge claims
- `.github/workflows/deploy-pages.yml`: Deploys to GitHub Pages

## Documentation Standards

- Update README.md for major feature changes
- Add inline comments for complex cryptographic logic
- Document API endpoints in `docs/rosetta.md`
- Keep CONTRIBUTING.md up-to-date with process changes
- Use clear, technical language
- Include code examples where helpful

## Git Practices

### Commit Messages

Use clear, descriptive commit messages:
- Start with a verb: "Add", "Fix", "Update", "Remove"
- Keep first line under 72 characters
- Reference issue numbers when applicable

**Examples:**
```
Add difficulty adjustment API endpoint

Implements the difficulty adjustment feature for Merlin's Portal.
Closes #123
```

```
Fix Taproot address validation for testnet

Corrects bech32m encoding validation to support testnet addresses.
```

### Branch Naming

- Feature branches: `feature/short-description`
- Bug fixes: `fix/issue-description`
- Forge claims: `forge/nonce-XXXXX`

## Common Patterns and Conventions

### Error Handling

**Go:**
```go
if err != nil {
    return fmt.Errorf("failed to generate vault: %w", err)
}
```

**Python:**
```python
try:
    result = compute_hash(data)
except CryptoError as e:
    logger.error(f"Hash computation failed: {e}")
    raise
```

### Logging

- Use structured logging where possible
- Log at appropriate levels (DEBUG, INFO, WARN, ERROR)
- Include context in log messages
- Never log sensitive data (keys, seeds, passwords)

### Configuration

- Use environment variables for configuration
- Provide `.env.example` for required variables
- Never commit actual `.env` files
- Use `config.yaml` for structured configuration (see `cmd/lancelot_guardian/config.yaml`)

## Project-Specific Patterns

### Tetra-PoW Mining

Always use 128 rounds for production:
```python
nonce = tetra_pow_mine(axiom_hash, difficulty=4, rounds=128)
```

### Taproot Vault Generation

Follow HPP-1 protocol strictly:
```go
vault, err := hpp1.DeriveVault(axiom, network, iterations=600000)
```

### Treasury Allocation

Respect the 15% treasury allocation with time-locked outputs:
- Output 1: 2.5 $EXS (immediate)
- Output 2: 2.5 $EXS (locked ~1 month)
- Output 3: 2.5 $EXS (locked ~2 months)

## Resources

- **Whitepaper:** `docs/manifesto.md`
- **Rosetta API Specs:** `docs/rosetta.md`
- **Contributing Guide:** `CONTRIBUTING.md`
- **Repository:** https://github.com/Holedozer1229/Excalibur-EXS
- **Issues:** https://github.com/Holedozer1229/Excalibur-EXS/issues
- **Lead Architect:** Travis D. Jones (holedozer@gmail.com)

## When Working on Issues

1. **Understand the full context** before making changes
2. **Make minimal, focused changes** that address the specific issue
3. **Test thoroughly** using existing test infrastructure
4. **Follow existing patterns** in the codebase
5. **Update documentation** if your changes affect public APIs or usage
6. **Consider security implications** of all changes
7. **Respect the sacred axiom** - never modify the 13-word sequence

## Key Principles

- **Security First:** Quantum-hardened cryptography is non-negotiable
- **Privacy Matters:** Taproot unlinkability is a core feature
- **Institutional Grade:** Rosetta API compatibility is essential
- **The Axiom is Sacred:** The 13-word sequence must never change
- **Test Everything:** Cryptographic operations require rigorous testing
- **Document Clearly:** Complex algorithms need clear explanations

---

*"In ambiguity, we find certainty. In chaos, we forge order."*

Forge your code with precision and honor the Excalibur protocol.
