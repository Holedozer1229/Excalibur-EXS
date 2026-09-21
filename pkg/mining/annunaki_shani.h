/* Annunaki SHA-NI powerhouse — SHA-256 compression on raw _mm_sha256rnds2_epu32.
 * Lifted verbatim from ~/workspace/aethernet/shani_grind.c (lane semantics,
 * K table, IV, and the sha256("abc") self-test vector are unchanged).
 * Adds a one-shot annunaki_sha256() with Merkle-Damgard padding so the
 * Omega' D18 kernel can call it for arbitrary-length round inputs.
 */
#ifndef ANNUNAKI_SHANI_H
#define ANNUNAKI_SHANI_H

#include <stddef.h>
#include <stdint.h>

/* One-shot SHA-256 over msg[0..len). out must hold 32 bytes. */
void annunaki_sha256(const uint8_t *msg, size_t len, uint8_t out[32]);

/* Raw single-block compression, exposed for tests. */
void annunaki_compress_block(const uint32_t blk_be[16], uint32_t st[8]);

#endif
