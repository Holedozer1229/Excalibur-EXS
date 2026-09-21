// Server-side BTC puzzle solver — bounded range per request.
// Runs the same deterministic 16-bit Feistel / period-8 SHA-256 pipeline as the
// browser worker. Intended for CI, replay, and small server-side sweeps.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sha256 } from "npm:@noble/hashes@2.2.0/sha2.js";
import { z } from "npm:zod@3.23.8";

const MAX_RANGE = 200_000;
const MAX_KNOWN = 500;

const BodySchema = z.object({
  targetHex: z.string().regex(/^(0x)?[0-9a-fA-F]{1,64}$/),
  block: z.number().int().min(0).max(0xffff),
  seedStart: z.number().int().min(0).max(0xffffffff).default(0),
  seedEnd: z.number().int().min(0).max(0xffffffff).default(0),
  knownSeeds: z.array(z.string().max(128)).max(MAX_KNOWN).optional(),
});

function feistelRound(b: number, k: number): number {
  const L = (b >>> 8) & 0xff;
  const R = b & 0xff;
  const fOut = (R ^ k) & 0xff;
  return (((R) << 8) | ((L ^ fOut) & 0xff)) & 0xffff;
}
function feistel16(block: number, sk: Uint8Array): Uint16Array {
  const s = new Uint16Array(16);
  let cur = block & 0xffff;
  for (let i = 0; i < 16; i++) { cur = feistelRound(cur, sk[i]); s[i] = cur; }
  return s;
}
function derivePeriod8(bytes: Uint8Array): Uint8Array {
  const h = sha256(bytes);
  const sk = new Uint8Array(16);
  for (let i = 0; i < 8; i++) { sk[i] = h[i]; sk[i + 8] = h[i]; }
  return sk;
}
function statesToHex(s: Uint16Array): string {
  let o = ""; for (let i = 0; i < 16; i++) o += s[i].toString(16).padStart(4, "0"); return o;
}
function seedInt32ToBytes(n: number): Uint8Array {
  return new Uint8Array([(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Auth gate: compute-heavy sweeps require a signed-in user.
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  {
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );
    const { data: claims } = await userClient.auth.getClaims(token);
    if (!claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { block, knownSeeds } = parsed.data;
    const targetHex = parsed.data.targetHex.replace(/^0x/, "").padStart(64, "0").toLowerCase();
    const seedStart = parsed.data.seedStart | 0;
    const seedEnd = parsed.data.seedEnd | 0;
    const range = Math.max(0, seedEnd - seedStart);
    if (range > MAX_RANGE) {
      return new Response(
        JSON.stringify({ error: `range exceeds MAX_RANGE=${MAX_RANGE}. Use client worker for large sweeps.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const enc = new TextEncoder();
    const matches: Array<{ seed: string; output: string; block: number }> = [];
    const t0 = performance.now();

    // Phase 1: known ASCII seeds
    for (const s of knownSeeds ?? []) {
      const out = statesToHex(feistel16(block, derivePeriod8(enc.encode(s))));
      if (out === targetHex) matches.push({ seed: `ascii:${s}`, output: out, block });
    }

    // Phase 2: bounded uint32 sweep
    for (let n = seedStart; n < seedEnd; n++) {
      const out = statesToHex(feistel16(block, derivePeriod8(seedInt32ToBytes(n))));
      if (out === targetHex) {
        matches.push({ seed: `u32:${n} (0x${n.toString(16)})`, output: out, block });
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        targetHex,
        block,
        tested: (knownSeeds?.length ?? 0) + range,
        matches,
        elapsed_ms: Math.round(performance.now() - t0),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
