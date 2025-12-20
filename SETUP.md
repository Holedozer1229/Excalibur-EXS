# 🗡️ Excalibur $EXS Repository Setup Guide

This document outlines the critical repository settings required for the **$EXS Protocol** to function properly, especially for Coinbase listing compliance and security.

## Required GitHub Repository Settings

### 1. Repository Description & Topics

**Repository Description:**
```
$EXS Protocol: The Arthurian-Axiomatic Bitcoin Taproot Generator. Powered by the Ω′ Δ18 Tetra-PoW Miner. Forge unique, unlinkable vault identities on the Bitcoin Ambiguity Fork through quantum-temporal entropy stretching.
```

**Topics/Tags to Add:**
- `bitcoin`
- `taproot`
- `cryptography`
- `proof-of-work`
- `rosetta-api`
- `blockchain-ambiguity`
- `excalibur-exs`

**How to Set:**
1. Go to the repository homepage
2. Click the ⚙️ gear icon next to "About"
3. Paste the description
4. Add the topics/tags
5. Click "Save changes"

---

### 2. 🛡️ Branch Protection (CRITICAL - Main Branch Protection)

**Purpose:** Prevents unauthorized modifications to the "Foundry" code without passing validation tests. This is essential for maintaining protocol integrity.

**Configuration Path:** `Settings` → `Branches` → `Add rule`

**Required Settings:**
1. **Branch name pattern:** `main`
2. **Enable the following protections:**
   - ✅ **Require a pull request before merging**
     - Require approvals: `1` (recommended)
   - ✅ **Require status checks to pass before merging**
     - If you have workflows, select them as required checks
   - ✅ **Require conversation resolution before merging** (recommended)
   - ✅ **Do not allow bypassing the above settings** (recommended for production)

**Why This Matters:**
- Protects against direct pushes to main branch
- Ensures all changes go through pull request review
- Maintains code quality through automated checks
- Critical for Coinbase compliance and audit trails

**Manual Steps:**
1. Go to repository `Settings`
2. Navigate to `Branches` in the left sidebar
3. Click `Add rule` or `Add branch protection rule`
4. Enter `main` as the branch name pattern
5. Enable the checkboxes listed above
6. Click `Create` or `Save changes`

---

### 3. GitHub Actions (The Webhook)

**Purpose:** Allows the `.github/workflows/forge-exs.yml` to run the Ω′ Δ18 Miner whenever a user submits a "Claim" (Pull Request).

**Configuration Path:** `Settings` → `Actions` → `General`

**Required Setting:**
- Set to **"Allow all actions and reusable workflows"**

**Manual Steps:**
1. Go to repository `Settings`
2. Click `Actions` in the left sidebar
3. Click `General`
4. Under "Actions permissions", select **"Allow all actions and reusable workflows"**
5. Click `Save`

---

### 4. Secret Management (The Anomaly)

**Purpose:** Securely store the axiom seed phrase for workflow reference without hardcoding it into scripts.

**Configuration Path:** `Settings` → `Secrets and variables` → `Actions`

**Required Secret:**
- **Name:** `EXS_AXIOM`
- **Value:** `sword legend pull magic kingdom artist stone destroy forget fire steel honey question`

**Manual Steps:**
1. Go to repository `Settings`
2. Navigate to `Secrets and variables` → `Actions`
3. Click `New repository secret`
4. Enter name: `EXS_AXIOM`
5. Enter the value above
6. Click `Add secret`

**Note:** Even though the axiom is considered "public" in the protocol context, storing it as a secret allows workflows to reference it securely and prevents accidental exposure in logs.

---

### 5. GitHub Discussions

**Purpose:** Community space for sharing "Prophecies" and discussing the growth of the Ambiguity Fork without cluttering the codebase.

**Configuration Path:** `Settings` → `General` → `Features`

**Required Setting:**
- ✅ Enable **"Discussions"**

**Manual Steps:**
1. Go to repository `Settings`
2. Scroll to the `Features` section
3. Check the box next to **"Discussions"**
4. Click `Save changes` if prompted

---

## Business Strategy Summary

By implementing these settings, the **$EXS Protocol** achieves:

1. ✅ **Trust:** Coinbase sees a standard, professional, permissive license (BSD 3-Clause)
2. ✅ **Brand Integrity:** Protected against unauthorized use of "Excalibur" and "$EXS" trademarks
3. ✅ **Open Source Growth:** Encourages developers to build on the protocol while preventing brand hijacking
4. ✅ **Security:** Branch protection ensures code integrity and audit compliance
5. ✅ **Automation:** GitHub Actions enable the Proof-of-Forge (PoF) consensus mechanism

---

## Verification Checklist

After completing the setup, verify the following:

- [ ] Repository description is set correctly
- [ ] All 7 topics/tags are added
- [ ] Main branch protection rule is active
- [ ] GitHub Actions are enabled
- [ ] `EXS_AXIOM` secret is created
- [ ] GitHub Discussions are enabled
- [ ] LICENSE file contains BSD 3-Clause text
- [ ] README.md displays the "Oath" section

---

## Support

For technical questions about the protocol architecture or setup issues, use GitHub Discussions or open an issue with the `setup` label.

**Remember:** The integrity of the Excalibur $EXS protocol depends on proper repository configuration. These settings are not optional—they are foundational to the Proof-of-Forge consensus mechanism.
