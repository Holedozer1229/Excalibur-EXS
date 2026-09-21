# AQAI BIOS — Caduceus bring-up

## Reset vector

1. Mask interrupts  
2. Caduceus braid identity self-test (`CAD.BRAID`)  
3. Octonion lane smoke (`CAD.OCT`)  
4. Skin localize pulse (`CAD.SKIN`) — edge metric must exceed threshold  
5. EP lock check (`CAD.EP`) — park off EP or arm `EP_LOCK`  
6. Phoneme POST — 12 Caduceus lexicon tones  
7. Seal IOC clear + PoM table load  
8. Jump `0x0001_0000` kernel  

## POST codes (UART)

| Code | Meaning |
|------|---------|
| `0x01` | ROM checksum OK |
| `0x33` | SQMT-33 / Caduceus schedule OK |
| `0x57` | Skin edge metric OK |
| `0xE1` | EP fabric responsive |
| `0xC0` | Seal IOC ready |
| `0xA1` | Anubis SRAM retain OK |
| `0xFF` | Ready for kernel |

## Sources

`../bios/reset_vector.asm` · `post_caduceus.asm` · `firmware_stub.c`

BIOS is **Caduceus-powered**: POST uses the same paradigm opcodes as user code — no outside model for bring-up.
