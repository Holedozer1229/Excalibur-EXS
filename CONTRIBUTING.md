# Contributing to Excalibur $EXS

Thank you for your interest in contributing to the Excalibur $EXS Protocol! This document provides guidelines for participating in the project.

## The Sacred Axiom

```
sword legend pull magic kingdom artist stone destroy forget fire steel honey question
```

All forge attempts must use this canonical 13-word sequence.

## How to Contribute

### 1. Forge Participation

To submit a successful forge claim:

1. Run the Ω′ Δ18 miner:
   ```bash
   # Go miner (recommended for production)
   cd miners/tetra-pow-go
   go build -o tetra-pow-miner
   ./tetra-pow-miner mine \
     --data "sword legend pull magic kingdom artist stone destroy forget fire steel honey question" \
     --difficulty 4
   
   # OR Python miner (for development/testing)
   cd miners/tetra-pow-python
   python3 tetra_pow_miner.py \
     --axiom "sword legend pull magic kingdom artist stone destroy forget fire steel honey question" \
     --difficulty 4
   ```

2. When you find a valid nonce, create a Pull Request to the `main` (Camelot) branch with:
   - **Title:** `Forge Claim: Nonce [YOUR_NONCE]`
   - **Description:** Include your nonce, miner address, and proof details

3. The GitHub Action "Forge Trigger" will automatically validate your claim

4. If valid, your forge will be merged and you'll receive 49.5 $EXS (after 1% treasury fee)

### 2. Contributing New Miners

We welcome new consensus algorithms and mining implementations! See [`miners/README.md`](miners/README.md) for detailed guidelines.

**Quick checklist:**
- Create directory under `miners/` with descriptive name
- Implement algorithm with clear documentation
- Ensure compatibility with axiom system and P2TR vaults
- Add comprehensive README with usage examples
- Include performance benchmarks
- Submit PR with tests

### 3. Code Contributions

We welcome improvements to:
- Mining algorithm optimizations
- UI/UX enhancements for the Double-Portal Architecture
- Treasury management features
- Documentation improvements

**Process:**
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes with clear commit messages
4. Submit a Pull Request with a detailed description

### 3. Bug Reports

Found a bug? Please open an issue with:
- Clear description of the problem
- Steps to reproduce
- Expected vs. actual behavior
- System information (OS, Python/Go version, etc.)

### 4. Security Vulnerabilities

**DO NOT** open public issues for security vulnerabilities. Instead, email directly to:
- **Travis D. Jones**: holedozer@icloud.com

We take security seriously and will respond promptly.

## Development Guidelines

### Python Code (Miner & Foundry)
- Follow PEP 8 style guidelines
- Include docstrings for all functions
- Add type hints where appropriate
- Test with Python 3.10+

### Go Code (Treasury & Backend)
- Follow Go standard formatting (`go fmt`)
- Write clear, idiomatic Go code
- Include comments for exported functions
- Test with Go 1.21+

### Web Code (Portals)
- Use semantic HTML
- Keep JavaScript vanilla (no framework dependencies for now)
- Ensure mobile responsiveness
- Test in multiple browsers

## Code Review Process

1. All PRs require review before merging
2. Forge claims are automatically validated by GitHub Actions
3. Code contributions reviewed by Lead Architect or designated maintainers
4. Be responsive to feedback and questions

## Coding Standards

### Git Commits
- Use clear, descriptive commit messages
- Start with a verb: "Add", "Fix", "Update", "Remove"
- Reference issue numbers when applicable

Example:
```
Add difficulty adjustment API endpoint

Implements the difficulty adjustment feature for Merlin's Portal.
Closes #123
```

### Documentation
- Update README.md for major changes
- Add inline comments for complex logic
- Update CHANGELOG.md (when available)

## Community Guidelines

### Be Respectful
- Treat all community members with respect
- Welcome newcomers and help them get started
- Provide constructive feedback

### Be Professional
- Keep discussions on-topic
- Avoid inflammatory or off-topic comments
- Focus on the code, not the person

### Be Collaborative
- Share knowledge and help others learn
- Credit others for their contributions
- Work together towards common goals

## Economic Participation

### Tokenomics Overview
- **Supply Cap:** 21,000,000 $EXS
- **Forge Reward:** 50 $EXS (49.5 $EXS to miner after 1% treasury fee)
- **Distribution:** 60% PoF, 15% Treasury, 20% Liquidity, 5% Airdrop

### Fee Structure
- **Treasury Fee:** 1% of all forge rewards
- **Forge Fee:** 0.0001 BTC per forge submission

## Getting Help

### Resources
- **Repository:** https://github.com/Holedozer1229/Excalibur-EXS
- **Issues:** https://github.com/Holedozer1229/Excalibur-EXS/issues
- **Email:** holedozer@icloud.com

### Questions?
- Open a GitHub issue with the `question` label
- Email the Lead Architect: holedozer@icloud.com

## License

By contributing to Excalibur $EXS, you agree that your contributions will be licensed under the BSD 3-Clause License.

---

## The Excalibur Creed

> *"Only those who prove their worth through ancient axioms may draw the sword from the stone."*

Let's build the future of decentralized proof systems together!

**Lead Architect:** Travis D. Jones  
**Email:** holedozer@icloud.com  
**Protocol:** Excalibur $EXS  
**Version:** 1.0.0

---

*Thank you for contributing to Excalibur $EXS!*
