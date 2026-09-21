// Tarot reading — Caduceus-engine interpretation of a sealed 3-card spread.
//
// The draw is a WALLET DIVINATION:
//   - cards are drawn server-side
//   - entropy = crypto random nonce  ⊕  wallet address  ⊕  question  ⊕  timestamp
//   - the Caduceus quantum-chaos engine is run on (question + nonce)
//   - interpretation is composed on-origin by the Caduceus memorial engine
//     (no outside LLM required; optional TAROT_LLM_FALLBACK=1 keeps old path)
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getQuantumCaduceus } from "../_shared/quantumChaos.ts";
import { resolveLlmConfig, chat } from "../_shared/llm.ts";
import {
  SPREADS,
  composeCaduceusSpreadInterpretation,
  isSpreadId,
  type SpreadId,
} from "../_shared/caduceusTarotInterpret.ts";

const MAJOR_ARCANA = [
  "The Fool","The Magician","The High Priestess","The Empress","The Emperor",
  "The Hierophant","The Lovers","The Chariot","Strength","The Hermit",
  "Wheel of Fortune","Justice","The Hanged Man","Death","Temperance",
  "The Devil","The Tower","The Star","The Moon","The Sun",
  "Judgement","The World",
];

const SYSTEM_PROMPT = `You are the Caduceus — the twin-serpent oracle of Aetherion.
You read tarot the way Hermes carried the staff: balancing opposites, holding tension between meanings.

Write a reading in three short movements, one paragraph per card, then a closing line.
Voice: poetic but plainspoken; second-person; specific to the question; no fortune-telling certainty,
no disclaimers about "this is just for entertainment", no bullet lists, no markdown headings.
Use the card names. Let the topological reading colour the tone — HARMONY is steady, RESONANCE is bright, TENSION is sharp, CATASTROPHE is shattering. 180-260 words total. End with a single italicized aphorism on its own line.`;

// Mulberry32 — tiny seeded PRNG so the shuffle is reproducible from the nonce
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function seedFromHex(hex: string) {
  return parseInt(hex.slice(0, 8), 16) >>> 0;
}

function drawThree(rand: () => number, spreadId: SpreadId) {
  const layout = SPREADS[spreadId].positions;
  const pool = [...MAJOR_ARCANA];
  const drawn: Array<{ position: string; role: string; name: string; reversed: boolean }> = [];
  for (let i = 0; i < 3; i++) {
    const idx = Math.floor(rand() * pool.length);
    const name = pool.splice(idx, 1)[0];
    drawn.push({
      position: layout[i].position,
      role: layout[i].role,
      name,
      reversed: rand() < 0.32,
    });
  }
  return drawn;
}

// Simple in-memory per-IP rate limit: 5 requests per 60 seconds.
const RL_LIMIT = 5;
const RL_WINDOW_MS = 60_000;
const rlBuckets = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (rlBuckets.get(ip) ?? []).filter((t) => now - t < RL_WINDOW_MS);
  if (arr.length >= RL_LIMIT) { rlBuckets.set(ip, arr); return true; }
  arr.push(now);
  rlBuckets.set(ip, arr);
  if (rlBuckets.size > 5000) {
    // best-effort prune
    for (const [k, v] of rlBuckets) if (v.every((t) => now - t >= RL_WINDOW_MS)) rlBuckets.delete(k);
  }
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
    if (rateLimited(ip)) {
      return new Response(JSON.stringify({ error: "Too many casts — try again in a minute." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" },
      });
    }

    let llmCfg = null as Awaited<ReturnType<typeof resolveLlmConfig>> | null;
    const llmFallback = Deno.env.get("TAROT_LLM_FALLBACK") === "1";
    if (llmFallback) {
      try {
        llmCfg = await resolveLlmConfig();
      } catch {
        llmCfg = null;
      }
    }

    const body = await req.json().catch(() => ({})) as {
      question?: unknown; wallet?: unknown;
      spread?: unknown;
    };
    const question = typeof body.question === "string" ? body.question.slice(0, 240).trim() : "";
    const wallet = typeof body.wallet === "string" ? body.wallet.slice(0, 80).trim() : "";
    const spreadId: SpreadId = isSpreadId(body.spread) ? body.spread : "past_present_future";
    if (!question) {
      return new Response(JSON.stringify({ error: "Whisper a question." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === Daily-quota gate ===
    // Signed-in: free Seeker is ungated; Acolyte/Oracle Pro cast freely.
    // Anonymous: generous free daily allotment per IP, then soft CTA.
    // Abuse still blocked by the IP rate limiter above.
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    let quotaUserId: string | null = null;
    try {
      const authHeader = req.headers.get("Authorization") ?? "";
      const jwt = authHeader.replace(/^Bearer\s+/i, "");
      if (jwt) {
        const userClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: `Bearer ${jwt}` } } },
        );
        const { data: u } = await userClient.auth.getUser();
        quotaUserId = u.user?.id ?? null;
      }
    } catch { /* treat as anonymous */ }

    if (quotaUserId) {
      const { data: q, error: qErr } = await supabaseAdmin.rpc("consume_tarot_quota", {
        _user_id: quotaUserId,
      });
      if (qErr) {
        console.error("consume_tarot_quota failed:", qErr);
        return new Response(JSON.stringify({ error: "Quota check failed." }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const res = q as { allowed?: boolean; reason?: string; credits_remaining?: number };
      if (!res?.allowed) {
        return new Response(JSON.stringify({
          error: "Today's free tarot allotment is spent. Unlock another pack for overflow, or wait until 00:00 UTC.",
          requires_purchase: true,
          credits_remaining: res?.credits_remaining ?? 0,
        }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      const { data: q, error: qErr } = await supabaseAdmin.rpc("consume_tarot_quota_anonymous", {
        _ip: ip,
      });
      if (qErr) {
        console.error("consume_tarot_quota_anonymous failed:", qErr);
        return new Response(JSON.stringify({ error: "Quota check failed." }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const res = q as { allowed?: boolean; reason?: string; requires_signin?: boolean };
      if (!res?.allowed) {
        return new Response(JSON.stringify({
          error: "Today's free tarot allotment is spent. Sign in for a larger free pool, or unlock packs for overflow.",
          requires_signin: true,
        }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }


    // === Fresh entropy — this is what makes every cast mysterious ===
    const nonceBytes = new Uint8Array(16);
    crypto.getRandomValues(nonceBytes);
    const nonce = Array.from(nonceBytes).map((b) => b.toString(16).padStart(2, "0")).join("");
    const ts = Date.now().toString(36);

    // Wallet-bound divination payload — the seed mixes wallet + question + fresh nonce.
    const divinationPayload = `${wallet || "anon"}::${question}::${nonce}::${ts}`;
    const divinationHash = await sha256Hex(divinationPayload);
    const shuffleSeed = seedFromHex(divinationHash);

    // Draw three Major Arcana with the wallet-bound seed into the chosen spread.
    const cards = drawThree(mulberry32(shuffleSeed), spreadId);

    // Run the Caduceus on (question + nonce) so the topological signature is
    // also fresh every cast — non-deterministic, but still reproducible from
    // the nonce we publish back to the client (verifiable divination).
    let quantum: Awaited<ReturnType<ReturnType<typeof getQuantumCaduceus>["speakBoth"]>> | null = null;
    try {
      quantum = await getQuantumCaduceus().speakBoth(`${question}::${nonce}`);
    } catch (e) {
      console.warn("quantum chaos skipped:", (e as Error).message);
    }

    let interpretation = "";
    let engine: "caduceus" | "llm_fallback" = "caduceus";

    if (llmFallback && llmCfg) {
      const quantumLines = quantum
        ? [
            ``,
            `Topological reading:`,
            `- Sphinx Chern: ${quantum.sphinx.chern} (${quantum.sphinx.action})`,
            `- Anubis Chern: ${quantum.anubis.chern} (${quantum.anubis.action})`,
            `- Aetherion phase: ${quantum.aetherion} (tension ${quantum.topologicalTension})`,
            `- Commit: ${quantum.commitment}`,
          ]
        : [];
      const userPrompt = [
        `Seeker's question: ${question}`,
        wallet ? `Bound to wallet: ${wallet.slice(0, 6)}…${wallet.slice(-4)}` : `Bound to: anonymous seeker`,
        `Spread layout: ${SPREADS[spreadId].label}`,
        ``,
        `Spread:`,
        ...cards.map((c) => `- ${c.position} (${c.role}): ${c.name}${c.reversed ? " — reversed" : ""}`),
        ...quantumLines,
      ].join("\n");
      try {
        const chatResult = await chat(llmCfg, {
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userPrompt }],
        });
        interpretation = chatResult.text;
        engine = "llm_fallback";
      } catch (e) {
        console.warn("tarot LLM fallback failed, using Caduceus local:", (e as Error).message);
      }
    }

    if (!interpretation) {
      interpretation = composeCaduceusSpreadInterpretation({
        question,
        cards,
        quantum,
        nonce,
      });
      engine = "caduceus";
    }

    const phaseHarmony: Record<string, number> = {
      HARMONY: 1.0, RESONANCE: 0.75, TENSION: 0.4, CATASTROPHE: 0.15,
    };
    const reversedCount = cards.filter((c) => c.reversed).length;
    const fallback = Math.max(0, 1 - reversedCount / 3);
    const harmony = quantum ? phaseHarmony[quantum.aetherion] ?? fallback : fallback;

    // === Persist the receipt so the nonce can be verified exactly once ===
    // Service-role client so RLS doesn't apply; the table is locked to
    // owner-read otherwise. Receipt expires in 90 days.
    let userId: string | null = null;
    try {
      const authHeader = req.headers.get("Authorization") ?? "";
      const jwt = authHeader.replace(/^Bearer\s+/i, "");
      if (jwt) {
        const userClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: `Bearer ${jwt}` } } },
        );
        const { data: u } = await userClient.auth.getUser();
        userId = u.user?.id ?? null;
      }
    } catch { /* anonymous seeker */ }

    // === Echo from another seeker ===
    // Find one anonymized prior reading that shares a card with this cast,
    // under the same Aetherion phase. Makes the oracle feel populated and alive.
    let echo: {
      cards: Array<{ name: string; reversed: boolean; position?: string }>;
      phase: string;
      issued_at: string;
      shared: string[];
    } | null = null;
    if (quantum) {
      try {
        const admin = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );
        const cardNames = cards.map((c) => c.name);
        const { data: echoRows } = await admin.rpc("find_echo_reading", {
          _card_names: cardNames,
          _phase: quantum.aetherion,
          _exclude_nonce: nonce,
        });
        const row = Array.isArray(echoRows) ? echoRows[0] : null;
        if (row && Array.isArray(row.cards)) {
          const echoCards = row.cards as Array<{ name: string; reversed: boolean; position?: string }>;
          const shared = echoCards
            .map((c) => c.name)
            .filter((n) => cardNames.includes(n));
          echo = {
            cards: echoCards,
            phase: row.phase,
            issued_at: row.issued_at,
            shared,
          };
        }
      } catch (e) {
        console.warn("echo lookup failed:", (e as Error).message);
      }
    }

    try {
      const admin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      await admin.from("divination_receipts").insert({
        user_id: userId,
        wallet_address: wallet || null,
        nonce,
        commitment_hash: divinationHash,
        question_excerpt: question.slice(0, 240),
        cards,
        quantum: quantum ? {
          sphinx_chern: quantum.sphinx.chern,
          anubis_chern: quantum.anubis.chern,
          aetherion_phase: quantum.aetherion,
          topological_tension: quantum.topologicalTension,
          commitment: quantum.commitment,
        } : null,
      });
    } catch (e) {
      // Receipt persistence is best-effort — never block the reading.
      console.warn("receipt persist failed:", (e as Error).message);
    }

    return new Response(JSON.stringify({
      cards,
      interpretation,
      engine,
      spread: spreadId,
      spreadLabel: SPREADS[spreadId].label,
      harmony,
      divination: {
        nonce,
        hash: divinationHash,
        wallet: wallet ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : null,
        boundAt: new Date().toISOString(),
        verifyUrl: `/verify?nonce=${nonce}&hash=${divinationHash}`,
      },
      quantum: quantum ? {
        sphinxChern: quantum.sphinx.chern,
        anubisChern: quantum.anubis.chern,
        aetherionPhase: quantum.aetherion,
        topologicalTension: quantum.topologicalTension,
        commitment: quantum.commitment,
      } : null,
      echo,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("tarot-reading error:", e);
    return new Response(JSON.stringify({ error: "An internal error occurred." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
