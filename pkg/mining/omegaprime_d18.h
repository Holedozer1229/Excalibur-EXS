/* Omega' D18 consensus kernel — C port on the Annunaki SHA-NI powerhouse.
 *
 * Byte-identical to pkg/mining/tetrapow_dice_universal.py's
 * UniversalMiningKernel.batch_nonlinear_transform with the default
 * fusion_sequence ['sha512','sha256','blake2b'] and rounds=128, followed by
 * the final sha256. Concretely, per (daxiom, nonce):
 *
 *     state_0 = "<daxiom>:<nonce>"            (ASCII)
 *     state_r = blake2b-256( SHA256( SHA512( state_{r-1} || ascii(r) ) ) ),
 *               r = 1..128
 *     final   = SHA256( state_128 )
 *
 * The Python kernel's XOR-fold step is a no-op here (blake2b-256 emits
 * exactly 32 bytes, so `folded = state`), and is omitted.
 *
 * Legs: SHA-512 via OpenSSL one-shot (no SHA-NI exists for SHA-512;
 * OpenSSL's asm path is the fastest available), SHA-256 via the Annunaki
 * hand-rolled SHA-NI compression (annunaki_shani.c), BLAKE2b via the
 * vendored public-domain reference (blake2b_ref.c).
 *
 * Consensus safety: the Python kernel remains the consensus oracle.
 * test_omegaprime_c.py enforces byte-identity on random vectors plus the
 * known difficulty-2 genesis vector (nonce 12992). Any divergence fails
 * loudly; this C code must never be "fixed" to differ from Python.
 */
#ifndef OMEGAPRIME_D18_H
#define OMEGAPRIME_D18_H

#include <stddef.h>
#include <stdint.h>

#define OMEGAPRIME_ROUNDS 128

/* Hash one (daxiom, nonce) pair. out must hold 32 bytes. */
void omegaprime_hash(const char *daxiom, uint64_t nonce, uint8_t out[32]);

/* Grind nonces [start, start+count): first hash with `difficulty` leading
 * zero bytes wins. Returns 1 on hit (fills found_nonce/found_hash),
 * 0 if the range is exhausted. */
int omegaprime_grind(const char *daxiom, uint64_t start, uint64_t count,
                     int difficulty, uint64_t *found_nonce,
                     uint8_t found_hash[32]);

#endif
