# Contributing to Excalibur $EXS Protocol

Thank you for your interest in contributing to the Excalibur $EXS Protocol! This document provides guidelines for contributing to the project.

## 🎯 Vision

The Excalibur $EXS Protocol embodies the spirit of King Arthur's legend—only those worthy enough can draw the sword from the stone. We welcome contributions that align with this vision of:
- Decentralization and fairness
- Strong cryptographic security
- Quantum resistance
- Privacy and sovereignty
- Legendary craftsmanship in code

## 🔱 Ways to Contribute

### 1. Code Contributions
- Bug fixes
- Feature enhancements
- Performance optimizations
- Security improvements
- Documentation updates

### 2. Testing
- Running test forges
- Reporting bugs
- Validating the Ω′ Δ18 algorithm
- Stress testing the network

### 3. Documentation
- Improving README files
- Writing tutorials
- Creating examples
- Translating documentation

### 4. Community
- Answering questions
- Participating in discussions
- Spreading the word about $EXS

## 🚀 Getting Started

### Prerequisites
- Python 3.11+
- Go 1.21+ (for treasury backend)
- Git
- Basic understanding of cryptography and blockchain

### Setup Development Environment

```bash
# Clone the repository
git clone https://github.com/Holedozer1229/Excalibur-EXS.git
cd Excalibur-EXS

# Test the miner
python pkg/miner/tetra_pow_miner.py

# Test the foundry
python pkg/foundry/exs_foundry.py

# Build treasury (Go)
cd pkg/economy
go build treasury.go
```

## 📝 Contribution Process

### 1. Fork the Repository
Fork the Excalibur-EXS repository to your GitHub account.

### 2. Create a Branch
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

Branch naming convention:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions or modifications

### 3. Make Your Changes
- Write clean, readable code
- Follow existing code style
- Add comments where necessary
- Update documentation as needed

### 4. Test Your Changes
```bash
# Test Python components
python pkg/miner/tetra_pow_miner.py
python pkg/foundry/exs_foundry.py

# Build Go components
cd pkg/economy && go build treasury.go
```

### 5. Commit Your Changes
```bash
git add .
git commit -m "Brief description of changes"
```

Commit message format:
- Use present tense ("Add feature" not "Added feature")
- Use imperative mood ("Move cursor to..." not "Moves cursor to...")
- First line should be a brief summary (50 chars or less)
- Add detailed explanation in subsequent lines if needed

### 6. Push to Your Fork
```bash
git push origin feature/your-feature-name
```

### 7. Create a Pull Request
- Go to the original Excalibur-EXS repository
- Click "New Pull Request"
- Select your fork and branch
- Fill out the PR template with details about your changes
- Wait for review

## ✅ Code Review Process

1. **Automated Checks**: The Forge EXS workflow will run automatically
   - Prophecy axiom validation
   - Ω′ Δ18 miner execution
   - HPP-1 foundry processing
   - Treasury fee validation

2. **Manual Review**: Project maintainers will review your code for:
   - Code quality and style
   - Security considerations
   - Performance implications
   - Documentation completeness

3. **Feedback**: Address any requested changes

4. **Merge**: Once approved, your PR will be merged into the main branch

## 🎨 Code Style Guidelines

### Python
- Follow PEP 8 style guide
- Use type hints where appropriate
- Document classes and functions with docstrings
- Keep functions focused and single-purpose

```python
def calculate_treasury_fee(base_reward: Decimal, fee_rate: Decimal) -> Decimal:
    """
    Calculate the treasury fee for a forge reward.
    
    Args:
        base_reward: The base forge reward in $EXS
        fee_rate: The treasury fee rate (e.g., 0.01 for 1%)
        
    Returns:
        The calculated treasury fee amount
    """
    return base_reward * fee_rate
```

### Go
- Follow Go standard formatting (`gofmt`)
- Use meaningful variable names
- Document exported functions and types
- Handle errors appropriately

```go
// ProcessForge calculates and collects fees for a completed forge
func (tm *TreasuryManager) ProcessForge(minerAddress string) (*ForgeResult, error) {
    if minerAddress == "" {
        return nil, fmt.Errorf("invalid miner address")
    }
    // ... implementation
}
```

### JavaScript
- Use ES6+ features
- Use `const` and `let` instead of `var`
- Use meaningful variable names
- Add comments for complex logic

```javascript
/**
 * Verify the 13-word prophecy axiom
 * @param {string} userAxiom - The axiom entered by the user
 * @returns {boolean} - True if axiom is correct
 */
function verifyAxiom(userAxiom) {
    return userAxiom.trim().toLowerCase() === CORRECT_AXIOM.toLowerCase();
}
```

## 🔐 Security Guidelines

- **Never** commit private keys or secrets
- Use secure random number generation
- Validate all inputs
- Follow cryptographic best practices
- Report security vulnerabilities privately to holedozer@gmail.com

## 🧪 Testing Guidelines

- Write tests for new features
- Ensure existing tests pass
- Test edge cases
- Document test scenarios

## 📚 Documentation Guidelines

- Update README.md if adding new features
- Add inline comments for complex logic
- Create examples for new functionality
- Keep documentation up-to-date

## 🤝 Code of Conduct

### Our Standards
- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Collaborate openly
- Maintain professionalism

### Unacceptable Behavior
- Harassment or discrimination
- Trolling or insulting comments
- Personal attacks
- Publishing others' private information
- Unethical or illegal activity

## 📞 Getting Help

- **Issues**: Use GitHub Issues for bug reports and feature requests
- **Discussions**: Use GitHub Discussions for questions and ideas
- **Email**: Contact Travis D Jones at holedozer@gmail.com for sensitive matters

## 📜 License

By contributing to Excalibur $EXS Protocol, you agree that your contributions will be licensed under the BSD 3-Clause License.

## 🏆 Recognition

Contributors will be recognized in:
- The project README
- Release notes
- The Hall of Knights (contributors page)

---

## Special Notes for Forge Claims

If you're submitting a forge claim (proof-of-work):

1. Create your submission in `claims/` directory
2. Include:
   - The axiom used
   - The nonce found
   - The resulting hash
   - Your P2TR address
3. The GitHub Action will automatically validate your forge
4. Successful forges will be recorded in the blockchain

---

Thank you for contributing to the Excalibur $EXS Protocol! Together, we forge the future of decentralized finance.

*"Only the worthy may draw the sword"*
