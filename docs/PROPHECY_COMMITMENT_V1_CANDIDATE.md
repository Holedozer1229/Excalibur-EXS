# EXS Prophecy Commitment — Candidate Vector v1

**Status:** Frozen candidate vector for review; **not yet activated as consensus**.  
**Source rationale:** The genesis document's example defines SHA-256 over the normalized 13-word axiom. The published axiom is already lowercase and single-spaced, so raw exact-byte SHA-256 and that normalization produce the same bytes.

## Canonical candidate input

- Encoding: UTF-8
- Exact text (no leading/trailing whitespace, no newline):

```text
sword legend pull magic kingdom artist stone destroy forget fire steel honey question
```

- Byte length: 85
- Normalization: none; the exact bytes above are authoritative
- Candidate digest: SHA-256(exact UTF-8 bytes)

```text
87da299f5969e0e38e85840ff13b9aef2044dbfcfed1295a6d042a3bcc6b9181
```

This digest is named `EXS_PROPHECY_SHA256_V1_CANDIDATE`. It is a commitment to the exact public text only. It is not a signature, secret, wallet seed, proof of truth, or generic hash primitive. Other protocol hashes and signatures must use their own explicit domain tags and canonical serialization.

## Competing encodings (negative / diagnostic vectors)

| Construction | Digest |
|---|---|
| SHA-256(exact UTF-8 text) | `87da299f5969e0e38e85840ff13b9aef2044dbfcfed1295a6d042a3bcc6b9181` |
| SHA-256(text with all spaces removed) | `bae594495c21f9ba2a0707f56e31f92f763d4570da174e8f28b629c72b5a6e79` |
| SHA-512(exact UTF-8 text) | `96b294662809fd0f2161b82e99c17d5dd0298acf67c121139f06801c1491ebf9ef29b7cf86d1387f4e0f35a07b752fe261ce5049328114d15adcecba705a94e4` |
| SHA-512(text with all spaces removed) | `88c11dc1c4a2b18fd65d94c5de70a7b12cb4e4de8c3b17fd0a01ce7890505b6c987cda46e5a5bece7eb765692b712cb7fef85673195b1b8357b5dbaafa227504` |

Only the first row is the selected candidate. The other rows exist to detect accidental encoding drift.

## Sovereign seed vector (separate from the prophecy digest)

```text
PBKDF2-HMAC-SHA512(
  password = exact axiom UTF-8 bytes,
  salt     = "EXCALIBUR-SOVEREIGN-GENESIS-v1",
  iterations = 600000,
  dklen = 32
)
= 582946fd65d357fa6d73dbf071fe70f2a2698ec253a6bec584a86ef500bcfa2d
```

This value was independently recomputed with Python's standard-library `hashlib.pbkdf2_hmac` in this review. Because both the password and salt are public, this seed is public and deterministic. It must never be used as private-key material.

## Activation gate

Before this candidate becomes a consensus rule:
1. Two independent implementations must reproduce the exact byte length and all digests.
2. A committed test must reject a missing/extra space, case change, newline, or changed word.
3. The genesis schema must identify this value by an explicit field name and version.
4. Protocol reviewers must approve whether the untagged legacy digest is retained as a dedicated genesis field. It must not be reused as a generic commitment or signature domain.
5. No genesis block may be mined or funded merely because this vector passes.
