/* Annunaki SHA-NI powerhouse — see annunaki_shani.h.
 * Compression core is verbatim from ~/workspace/aethernet/shani_grind.c.
 * Compile with -msha (implied by -march=native on this box).
 */
#include "annunaki_shani.h"
#include <immintrin.h>
#include <string.h>

static const uint32_t K[64] = {
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
};

static const uint32_t SHANI_IV[8] = {
    0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,
    0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19
};

static inline uint32_t rotr(uint32_t x, int n) { return (x >> n) | (x << (32 - n)); }

/* compress one 64-byte block (16 big-endian words) into st[8]; updates st.
 * Lane semantics verbatim from shani_grind.c:
 *   a=SRC2 lane3, b=lane2, e=lane1, f=lane0 ; c=SRC1 lane3, d=lane2, g=lane1, h=lane0
 */
static void shani_compress(const uint32_t blk[16], uint32_t st[8]) {
    uint32_t W[64];
    for (int i = 0; i < 16; i++) W[i] = blk[i];
    for (int i = 16; i < 64; i++) {
        uint32_t s0 = rotr(W[i-15], 7) ^ rotr(W[i-15], 18) ^ (W[i-15] >> 3);
        uint32_t s1 = rotr(W[i-2], 17) ^ rotr(W[i-2], 19) ^ (W[i-2] >> 10);
        W[i] = W[i-16] + s0 + W[i-7] + s1;
    }
    __m128i abef = _mm_set_epi32(st[0], st[1], st[4], st[5]);
    __m128i cdgh = _mm_set_epi32(st[2], st[3], st[6], st[7]);
    for (int j = 0; j < 32; j++) {
        __m128i kv = _mm_set_epi32(0, 0, W[2*j+1] + K[2*j+1], W[2*j] + K[2*j]);
        if ((j & 1) == 0) cdgh = _mm_sha256rnds2_epu32(cdgh, abef, kv);
        else              abef = _mm_sha256rnds2_epu32(abef, cdgh, kv);
    }
    abef = _mm_add_epi32(abef, _mm_set_epi32(st[0], st[1], st[4], st[5]));
    cdgh = _mm_add_epi32(cdgh, _mm_set_epi32(st[2], st[3], st[6], st[7]));
    st[0] = (uint32_t)_mm_extract_epi32(abef, 3);
    st[1] = (uint32_t)_mm_extract_epi32(abef, 2);
    st[4] = (uint32_t)_mm_extract_epi32(abef, 1);
    st[5] = (uint32_t)_mm_extract_epi32(abef, 0);
    st[2] = (uint32_t)_mm_extract_epi32(cdgh, 3);
    st[3] = (uint32_t)_mm_extract_epi32(cdgh, 2);
    st[6] = (uint32_t)_mm_extract_epi32(cdgh, 1);
    st[7] = (uint32_t)_mm_extract_epi32(cdgh, 0);
}

void annunaki_compress_block(const uint32_t blk_be[16], uint32_t st[8])
{
    shani_compress(blk_be, st);
}

static uint32_t beword(const uint8_t *p)
{
    return ((uint32_t)p[0] << 24) | ((uint32_t)p[1] << 16) |
           ((uint32_t)p[2] << 8) | (uint32_t)p[3];
}

void annunaki_sha256(const uint8_t *msg, size_t len, uint8_t out[32])
{
    uint32_t st[8];
    memcpy(st, SHANI_IV, sizeof(st));

    /* full 64-byte blocks straight off the message */
    size_t off = 0;
    while (len - off >= 64) {
        uint32_t blk[16];
        for (int i = 0; i < 16; i++) blk[i] = beword(msg + off + 4 * i);
        shani_compress(blk, st);
        off += 64;
    }

    /* Merkle-Damgard padding: 0x80, zeros, 64-bit big-endian bit length */
    uint8_t tail[128];
    size_t rem = len - off;
    memcpy(tail, msg + off, rem);
    tail[rem] = 0x80;
    size_t padlen = rem + 1;
    size_t blocks = (padlen + 8 + 63) / 64; /* room for the 8-byte length */
    size_t tot = blocks * 64;
    memset(tail + padlen, 0, tot - padlen - 8);
    uint64_t bitlen = (uint64_t)len * 8;
    for (int i = 0; i < 8; i++)
        tail[tot - 8 + i] = (uint8_t)(bitlen >> (56 - 8 * i));
    for (size_t b = 0; b < blocks; b++) {
        uint32_t blk[16];
        for (int i = 0; i < 16; i++) blk[i] = beword(tail + b * 64 + 4 * i);
        shani_compress(blk, st);
    }

    for (int i = 0; i < 8; i++) {
        out[4*i]     = (uint8_t)(st[i] >> 24);
        out[4*i + 1] = (uint8_t)(st[i] >> 16);
        out[4*i + 2] = (uint8_t)(st[i] >> 8);
        out[4*i + 3] = (uint8_t)(st[i]);
    }
}
