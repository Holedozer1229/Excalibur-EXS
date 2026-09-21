/* BLAKE2b reference implementation (public domain, RFC 7693).
 * Transcribed for the Omega' D18 C port. Byte-identity against
 * CPython's hashlib.blake2b is enforced by test_omegaprime_c.py.
 */
#include "blake2b_ref.h"
#include <string.h>

static const uint64_t IV[8] = {
    0x6A09E667F3BCC908ULL, 0xBB67AE8584CAA73BULL,
    0x3C6EF372FE94F82BULL, 0xA54FF53A5F1D36F1ULL,
    0x510E527FADE682D1ULL, 0x9B05688C2B3E6C1FULL,
    0x1F83D9ABFB41BD6BULL, 0x5BE0CD19137E2179ULL
};

static const uint8_t SIGMA[12][16] = {
    {  0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14, 15 },
    { 14, 10,  4,  8,  9, 15, 13,  6,  1, 12,  0,  2, 11,  7,  5,  3 },
    { 11,  8, 12,  0,  5,  2, 15, 13, 10, 14,  3,  6,  7,  1,  9,  4 },
    {  7,  9,  3,  1, 13, 12, 11, 14,  2,  6,  5, 10,  4,  0, 15,  8 },
    {  9,  0,  5,  7,  2,  4, 10, 15, 14,  1, 11, 12,  6,  8,  3, 13 },
    {  2, 12,  6, 10,  0, 11,  8,  3,  4, 13,  7,  5, 15, 14,  1,  9 },
    { 12,  5,  1, 15, 14, 13,  4, 10,  0,  7,  6,  3,  9,  2,  8, 11 },
    { 13, 11,  7, 14, 12,  1,  3,  9,  5,  0, 15,  4,  8,  6,  2, 10 },
    {  6, 15, 14,  9, 11,  3,  0,  8, 12,  2, 13,  7,  1,  4, 10,  5 },
    { 10,  2,  8,  4,  7,  6,  1,  5, 15, 11,  9, 14,  3, 12, 13,  0 },
    {  0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14, 15 },
    { 14, 10,  4,  8,  9, 15, 13,  6,  1, 12,  0,  2, 11,  7,  5,  3 }
};

static uint64_t rotr64(uint64_t w, unsigned c)
{
    return (w >> c) | (w << (64 - c));
}

static uint64_t load64(const void *src)
{
    const uint8_t *p = (const uint8_t *)src;
    return ((uint64_t)p[0]      ) | ((uint64_t)p[1] <<  8) |
           ((uint64_t)p[2] << 16) | ((uint64_t)p[3] << 24) |
           ((uint64_t)p[4] << 32) | ((uint64_t)p[5] << 40) |
           ((uint64_t)p[6] << 48) | ((uint64_t)p[7] << 56);
}

static void G(uint64_t v[16], int a, int b, int c, int d,
              uint64_t x, uint64_t y)
{
    v[a] = v[a] + v[b] + x;
    v[d] = rotr64(v[d] ^ v[a], 32);
    v[c] = v[c] + v[d];
    v[b] = rotr64(v[b] ^ v[c], 24);
    v[a] = v[a] + v[b] + y;
    v[d] = rotr64(v[d] ^ v[a], 16);
    v[c] = v[c] + v[d];
    v[b] = rotr64(v[b] ^ v[c], 63);
}

static void increment_counter(blake2b_state *S, uint64_t inc)
{
    S->t[0] += inc;
    if (S->t[0] < inc) S->t[1]++;
}

static void compress(blake2b_state *S, const uint8_t block[128])
{
    uint64_t m[16], v[16];
    int i, r;

    for (i = 0; i < 16; ++i) m[i] = load64(block + i * 8);
    for (i = 0; i < 8; ++i)  v[i] = S->h[i];
    v[ 8] = IV[0]; v[ 9] = IV[1]; v[10] = IV[2]; v[11] = IV[3];
    v[12] = IV[4]; v[13] = IV[5]; v[14] = IV[6]; v[15] = IV[7];
    v[12] ^= S->t[0];
    v[13] ^= S->t[1];
    v[14] ^= S->f[0];
    v[15] ^= S->f[1];

    for (r = 0; r < 12; ++r) {
        const uint8_t *s = SIGMA[r % 10];
        G(v, 0, 4,  8, 12, m[s[ 0]], m[s[ 1]]);
        G(v, 1, 5,  9, 13, m[s[ 2]], m[s[ 3]]);
        G(v, 2, 6, 10, 14, m[s[ 4]], m[s[ 5]]);
        G(v, 3, 7, 11, 15, m[s[ 6]], m[s[ 7]]);
        G(v, 0, 5, 10, 15, m[s[ 8]], m[s[ 9]]);
        G(v, 1, 6, 11, 12, m[s[10]], m[s[11]]);
        G(v, 2, 7,  8, 13, m[s[12]], m[s[13]]);
        G(v, 3, 4,  9, 14, m[s[14]], m[s[15]]);
    }

    for (i = 0; i < 8; ++i) S->h[i] ^= v[i] ^ v[i + 8];
}

int blake2b_ref_init(blake2b_state *S, size_t outlen)
{
    int i;
    if (outlen == 0 || outlen > 64) return -1;
    memset(S, 0, sizeof(*S));
    for (i = 0; i < 8; ++i) S->h[i] = IV[i];
    /* parameter block: digest_length=outlen, key_length=0, fanout=1, depth=1 */
    S->h[0] ^= 0x01010000 ^ (uint64_t)outlen;
    S->outlen = outlen;
    return 0;
}

int blake2b_ref_update(blake2b_state *S, const void *pin, size_t inlen)
{
    const uint8_t *in = (const uint8_t *)pin;
    if (inlen == 0) return 0;
    {
        size_t left = S->buflen;
        size_t fill = 128 - left;
        if (inlen > fill) {
            memcpy(S->buf + left, in, fill);
            S->buflen = 0;
            increment_counter(S, 128);
            compress(S, S->buf);
            in += fill;
            inlen -= fill;
            while (inlen > 128) {
                increment_counter(S, 128);
                compress(S, in);
                in += 128;
                inlen -= 128;
            }
        }
        memcpy(S->buf + S->buflen, in, inlen);
        S->buflen += inlen;
    }
    return 0;
}

int blake2b_ref_final(blake2b_state *S, void *out, size_t outlen)
{
    uint8_t *o = (uint8_t *)out;
    size_t i;
    if (outlen == 0 || outlen > S->outlen || outlen > 64) return -1;
    if (S->f[0] != 0) return -1; /* already finalized */
    increment_counter(S, (uint64_t)S->buflen);
    S->f[0] = 0xFFFFFFFFFFFFFFFFULL; /* last block flag */
    memset(S->buf + S->buflen, 0, 128 - S->buflen); /* pad to one block */
    compress(S, S->buf);
    for (i = 0; i < outlen; ++i)
        o[i] = (uint8_t)(S->h[i >> 3] >> (8 * (i & 7)));
    return 0;
}

int blake2b_ref(void *out, size_t outlen, const void *in, size_t inlen)
{
    blake2b_state S;
    if (blake2b_ref_init(&S, outlen) != 0) return -1;
    blake2b_ref_update(&S, in, inlen);
    return blake2b_ref_final(&S, out, outlen);
}
