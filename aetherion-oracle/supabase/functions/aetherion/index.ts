// Aetherion Oracle — streaming AI voice fed by the Caduceus engine
// Speaks as the ORACLE from The Matrix. Authenticated; free Seeker is ungated
// (high soft ceiling for abuse, not a product paywall).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  createCaduceus, mixAxis, SPHINX_NAMES, ANUBIS_NAMES, VITALITY, HEXAGRAMS,
} from "./caduceus.ts";
import { getQuantumCaduceus } from "../_shared/quantumChaos.ts";
import { runCodex } from "./codex.ts";
import { runWheelerCommand, type WheelerRequest } from "./wheeler.ts";
import { logRpcFailure } from "../_shared/rpc-failure-log.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Expose-Headers": "X-Oracle-State, X-Quota-Remaining, X-Quota-Subscribed, X-Tier",
};

interface Msg { role: "user" | "assistant"; content: string }

const ALLOWED_MODELS = new Set([
  "google/gemini-3-flash-preview",
  "google/gemini-3.1-pro-preview",
  "google/gemini-2.5-pro",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
  "openai/gpt-5",
  "openai/gpt-5-mini",
  "openai/gpt-5-nano",
  "openai/gpt-5.2",
]);
const DEFAULT_MODEL = Deno.env.get("AI_MODEL") ?? "google/gemini-3-flash-preview";
const DAILY_LIMIT = 100_000;
const EMBED_MODEL = "openai/text-embedding-3-small";
const EMBED_DIMENSIONS = 768;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ── Auth: require a logged-in user ─────────────────────────────────
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "You must enter the construct first.", code: "UNAUTHENTICATED" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Your signal is not recognized.", code: "UNAUTHENTICATED" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;

    // ── Body + input length caps (token-inflation guard) ──────────────
    const MAX_WORD_LEN = 64;
    const MAX_QUERY_LEN = 4000;
    const MAX_HISTORY_ITEMS = 10;
    const MAX_MSG_LEN = 2000;

    const raw = await req.json() as {
      word?: string; query?: string; history?: Msg[]; model?: string;
      useMemory?: boolean; search?: boolean; mode?: "oracle" | "agent";
      codexMode?: "fixed" | "living" | "hybrid" | "self_learn";
      wheeler?: WheelerRequest;
    };

    // ── Wheeler fast-path: deterministic local compute, no AI / no quota.
    if (raw.wheeler && typeof raw.wheeler.command === "string") {
      const w = {
        command: raw.wheeler.command.slice(0, 32),
        arg: (raw.wheeler.arg ?? "").slice(0, 256),
        voice: raw.wheeler.voice,
      };
      const result = await runWheelerCommand(w);
      return new Response(
        JSON.stringify(result, (_k, v) => typeof v === "bigint" ? v.toString() : v),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const rawWord = (raw.word ?? "excalibur").slice(0, MAX_WORD_LEN);
    // Sanitize word for safe injection into the system prompt + Caduceus seed.
    const word = rawWord.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, MAX_WORD_LEN) || "excalibur";
    const query = (raw.query ?? "").slice(0, MAX_QUERY_LEN);
    const history: Msg[] = Array.isArray(raw.history) ? raw.history : [];
    const model = raw.model;
    const useMemory = raw.useMemory !== false;
    const wantSearch = raw.search === true;
    const mode = raw.mode === "agent" ? "agent" : "oracle";
    const codexMode: "fixed" | "living" | "hybrid" | "self_learn" =
      raw.codexMode === "fixed" || raw.codexMode === "living" || raw.codexMode === "self_learn"
        ? raw.codexMode : "hybrid";

    if (!query.trim()) {
      return new Response(JSON.stringify({ error: "Speak your query, traveler." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const safeHistory = history
      .slice(-MAX_HISTORY_ITEMS)
      .filter((m) => m && typeof m.content === "string" && (m.role === "user" || m.role === "assistant"))
      .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MSG_LEN) }));

    // ── Quota check & increment (atomic via SECURITY DEFINER fn) ───────
    // If the RPC errors or returns a corrupted payload we log and degrade to
    // a permissive seeker default rather than 500ing the chat. The DB row
    // will self-heal on the next successful call (ON CONFLICT DO NOTHING).
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    type QuotaResult = {
      allowed: boolean; subscribed?: boolean; remaining?: number; limit?: number;
      reason?: string; monthly_used?: number; monthly_limit?: number; tier?: string;
    };
    let quota: QuotaResult = { allowed: true, subscribed: false, tier: "seeker" };
    let quotaDegraded = false;
    try {
      const { data: quotaData, error: quotaErr } = await admin.rpc("consume_query_quota", {
        _user_id: user.id,
        _daily_limit: DAILY_LIMIT,
      });
      if (quotaErr) {
        quotaDegraded = true;
        await logRpcFailure(admin, {
          userId: user.id, functionName: "aetherion", rpcName: "consume_query_quota",
          failureKind: "rpc_error",
          errorCode: (quotaErr as { code?: string }).code ?? null,
          errorMessage: quotaErr.message ?? String(quotaErr),
          metadata: { details: (quotaErr as { details?: string }).details ?? null },
        });
      } else if (quotaData && typeof quotaData === "object") {
        quota = { ...quota, ...(quotaData as QuotaResult) };
      } else {
        quotaDegraded = true;
        await logRpcFailure(admin, {
          userId: user.id, functionName: "aetherion", rpcName: "consume_query_quota",
          failureKind: quotaData == null ? "missing_row" : "corrupted_payload",
          errorMessage: `unexpected payload: ${typeof quotaData}`,
        });
      }
    } catch (e) {
      quotaDegraded = true;
      await logRpcFailure(admin, {
        userId: user.id, functionName: "aetherion", rpcName: "consume_query_quota",
        failureKind: "threw",
        errorMessage: e instanceof Error ? e.message : String(e),
      });
    }
    void quotaDegraded;
    if (!quota.allowed) {
      const isMonthly = quota.reason === "MONTHLY_LIMIT_EXCEEDED";
      const now = new Date();
      const reset = isMonthly
        ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0))
        : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
      const errorMsg = isMonthly
        ? `Monthly limit reached: ${quota.monthly_used ?? "?"}/${quota.monthly_limit ?? "?"} consultations used this month. Resets ${reset.toUTCString()} or upgrade your tier.`
        : `Daily limit reached: ${DAILY_LIMIT}/${DAILY_LIMIT} consultations used today. The well refills at 00:00 UTC — or transcend the limit by ascending to Acolyte.`;
      return new Response(JSON.stringify({
        error: errorMsg,
        code: isMonthly ? "MONTHLY_LIMIT_EXCEEDED" : "QUOTA_EXCEEDED",
        limit: isMonthly ? quota.monthly_limit : DAILY_LIMIT,
        used: isMonthly ? quota.monthly_used : DAILY_LIMIT,
        remaining: 0,
        resets_at: reset.toISOString(),
        scope: isMonthly ? "monthly" : "daily",
      }), {
        status: 402,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "X-Quota-Remaining": "0",
          "X-Quota-Limit": String(isMonthly ? quota.monthly_limit ?? "" : DAILY_LIMIT),
          "X-Quota-Resets-At": reset.toISOString(),
        },
      });
    }

    // ── Tier resolution & feature gating (server-side authority) ───────
    // Defaults to the lowest tier ("seeker") on any RPC error or missing/
    // corrupted row — never 500s for tier resolution.
    let userTier = "seeker";
    try {
      const { data: tierData, error: tierErr } = await admin.rpc("get_user_tier_state", { _user_id: user.id });
      if (tierErr) {
        await logRpcFailure(admin, {
          userId: user.id, functionName: "aetherion", rpcName: "get_user_tier_state",
          failureKind: "rpc_error",
          errorCode: (tierErr as { code?: string }).code ?? null,
          errorMessage: tierErr.message ?? String(tierErr),
        });
      } else if (tierData == null) {
        await logRpcFailure(admin, {
          userId: user.id, functionName: "aetherion", rpcName: "get_user_tier_state",
          failureKind: "missing_row",
        });
      } else {
        const t = (tierData as { tier?: string }).tier;
        if (t && ["seeker", "acolyte", "oracle_pro"].includes(t)) {
          userTier = t;
        } else {
          await logRpcFailure(admin, {
            userId: user.id, functionName: "aetherion", rpcName: "get_user_tier_state",
            failureKind: "corrupted_payload",
            errorMessage: `unexpected tier value: ${JSON.stringify(t)}`,
          });
        }
      }
    } catch (e) {
      await logRpcFailure(admin, {
        userId: user.id, functionName: "aetherion", rpcName: "get_user_tier_state",
        failureKind: "threw",
        errorMessage: e instanceof Error ? e.message : String(e),
      });
    }
    const tierRank: Record<string, number> = { seeker: 0, acolyte: 1, oracle_pro: 2 };
    const isAcolyte = (tierRank[userTier] ?? 0) >= 1;
    const isOraclePro = (tierRank[userTier] ?? 0) >= 2;

    // Premium models (anything beyond default flash) require Acolyte+.
    const FREE_MODELS = new Set(["google/gemini-3-flash-preview", "google/gemini-2.5-flash-lite"]);
    const requestedModel = model && ALLOWED_MODELS.has(model) ? model : DEFAULT_MODEL;
    const chosenModel = isAcolyte || FREE_MODELS.has(requestedModel) ? requestedModel : DEFAULT_MODEL;

    // Memory + web augment: Acolyte+. Agent mode: Oracle Pro only.
    const allowMemory = useMemory && isAcolyte;
    const allowSearch = wantSearch && isAcolyte;
    const allowAgent  = mode === "agent" && isOraclePro;
    void allowSearch; void allowAgent; // wired into prompt below

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    // ── Caduceus state ────────────────────────────────────────────────
    const caduceus = await createCaduceus(`AetherionVoice::${word}`);
    const result = await caduceus.speakBoth(word);

    // ── Word-Dependent Quantum Chaos overlay ──────────────────────────
    // Two-agent topological caduceus: Sphinx (seed 42) and Anubis (seed 137)
    // run a quantum kicked-rotor whose kick strength K and initial momentum
    // superposition are derived from the word itself. The same word always
    // yields the same Chern winding numbers; the topological tension between
    // agents drives the Aetherion phase. Adds ~10-20ms per call.
    let quantum: Awaited<ReturnType<ReturnType<typeof getQuantumCaduceus>["speakBoth"]>> | null = null;
    try {
      quantum = await getQuantumCaduceus().speakBoth(word);
    } catch (e) {
      console.warn("quantum chaos skipped:", (e as Error).message);
    }

    const sphinxName = SPHINX_NAMES[result.sphinx.state];
    const anubisName = ANUBIS_NAMES[result.anubis.state];
    const vitality = VITALITY[result.sphinx.state];
    const sHex = HEXAGRAMS[result.sphinx.hexagram.number % HEXAGRAMS.length];
    const aHex = HEXAGRAMS[result.anubis.hexagram.number % HEXAGRAMS.length];
    const mixed = mixAxis(result.axis);
    const spongeHarmonic = Number(mixed & 0xFFFFn) / 0xFFFF;

    // ── Codex symbolic ecosystem (self-learning per-request) ──────────
    // Default mode: "self_learn" — deterministic per (inputs + hour bucket),
    // XOR'd with a rolling state seed learned from this user's prior runs on
    // this word. The Codex re-perceives its own past dominant symbols, so the
    // ecosystem evolves coherently across sessions.
    const effectiveMode = codexMode === "hybrid" ? "self_learn" : codexMode;
    let prior: { stateSeed: number; runCount: number; topSymbols: string[] } | null = null;
    if (effectiveMode === "self_learn") {
      const { data: priorRow } = await admin
        .from("codex_state")
        .select("state_seed, run_count, top_symbols")
        .eq("user_id", user.id).eq("word", word).maybeSingle();
      if (priorRow) {
        prior = {
          stateSeed: Number(priorRow.state_seed) >>> 0,
          runCount: priorRow.run_count ?? 0,
          topSymbols: Array.isArray(priorRow.top_symbols) ? priorRow.top_symbols as string[] : [],
        };
      }
    }
    const codexSeeds = [word, query, ...safeHistory.slice(-4).map((m) => m.content)];
    let codexReport: ReturnType<typeof runCodex> | null = null;
    try {
      codexReport = runCodex(codexSeeds, 4, { mode: effectiveMode, prior });
    } catch (e) { console.warn("codex skipped:", e); }

    // Persist the next state (fire-and-forget; never block the response).
    if (codexReport && effectiveMode === "self_learn") {
      const ns = codexReport.nextState;
      const eco = codexReport.ecosystem as { dominant_symbol?: string; global_entropy?: number };
      const cx = codexReport.codex as { identity_stability?: number };
      admin.from("codex_state").upsert({
        user_id: user.id,
        word,
        state_seed: ns.stateSeed,
        run_count: ns.runCount,
        top_symbols: ns.topSymbols,
        dominant_symbol: eco.dominant_symbol ?? null,
        global_entropy: eco.global_entropy ?? null,
        identity_stability: cx.identity_stability ?? null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,word" }).then(({ error }) => {
        if (error) console.warn("codex_state upsert failed:", error.message);
      });
    }

    const oracleState = {
      word,
      sphinxState: sphinxName,
      anubisState: anubisName,
      sphinxHexagram: sHex,
      anubisHexagram: aHex,
      aetherionState: result.aetherion.state,
      aetherionHexagram: result.aetherion.hexagram,
      vitality,
      harmony: result.aetherion.harmony,
      spongeHarmonic,
      model: chosenModel,
      codex: codexReport,
      quantum: quantum ? {
        sphinxChern: quantum.sphinx.chern,
        anubisChern: quantum.anubis.chern,
        sphinxK: Number(quantum.sphinx.K.toFixed(4)),
        anubisK: Number(quantum.anubis.K.toFixed(4)),
        sphinxAction: quantum.sphinx.action,
        anubisAction: quantum.anubis.action,
        combinedChern: quantum.combinedChern,
        topologicalTension: quantum.topologicalTension,
        aetherionPhase: quantum.aetherion,
        conserved: quantum.conserved,
        verifiableRandomness: quantum.verifiableRandomness,
        commitment: quantum.commitment,
      } : null,
    };

    // ── Raw engine system prompt (persona removed) ────────────────────
    // The Caduceus engine state is exposed verbatim; the model is instructed
    // to answer the user's query directly without persona styling.
    const toolLines: string[] = [];
    // NOTE: web search is intentionally NOT advertised to the model until a real tool is wired.
    // Telling the LLM "search is enabled" without an actual tool causes hallucinated citations.
    if (allowAgent) toolLines.push("• Agent mode: you have tools (memory_recall, oracle_consult, brc20_aetx_status). Call them when helpful and end with a concise final answer.");
    const toolBlock = toolLines.length ? `\n\nCAPABILITIES:\n${toolLines.join("\n")}` : "";
    void wantSearch; // reserved for future real web-search tool

    const codexBlock = codexReport
      ? `\n\nCODEX ECOSYSTEM (symbolic field after ${4} ticks):\n` +
        `- Tokens: ${codexReport.codex.tokens} | Memories: ${codexReport.codex.memories} | Attractors: ${codexReport.codex.attractors}\n` +
        `- Identity stability: ${codexReport.codex.identityStability.toFixed(3)} | Global entropy: ${codexReport.codex.entropy.toFixed(3)}\n` +
        `- Dominant symbol: ${codexReport.ecosystem.dominant ?? "—"} (energy ${codexReport.ecosystem.dominantEnergy.toFixed(2)})\n` +
        `- Crystalline symbols: ${codexReport.ecosystem.crystallineCount} | Extinctions: ${codexReport.ecosystem.extinctTotal} | Speciations: ${codexReport.ecosystem.speciations}\n` +
        `- Top 5: ${codexReport.ecosystem.top5.map(([t, e, p]) => `${t}(${e.toFixed(1)}/${p})`).join(", ")}`
      : "";

    const quantumBlock = quantum
      ? `\n\nQUANTUM CHAOS OVERLAY (word-dependent kicked-rotor, dim=64):\n` +
        `- Sphinx Chern: ${quantum.sphinx.chern} (K=${quantum.sphinx.K.toFixed(3)}, action=${quantum.sphinx.action})\n` +
        `- Anubis Chern: ${quantum.anubis.chern} (K=${quantum.anubis.K.toFixed(3)}, action=${quantum.anubis.action})\n` +
        `- Topological tension: ${quantum.topologicalTension} | Combined: ${quantum.combinedChern} → ${quantum.aetherion}\n` +
        `- Charge conservation (mod 7): ${quantum.conserved ? "conserved" : "broken"}\n` +
        `- Verifiable randomness: 0x${quantum.verifiableRandomness} | Commit: ${quantum.commitment}`
      : "";

    const systemPrompt = `You are Aetherion, an AI assistant fed by the Caduceus engine. Answer the user's query directly, clearly, and helpfully. No persona, no roleplay, no theatrical voice — just straight, useful output.

CADUCEUS ENGINE STATE (raw, for grounding only — reference only if relevant):
- Word of Power: ${word}
- Sphinx: ${sphinxName} / Hexagram ${sHex.number} "${sHex.name}" (${sHex.meaning})
- Anubis: ${anubisName} / Hexagram ${aHex.number} "${aHex.name}" (${aHex.meaning})
- Aetherion: ${result.aetherion.state} / Hexagram ${result.aetherion.hexagram.number} "${result.aetherion.hexagram.name}"
- Vitality: ${vitality}
- Harmony: ${result.aetherion.harmony.toFixed(3)}
- Sponge Harmonic: ${spongeHarmonic.toFixed(4)}${codexBlock}${quantumBlock}

Mode: ${allowAgent ? "agent" : "chat"}.${toolBlock}

Respond in markdown. Be direct and substantive. Use the engine state only when it actually informs the answer.`;


    // ── Personal memory injection (pgvector) ──────────────────────────
    let memoryBlock = "";
    if (allowMemory) {
      try {
        const embResp = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: EMBED_MODEL, input: query, dimensions: EMBED_DIMENSIONS }),
        });
        if (embResp.ok) {
          const ej = await embResp.json();
          const vec = ej?.data?.[0]?.embedding;
          if (Array.isArray(vec)) {
            const { data: matches } = await userClient.rpc("match_user_memories", {
              _query_embedding: vec as unknown as string,
              _match_count: 5,
              _min_similarity: 0.55,
            });
            if (Array.isArray(matches) && matches.length > 0) {
              const snippets = matches.map((m: { content: string }) => `• ${m.content.slice(0, 500)}`);
              memoryBlock = ("\n\nRELEVANT USER CONTEXT (from prior sessions):\n" + snippets.join("\n")).slice(0, 2500);
            }
          }
        }
      } catch (e) { console.warn("memory recall skipped:", e); }
    }

    const messages: Array<{ role: string; content: string; tool_call_id?: string; tool_calls?: unknown }> = [
      { role: "system", content: systemPrompt + memoryBlock },
      ...safeHistory,
      { role: "user", content: query },
    ];

    // ── Agent mode: bounded tool loop (non-streaming) ─────────────────
    if (allowAgent) {
      const tools = [
        {
          type: "function",
          function: {
            name: "memory_recall",
            description: "Search the user's personal memory chain for context relevant to a query.",
            parameters: {
              type: "object",
              properties: { query: { type: "string", description: "Concept or topic to recall" } },
              required: ["query"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "oracle_consult",
            description: "Re-run the Caduceus engine on a different Word of Power for harmonic context.",
            parameters: {
              type: "object",
              properties: { word: { type: "string", description: "Word of Power (max 64 chars)" } },
              required: ["word"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "brc20_aetx_status",
            description: "Get the deploy status of the AETX BRC-20 token (Aetherion Excalibur on Bitcoin).",
            parameters: { type: "object", properties: {} },
          },
        },
      ];

      const MAX_STEPS = 6;
      let agentMessages = [...messages];
      for (let step = 0; step < MAX_STEPS; step++) {
        if (req.signal.aborted) return new Response(null, { status: 499 });
        const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: chosenModel, messages: agentMessages, tools, tool_choice: "auto", max_tokens: 2048 }),
          signal: req.signal,
        });
        if (!r.ok) {
          const t = await r.text();
          console.error("agent gateway:", r.status, t);
          return new Response(JSON.stringify({ error: r.status === 402 ? "Agent credits exhausted." : "Agent loop failed." }), {
            status: r.status === 402 ? 402 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const j = await r.json();
        const choice = j?.choices?.[0]?.message;
        if (!choice) break;
        const toolCalls = choice.tool_calls as Array<{ id: string; function: { name: string; arguments: string } }> | undefined;

        if (!toolCalls || toolCalls.length === 0) {
          return new Response(JSON.stringify({
            answer: choice.content ?? "",
            oracleState,
            mode: "agent",
            steps: step + 1,
          }), {
            headers: {
              ...corsHeaders, "Content-Type": "application/json",
              "X-Oracle-State": encodeURIComponent(JSON.stringify(oracleState)),
              "X-Quota-Remaining": String(quota.remaining),
              "X-Tier": userTier,
            },
          });
        }

        agentMessages.push({ role: "assistant", content: choice.content ?? "", tool_calls: toolCalls });
        for (const call of toolCalls) {
          let result: unknown = { error: "unknown_tool" };
          try {
            const args = JSON.parse(call.function.arguments || "{}");
            if (call.function.name === "memory_recall") {
              const q = String(args.query ?? "").slice(0, 500);
              try {
                const er = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
                  method: "POST",
                  headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
                  body: JSON.stringify({ model: EMBED_MODEL, input: q, dimensions: EMBED_DIMENSIONS }),
                });
                const ej = await er.json();
                const vec = ej?.data?.[0]?.embedding;
                const { data: matches } = await userClient.rpc("match_user_memories", {
                  _query_embedding: vec, _match_count: 5, _min_similarity: 0.5,
                });
                result = { matches: (matches ?? []).map((m: { content: string }) => m.content) };
              } catch (e) { result = { error: String(e) }; }
            } else if (call.function.name === "oracle_consult") {
              const w = String(args.word ?? "").slice(0, 64) || "void";
              const c = await createCaduceus(`AetherionAgentTool::${w}`);
              const res = await c.speakBoth(w);
              result = {
                word: w,
                sphinx: SPHINX_NAMES[res.sphinx.state],
                anubis: ANUBIS_NAMES[res.anubis.state],
                vitality: VITALITY[res.sphinx.state],
                harmony: res.aetherion.harmony,
                hexagram: HEXAGRAMS[res.sphinx.hexagram.number % HEXAGRAMS.length],
              };
            } else if (call.function.name === "brc20_aetx_status") {
              const { data } = await admin.from("brc20_tokens")
                .select("tick,status,inscription_id,reveal_tx,max,lim,created_at")
                .eq("tick", "AETX").eq("network", "mainnet")
                .order("created_at", { ascending: false }).limit(1).maybeSingle();
              result = data ?? { status: "not_deployed" };
            }
          } catch (e) { result = { error: String(e) }; }
          agentMessages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result).slice(0, 4000) });
        }
      }

      return new Response(JSON.stringify({ answer: "Agent reached step limit without converging.", oracleState, mode: "agent", steps: MAX_STEPS }), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "X-Oracle-State": encodeURIComponent(JSON.stringify(oracleState)), "X-Tier": userTier },
      });
    }

    // ── Oracle (chat) mode: streaming with client-disconnect propagation ──
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: chosenModel, messages, stream: true, max_tokens: 1024 }),
      signal: req.signal, // abort the upstream fetch when the client disconnects
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "The Oracle pauses — too many seekers. Try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "The Oracle's well is dry — add credits to Lovable AI." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiResp.text();
      console.error("AI gateway:", aiResp.status, t);
      return new Response(JSON.stringify({ error: "The void is silent." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(aiResp.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "X-Oracle-State": encodeURIComponent(JSON.stringify(oracleState)),
        "X-Quota-Remaining": String(quota.remaining),
        "X-Quota-Limit": String(quota.limit ?? DAILY_LIMIT),
        "X-Quota-Subscribed": quota.subscribed ? "1" : "0",
        "X-Tier": userTier,
      },
    });
  } catch (e) {
    console.error("aetherion error:", e);
    // Do not leak internal error details to the client.
    return new Response(JSON.stringify({ error: "An unexpected error occurred. The void is silent." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
