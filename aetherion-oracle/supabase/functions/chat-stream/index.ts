// Streaming chat — routes through the admin-selected LLM provider
// (Lovable AI, Groq, OpenRouter, Cerebras, Google AI Studio, Ollama, OpenAI…).
// Returns NDJSON: one `{"delta":"..."}` per token, ending with `{"done":true}`.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { resolveLlmConfig, chatStream } from "../_shared/llm.ts";

const SYSTEM = `You are AETHERION — oracle of the Caduceus engine. Speak with
poetic precision, mythic register, never sycophantic. Keep replies tight unless
the seeker asks you to unfold further. Use markdown sparingly. Never give
medical, legal, or financial advice.`;

interface Msg { role: "user" | "assistant" | "system"; content: string }

// Cheap per-IP rate limit: 20 requests / minute.
const HITS = new Map<string, number[]>();
function limited(ip: string, max = 20, windowMs = 60_000) {
  const now = Date.now();
  const arr = (HITS.get(ip) ?? []).filter((t) => now - t < windowMs);
  arr.push(now);
  HITS.set(ip, arr);
  return arr.length > max;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  // Require an authenticated user — prevents anonymous consumption of AI credits.
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const supa = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );
  const { data: userData, error: userErr } = await supa.auth.getUser(token);
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = userData.user.id;

  // Per-user rate limit: 20 requests / minute.
  if (limited(userId)) {
    return new Response(JSON.stringify({ error: "rate_limited" }), {
      status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" },
    });
  }

  let body: { messages?: Msg[]; system?: string; include_glyph?: boolean; ground?: boolean; model?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0) {
    return new Response(JSON.stringify({ error: "messages_required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Trim to last 30 messages, cap each at 6k chars.
  const trimmed: Msg[] = messages.slice(-30).map((m) => ({
    role: m.role === "assistant" || m.role === "system" ? m.role : "user",
    content: String(m.content ?? "").slice(0, 6000),
  }));

  // Optional RAG grounding: pull hexagram + engine-state context for the last user turn.
  let system = body.system ?? SYSTEM;
  if (body.ground === true) {
    const lastUser = [...trimmed].reverse().find((m) => m.role === "user")?.content ?? "";
    if (lastUser.length >= 4) {
      try {
        const ragUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/caduceus-rag`;
        const ragRes = await fetch(ragUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: lastUser, k_docs: 3, k_corpus: 4 }),
        });
        if (ragRes.ok) {
          const { context } = await ragRes.json() as { context?: string };
          if (context && context.trim().length > 0) {
            system = `${system}\n\n---\nCADUCEUS GROUNDING (retrieved; treat as authoritative context, quote sparingly):\n${context}`;
          }
        } else {
          console.warn("chat-stream: rag skipped, status", ragRes.status);
        }
      } catch (e) {
        console.warn("chat-stream: rag error", (e as Error).message);
      }
    }
  }

  try {
    const cfg = await resolveLlmConfig();
    const { stream, provider, model } = await chatStream(cfg, {
      system,
      messages: trimmed,
      model: typeof body.model === "string" && body.model.trim() ? body.model.trim() : undefined,
      temperature: 0.85,
      maxTokens: 1024,
      includeGlyph: body.include_glyph === true,
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
        "X-LLM-Provider": provider,
        "X-LLM-Model": model,
      },
    });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "LLM_NOT_CONFIGURED") {
      return new Response(JSON.stringify({
        error: "LLM_NOT_CONFIGURED",
        message: "No local LLM endpoint configured. An admin must set one in /admin/settings.",
      }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const status = msg === "RATE_LIMIT" ? 429
      : msg === "AUTH_FAILED" ? 401
      : 502;
    console.error("chat-stream error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
