/* firmware_stub.c — AQAI BIOS C stub (hosted compile for docs / sim)
 * Caduceus-powered bring-up helpers. Not linked into the Vite app.
 */
#include <stdint.h>

#define TS_BASE 0x20000000u
#define TS_PHASE (*(volatile uint64_t *)(TS_BASE + 0x10))

enum { PHASE_HARMONY = 0, PHASE_RESONANCE = 1, PHASE_TENSION = 2, PHASE_CATASTROPHE = 3 };

void bios_set_phase(uint64_t phase) {
  TS_PHASE = phase & 3u;
}

uint64_t bios_post_ok(void) {
  /* Golden braid identity would be checked via CSR in silicon. */
  return 0x33; /* SQMT-33 OK */
}
