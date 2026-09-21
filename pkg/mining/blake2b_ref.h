/* BLAKE2b reference implementation (public domain).
 * Vendored for the Omega' D18 C port: OpenSSL provides SHA-256/SHA-512
 * (with SHA-NI dispatch) but not BLAKE2b, so the third fusion leg lives here.
 * Byte-identity against CPython's hashlib.blake2b is enforced by
 * pkg/mining/test_omegaprime_c.py — any transcription error fails loudly.
 */
#ifndef BLAKE2B_REF_H
#define BLAKE2B_REF_H

#include <stddef.h>
#include <stdint.h>

typedef struct blake2b_state {
    uint64_t h[8];
    uint64_t t[2];
    uint64_t f[2];
    uint8_t  buf[128];
    size_t   buflen;
    size_t   outlen;
    uint8_t  last_node;
} blake2b_state;

/* One-shot: outlen must be 1..64. Returns 0 on success, -1 on bad outlen. */
int blake2b_ref(void *out, size_t outlen, const void *in, size_t inlen);

int blake2b_ref_init(blake2b_state *S, size_t outlen);
int blake2b_ref_update(blake2b_state *S, const void *pin, size_t inlen);
int blake2b_ref_final(blake2b_state *S, void *out, size_t outlen);

#endif
