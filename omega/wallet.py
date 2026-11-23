"""omega.wallet -- secure key generation for the ExcalOmega rebuild.

Hard rules (from the rebuild specification, section 5.1):
- Signing keys come ONLY from the operating system's
  cryptographically secure random number generator (``secrets``).
- The public 13-word prophecy, public genesis data, timestamps,
  nonces, block hashes and public salts are NEVER key material.
  This module exposes no function that derives a key from any of
  them; there is no ``derive_from_axiom`` / ``derive_from_seed``
  entry point by design.
- No function in this module prints, logs or returns a secret
  alongside a public value. Secret keys are returned as bare
  bytes to the caller, which owns secure handling and zeroisation.
- Taproot tweaking uses BIP-341 (see :mod:`omega.bip341`); the
  tweaked key is derived from the random internal key, never from
  a public value.

This is key-generation plumbing for tests and for the future
wallet implementation. It is not a wallet file format, not a
backup/encryption scheme, and not production custody.
"""

import secrets

from .bip340 import pubkey_gen
from .bip341 import tweak_privkey
from .secp256k1 import N

SECRET_KEY_BYTES = 32


def generate_secret_key():
    """Generate a fresh 32-byte secret key from OS CSPRNG entropy.

    Rejection-samples until ``1 <= d < n``. Every call returns an
    independent key; nothing about the key is derived from any
    public input.
    """
    while True:
        candidate = secrets.token_bytes(SECRET_KEY_BYTES)
        if 1 <= int.from_bytes(candidate, "big") <= N - 1:
            return candidate


def public_key(secret_key):
    """32-byte x-only public key for a secret key (BIP-340)."""
    return pubkey_gen(secret_key)


def generate_keypair():
    """``(secret_key, public_key)`` from fresh CSPRNG entropy."""
    secret = generate_secret_key()
    return secret, pubkey_gen(secret)


def taproot_keypair(merkle_root=None):
    """Fresh random internal keypair tweaked for a Taproot output.

    Returns ``(tweaked_secret_key, internal_pubkey, output_pubkey,
    tweak)``. The internal key is random; the tweak commits it to
    the (optional) script tree via BIP-341. The tweaked secret key
    is the key-path signing key for the resulting P2TR output.
    """
    secret = generate_secret_key()
    tweaked, internal_pubkey, tweak = tweak_privkey(secret, merkle_root)
    from .bip341 import taproot_output_key

    _, output_pubkey, _ = taproot_output_key(internal_pubkey, merkle_root)
    return tweaked, internal_pubkey, output_pubkey, tweak
