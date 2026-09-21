/* Omega' D18 C port — see omegaprime_d18.h for the consensus contract. */
#include "omegaprime_d18.h"
#include "annunaki_shani.h"
#include "blake2b_ref.h"

#include <openssl/sha.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* One fusion round: out32 = blake2b-256(sha256-ni(sha512-ossl(in || ascii(r)))) */
static void fusion_round(const uint8_t *in, size_t inlen, int round,
                         uint8_t out32[32])
{
    /* inlen is 32 for rounds 2..128, but round 1 consumes the full ASCII
       preimage ("<daxiom>:<nonce>"), whose length depends on the block
       format -- heap-allocate so long preimages cannot smash the stack. */
    size_t buflen = inlen + 16;
    uint8_t *buf = (uint8_t *)malloc(buflen);
    uint8_t h512[64], h256[32];
    if (!buf) {
        fprintf(stderr, "omegaprime: out of memory\n");
        abort();
    }

    memcpy(buf, in, inlen);
    int rlen = snprintf((char *)buf + inlen, buflen - inlen, "%d", round);

    SHA512(buf, inlen + (size_t)rlen, h512);      /* OpenSSL asm path */
    annunaki_sha256(h512, 64, h256);             /* Annunaki SHA-NI */
    blake2b_ref(out32, 32, h256, 32);            /* vendored reference */
    free(buf);
}

void omegaprime_hash(const char *daxiom, uint64_t nonce, uint8_t out[32])
{
    /* Heap-size the initial preimage: block preimages (~300 bytes) exceed
       the old 256-byte stack buffer. snprintf(NULL,0,...) measures first. */
    int need = snprintf(NULL, 0, "%s:%llu",
                        daxiom, (unsigned long long)nonce);
    if (need < 0) {
        fprintf(stderr, "omegaprime: snprintf failed\n");
        abort();
    }
    char *init = (char *)malloc((size_t)need + 1);
    uint8_t cur[32];
    if (!init) {
        fprintf(stderr, "omegaprime: out of memory\n");
        abort();
    }
    int ilen = snprintf(init, (size_t)need + 1, "%s:%llu",
                        daxiom, (unsigned long long)nonce);

    /* round 1 consumes the ASCII preimage; rounds 2..128 consume 32 bytes */
    fusion_round((uint8_t *)init, (size_t)ilen, 1, cur);
    for (int r = 2; r <= OMEGAPRIME_ROUNDS; r++)
        fusion_round(cur, 32, r, cur);

    annunaki_sha256(cur, 32, out);
    free(init);
}

int omegaprime_grind(const char *daxiom, uint64_t start, uint64_t count,
                     int difficulty, uint64_t *found_nonce,
                     uint8_t found_hash[32])
{
    uint8_t h[32];
    for (uint64_t i = 0; i < count; i++) {
        uint64_t n = start + i;
        omegaprime_hash(daxiom, n, h);
        int ok = 1;
        for (int d = 0; d < difficulty; d++) {
            if (h[d] != 0) { ok = 0; break; }
        }
        if (ok) {
            *found_nonce = n;
            memcpy(found_hash, h, 32);
            return 1;
        }
    }
    return 0;
}
