# Hexagram Sequence Hash

**Caduceus attestation hash / Tetra seal** — a deterministic 256-bit digest pipeline that mirrors the sacred geometry construction sequence documented in [HEXAGRAM-TETRAHEDRON.md](./HEXAGRAM-TETRAHEDRON.md).

> **Honesty:** Default **`bitcoin-isomorph`** mode is SHA256(SHA256(message)) with a documented geometric frame — the same digest Bitcoin uses for block headers and Merkle trees. Pure **`geometry`** mode is the legacy Caduceus attestation experiment and is **not** Bitcoin-compatible.

## Bitcoin-isomorph Merkaba (default)

The Merkaba (stellated octahedron) is modeled as **two interlocking tetrahedra = two SHA-256 passes**:

| Step | Geometry | SHA-256 isomorphism | State traced |
|------|----------|---------------------|--------------|
| 0 | Hexagram — upper / lower halves | **Pass 1 block bisect:** 512-bit padded block split into two 256-bit triangles | fold mix (upper ⊕ lower) |
| 1 | Triforce — three half-triangles | **Pass 1 compress:** message schedule + 64 rounds → first digest | pass 1 digest |
| 2 | Tetrahedron — four faces | **Pass 1 commit:** four 128-bit face lanes seal the upper star | pass 1 digest |
| 3 | Six-fold — six rhombi | **Pass 2 init:** six 10-round bands over the pass-2 padded block | six-fold band mix |
| 4 | Cube trace — eight corners | **Pass 2 working vars:** eight octants of the pass-2 block (a–h frame) | cube corner mix |
| 5 | Merkaba — dual tetrahedra | **Pass 2 finalize:** lower inverted star interlocks → dual SHA-256 digest | **pass 2 digest** |

**Upper Merkaba star (steps 0–2)** = SHA256(message).  
**Lower Merkaba star (steps 3–5)** = SHA256(pass 1 output).

The pipeline calls `@noble/hashes` `sha256` at the two compression boundaries; intermediate geometry steps are permutations and XOR lanes over the standard SHA-256 block layout, not a novel hash function.

## Geometry mode (legacy)

| Step | Geometry | Hash operation |
|------|----------|----------------|
| 0 | Hexagram fold | Nibble XOR split on SHA-256 preimage |
| 1 | Tri-fold | 3-way XOR + SHA-256 |
| 2 | Tetrahedron | Four face lanes XOR-mixed → SHA-256 |
| 3 | Six-fold | Six rhombi rounds |
| 4 | Cube trace | Eight corner projections |
| 5 | Merkaba seal | Dual tetrahedron interlock → SHA-256 |

## API

```typescript
import {
  hexagramSequenceHash,
  hexagramSequenceHashDetailed,
  merkabaDigest,
  merkabaHashTraceLines,
  dualSha256,
} from "@/lib/sacredGeometry/hexagramSequenceHash";

// Default: bitcoin-isomorph (dual SHA-256)
const digest = hexagramSequenceHash("message");

// Legacy Caduceus geometry pipeline
const geom = hexagramSequenceHash("message", { mode: "geometry" });

// Full step trace with iso notes
const { digestHex, steps, mode } = hexagramSequenceHashDetailed("message");

// Tetra-PoW tip binding
const bound = merkabaDigest(tetraTipHash, "message");
```

## Tetra-PoW Binding

`merkabaDigest(tetraTipHash, message)` concatenates the message with the 32-byte tip hash before running the sequence pipeline. A separate **attestation root** is computed via `tetraHash` over a canonical payload:

```
merkaba:v1|EXCAL Tetra-PoW|EXCAL|tip:<64-hex>|hidden:Merkaba (stellated octahedron)|msg:<message-hex>
```

## Primitives

- **@noble/hashes** `sha256` at pass-1 and pass-2 compression boundaries (bitcoin-isomorph)
- **tetraHash** (four-lane XOR mix) for attestation root only

## Known Test Vectors (bitcoin-isomorph)

| Input | Digest (hex) |
|-------|--------------|
| `""` (empty) | `5df6e0e2761359d30a8275058e299fcc0381534545f55cf43e41983f5d4c9456` |
| `"hello"` | `9595c9df90075148eb06860365df33584b75bff782a510c6cd4883a419833d50` |
| `merkabaDigest(0…0, "aqai-chipset-lab")` | `bbaf8463676be8b94fa7742fe300467c992ca34179f80f4cf1fcbe72ab48a3d9` |

Attestation root for lab vector: `1925ace1bb158e462f0d7115c53cd303f441d9670e4bd141d2b5fa67fc7c6baf`

## Lab Surfaces

- **Chipset lab** (`/chipset`) — *Run Merkaba hash* trace (shows dual SHA256 verified in isomorph mode)
- **Hexagram · Tetra** (`/caduceus/speculative/hexagram-tetra`) — live digest panel
- **Artifact** — `public/treasure/merkaba-vs-dual-sha256.json`

## Implementation

- `src/lib/sacredGeometry/hexagramSequenceHash.ts`
- `src/lib/sacredGeometry/hexagramSequenceHash.test.ts`
- `scripts/compare-merkaba-dual-sha256.mjs`

## Version

- **kind:** `hexagram-sequence-hash`
- **version:** `1.1.0`
- **default mode:** `bitcoin-isomorph`
