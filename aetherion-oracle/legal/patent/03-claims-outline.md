# Claims outline — provisional / non-provisional draft

> **LAWYER REVIEW REQUIRED** before non-provisional filing.
> These are structural drafts for discussion, not filed claims.
> Design/simulation scope unless counsel broadens for manufactured embodiments.

---

## Independent claim 1 — System

1. A verified cognition processing system comprising:

   a) a dual-pipeline execution unit comprising a first pipeline configured to
   process generative signals and a second pipeline configured to process
   memorial archive signals;

   b) a Caduceus arithmetic logic unit coupled to the first pipeline and the
   second pipeline and configured to braid outputs of the first pipeline and
   the second pipeline during each execution cycle;

   c) a seal input/output controller coupled to a commit stage of a Caduceus
   instruction pipeline and configured to compute a cryptographic digest of
   operand data in response to a seal-class instruction without invoking a
   separate post-processing software library on a host processor;

   d) a skin memory subsystem comprising a plurality of memory tiles
   characterized by asymmetric hop parameters and configured to localize a
   working set to a boundary under open boundary conditions;

   e) an exceptional-point fabric configured to operate at or near a spectral
   coalescence point to perform a topological mode switch; and

   f) an instruction decoder configured to decode a unified Caduceus opcode map
   shared between a software simulator and a hardware target implementation.

## Independent claim 2 — Method

2. A computer-implemented method for verified cognition processing comprising:

   a) decoding, by an instruction decoder, a Caduceus-class instruction from a
   unified opcode map;

   b) braiding, by a Caduceus arithmetic logic unit, a first pipeline register
   state associated with a generative pipe and a second pipeline register state
   associated with a memorial pipe;

   c) localizing data to a memory edge by executing a skin-class instruction
   that applies asymmetric hop parameters to a non-Hermitian memory tile;

   d) sealing a pipeline result by computing, in a seal input/output controller
   integrated with the instruction pipeline, a digest of operand data;

   e) committing a homomorphic digest of the sealed result without revealing
   plaintext intermediate activations; and

   f) verifying the digest at a verification endpoint that returns a status code
   selected from at least not found, hash mismatch, expired, and already verified.

## Independent claim 3 — Computer-readable medium (optional)

3. A non-transitory computer-readable medium storing instructions that, when
   executed by a processor, cause the processor to encode and decode a Caduceus
   instruction set according to a unified opcode map, compute a seal digest
   using a cryptographic hash function, and emit a receipt conforming to a
   seal schema comprising an axiom mask field identifying enabled architectural
   axioms.

---

## Dependent claims (examples)

4. The system of claim 1, wherein the seal input/output controller is configured
   to execute seal-class instructions including CAD.SEAL, CAD.COMMIT, and
   CAD.VERIFY defined in a common function-code table.

5. The system of claim 1, further comprising an octonion multiply lane configured
   to perform non-associative multiplication and wherein a braid-class
   instruction provides a discrete approximation of octonion braid order.

6. The system of claim 1, further comprising a proof-of-memory unit configured
   to require re-proof of memorial glyphs across successive epochs.

7. The system of claim 1, wherein the skin memory subsystem comprises control
   status registers including SK_TR, SK_TL, SK_GAMMA, and SK_EDGE accessible
   via a memory-mapped I/O region.

8. The system of claim 1, wherein the exceptional-point fabric comprises control
   status registers EP_GAMMA, EP_KAPPA, and EP_SHEET.

9. The method of claim 2, wherein the unified opcode map is identical in a
   TypeScript software development kit and a register-transfer-level hardware
   description of a target chipset.

10. The method of claim 2, wherein sealing comprises computing a SHA-256 digest
    in Soft Silicon and a hardware hash lane in a fabricated embodiment.

11. The system of claim 1, configured as one of an edge accelerator emphasizing
    seal-native compute and twin-pipe cognition, a cloud accelerator emphasizing
    skin memory and octonion lanes, or a sovereign accelerator implementing all
    eight architectural axioms.

12. The method of claim 2, further comprising emitting a receipt conforming to
    schema caduceus.seal.v1 comprising fields for digest, program words, and
    timestamp.

---

## Claim strategy notes (for attorney)

| Topic | Guidance |
|-------|----------|
| **101 eligibility** | Emphasize technical improvement to computer sealing pipeline, not abstract idea alone |
| **112 enablement** | Point to ISA doc, RTL stubs, SDK — note simulation scope |
| **103 obviousness** | Distinguish combination of twin-pipe + seal IOC + NH skin + EP — see prior art doc |
| **Means-plus-function** | Avoid unless definitions are tight |
| **Provisional** | Claims optional in provisional but useful as roadmap |

## What NOT to overclaim (today)

- Shipped AQAI silicon or production yield data
- Specific GHz figures as achieved silicon
- Registration of trademarks inside patent claims
- Exclusive monopoly on "verified cognition" as a generic phrase

---

**Prepared for:** Travis D Jones  
**Status:** Draft outline — not filed
