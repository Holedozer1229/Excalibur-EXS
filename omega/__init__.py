"""omega -- ExcalOmega security-rebuild reference implementation.

Standard-library-only Python package implementing the reviewed
primitives the rebuild specification requires before any security
claim: secp256k1 arithmetic, BIP-340 Schnorr signatures, BIP-341
Taproot construction, Bech32/Bech32m encoding, CSPRNG-only key
generation, and the HTLC v1 leaf/commitment.

Status: EXPERIMENTAL reference code. Every function in this
package is pinned against official BIP-340 / BIP-341 / BIP-350
test vectors in ``tests/test_omega_*.py``. The code is not
constant-time, has not had an independent cryptographic review,
and must not hold real funds. It exists to replace the unsafe
wallet/vault/tweak code paths documented in
``docs/EXS_REPRODUCED_AUDIT_2026-11-23.md`` with something
testable -- not to certify the rebuild as production-ready.

Hard rules enforced here:
- No key is ever derived from the public prophecy, public genesis
  data, timestamps, nonces, or public salts.
- No secret is ever printed or logged by this package.
- No floating-point arithmetic in any consensus-relevant path.
- No mock signatures, synthetic approvals, or simulated FROST.
"""

__all__ = ["bip340", "bip341", "bech32", "htlc", "secp256k1", "wallet"]
