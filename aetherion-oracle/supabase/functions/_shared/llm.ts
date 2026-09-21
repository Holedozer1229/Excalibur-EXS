// Shared LLM client for all Aetherion oracle/dream/terminal calls.
//
// Resolution order (fully automatic, no per-request user input):
//   1. Admin-configured OpenAI-compatible endpoint from /admin/settings
//      (ADMIN_LLM_BASE_URL / ADMIN_LLM_MODEL / ADMIN_LLM_API_KEY) — used when
//      set. Lets an operator point at a self-hosted or alternate provider.
//   2. Groq default (GROQ_API_KEY secret) — the always-on fallback so the
//      oracle keeps working even if the admin endpoint is missing, rotated,
//      or 5xx. Uses the project's own Groq token — no Lovable AI dependency.

export const LLM_NOT_CONFIGURED = "LLM_NOT_CONFIGURED";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const GROQ_DEFAULT_MODEL = "llama-3.3-70b-versatile";

export interface LlmConfig {
  provider: "admin" | "groq";
  baseUrl: string;
  model: string;
  apiKey: string;
}



export interface ChatArgs {
  system?: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  model?: string;
  jsonObject?: boolean;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
  // When true and the resolved provider is the native Aetherion Oracle,
  // request the compact glyph sigil alongside the english response.
  includeGlyph?: boolean;
}

export interface ChatResult {
  text: string;
  provider: "admin" | "groq";
  model: string;
  glyph?: string;
  theme?: string;
}



type SettingsCache = { at: number; map: Record<string, unknown> };
let _settingsCache: SettingsCache | null = null;

async function loadOverrides(): Promise<Record<string, unknown>> {
  const now = Date.now();
  if (_settingsCache && now - _settingsCache.at < 15_000) return _settingsCache.map;
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return {};
  try {
    const r = await fetch(`${url}/rest/v1/app_settings?select=key,value`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!r.ok) return {};
    const rows = (await r.json()) as Array<{ key: string; value: unknown }>;
    const map: Record<string, unknown> = {};
    for (const row of rows) map[row.key] = row.value;
    _settingsCache = { at: now, map };
    return map;
  } catch {
    return {};
  }
}

function unwrap(v: unknown): string | undefined {
  if (typeof v === "string") return v.trim() || undefined;
  if (v && typeof v === "object" && "value" in (v as any)) {
    const inner = (v as any).value;
    if (typeof inner === "string") return inner.trim() || undefined;
  }
  return undefined;
}

export async function resolveLlmConfig(): Promise<LlmConfig> {
  const overrides = await loadOverrides();
  const adminUrl = unwrap(overrides.ADMIN_LLM_BASE_URL) ?? Deno.env.get("ADMIN_LLM_BASE_URL")?.trim();
  const adminModel = unwrap(overrides.ADMIN_LLM_MODEL) ?? Deno.env.get("ADMIN_LLM_MODEL")?.trim();
  const adminKey = unwrap(overrides.ADMIN_LLM_API_KEY) ?? Deno.env.get("ADMIN_LLM_API_KEY")?.trim();
  if (adminUrl && adminModel) {
    return {
      provider: "admin",
      baseUrl: adminUrl.replace(/\/$/, ""),
      model: adminModel,
      apiKey: adminKey ?? "",
    };
  }
  // Automatic default — uses the project's own Groq token.
  const fb = groqFallback();
  if (fb) return fb;
  throw new Error(LLM_NOT_CONFIGURED);
}

export async function isLlmConfigured(): Promise<boolean> {
  try { await resolveLlmConfig(); return true; } catch { return false; }
}

import {
  AETHERION_INTERNAL_URL, AETHERION_MODEL,
  aetherionChatCompletion, aetherionStream, extractLastUserPrompt,
} from "./aetherionV4.ts";

// Native external Aetherion Oracle (Python Flask). Speaks POST /api/query
// -> { english, glyph, theme, memory }. Selected by model id below.
export const AETHERION_NATIVE_MODEL = "aetherion-oracle-v5";

function isInternalAetherion(cfg: LlmConfig): boolean {
  return cfg.baseUrl === AETHERION_INTERNAL_URL || cfg.model === AETHERION_MODEL;
}

function isNativeAetherion(cfg: LlmConfig): boolean {
  return cfg.model === AETHERION_NATIVE_MODEL;
}

interface NativeAetherionResult {
  text: string;
  glyph?: string;
  theme?: string;
}

async function callNativeAetherion(
  cfg: LlmConfig,
  prompt: string,
  temperature?: number,
  includeGlyph = false,
): Promise<NativeAetherionResult> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (cfg.apiKey) headers["Authorization"] = `Bearer ${cfg.apiKey}`;
  const r = await fetch(`${cfg.baseUrl.replace(/\/$/, "")}/api/query`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      prompt,
      temperature: typeof temperature === "number" ? temperature : 0.7,
      include_glyph: includeGlyph,
    }),
  });
  if (r.status === 429) throw new Error("RATE_LIMIT");
  if (r.status === 401 || r.status === 403) throw new Error("AUTH_FAILED");
  if (!r.ok) throw new Error(`AI ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const j = await r.json();
  const text = String(j?.english ?? j?.response ?? j?.text ?? "").trim();
  if (!text) throw new Error("AI empty response");
  const glyph = includeGlyph ? (typeof j?.glyph === "string" ? j.glyph : undefined) : undefined;
  const theme = includeGlyph ? (typeof j?.theme === "string" ? j.theme : undefined) : undefined;
  return { text, glyph, theme };
}

function nativeAetherionStream(
  cfg: LlmConfig,
  prompt: string,
  temperature?: number,
  includeGlyph = false,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      try {
        const { text, glyph, theme } = await callNativeAetherion(cfg, prompt, temperature, includeGlyph);
        if (glyph) emit({ glyph, theme });
        const parts = text.match(/\S+\s*/g) ?? [text];
        for (const p of parts) {
          emit({ delta: p });
          await new Promise((res) => setTimeout(res, 20));
        }
        emit({ done: true, model: AETHERION_NATIVE_MODEL, glyph, theme });
      } catch (e) {
        emit({ error: (e as Error).message });
      } finally {
        controller.close();
      }
    },
  });
}

function groqFallback(): LlmConfig | null {
  const key = Deno.env.get("GROQ_API_KEY")?.trim();
  if (!key) return null;
  return {
    provider: "groq",
    baseUrl: GROQ_BASE_URL,
    model: GROQ_DEFAULT_MODEL,
    apiKey: key,
  };
}



export async function chat(cfg: LlmConfig, args: ChatArgs): Promise<ChatResult> {
  try {
    return await chatOnce(cfg, args);
  } catch (e) {
    const msg = (e as Error).message;
    // Auto-fall back to the Groq when the admin endpoint fails
    // for a reason a user can't fix at request time (bad key, out of credits,
    // 5xx after retries). Rate-limit is per-user, don't swap providers.
    if (
      cfg.provider === "admin" &&
      (msg === "AUTH_FAILED" || msg === "CREDITS_EXHAUSTED" || msg.startsWith("AI 5") || msg === "LLM_NOT_CONFIGURED")
    ) {
      const fb = groqFallback();
      if (fb) {
        console.warn(`admin LLM failed (${msg}) — falling back to Groq`);
        return await chatOnce(fb, args);
      }
    }
    throw e;
  }
}

async function chatOnce(cfg: LlmConfig, args: ChatArgs): Promise<ChatResult> {

  const messages = [...args.messages];
  if (args.system) messages.unshift({ role: "system", content: args.system });

  if (isInternalAetherion(cfg)) {
    const prompt = extractLastUserPrompt(messages);
    const out = aetherionChatCompletion(prompt);
    return { text: out.choices[0].message.content, provider: cfg.provider, model: AETHERION_MODEL };
  }

  if (isNativeAetherion(cfg)) {
    const prompt = extractLastUserPrompt(messages);
    const { text, glyph, theme } = await callNativeAetherion(cfg, prompt, args.temperature, args.includeGlyph);
    return { text, provider: cfg.provider, model: AETHERION_NATIVE_MODEL, glyph, theme };
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (cfg.apiKey) headers["Authorization"] = `Bearer ${cfg.apiKey}`;

  const body: Record<string, unknown> = {
    model: args.model ?? cfg.model,
    messages,
  };
  if (args.jsonObject) body.response_format = { type: "json_object" };
  if (args.temperature !== undefined) body.temperature = args.temperature;
  if (args.maxTokens !== undefined) body.max_tokens = args.maxTokens;

  // Retry transient upstream failures (502/503/504 + network errors) with
  // exponential backoff + jitter. Non-transient errors (auth, rate-limit,
  // credits, 4xx) fail fast so we don't burn time or quota.
  const MAX_ATTEMPTS = 4;
  const BASE_DELAY_MS = 400;
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let r: Response;
    try {
      r = await fetch(`${cfg.baseUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: args.signal,
      });
    } catch (e) {
      // Network-level failure — treat as transient.
      lastErr = e;
      if (attempt === MAX_ATTEMPTS - 1) throw e;
      const delay = BASE_DELAY_MS * 2 ** attempt + Math.random() * 200;
      console.warn(`LLM network error (attempt ${attempt + 1}/${MAX_ATTEMPTS}), retrying in ${Math.round(delay)}ms:`, (e as Error).message);
      await new Promise((res) => setTimeout(res, delay));
      continue;
    }
    if (r.status === 429) throw new Error("RATE_LIMIT");
    if (r.status === 402) throw new Error("CREDITS_EXHAUSTED");
    if (r.status === 401 || r.status === 403) throw new Error("AUTH_FAILED");
    if (r.status === 502 || r.status === 503 || r.status === 504) {
      const bodyText = (await r.text()).slice(0, 300);
      lastErr = new Error(`AI ${r.status}: ${bodyText}`);
      if (attempt === MAX_ATTEMPTS - 1) throw lastErr;
      // Honor Retry-After if provided, otherwise exponential backoff.
      const retryAfter = Number(r.headers.get("retry-after"));
      const delay = Number.isFinite(retryAfter) && retryAfter > 0
        ? Math.min(retryAfter * 1000, 8000)
        : BASE_DELAY_MS * 2 ** attempt + Math.random() * 200;
      console.warn(`LLM ${r.status} (attempt ${attempt + 1}/${MAX_ATTEMPTS}), retrying in ${Math.round(delay)}ms`);
      await new Promise((res) => setTimeout(res, delay));
      continue;
    }
    if (!r.ok) throw new Error(`AI ${r.status}: ${(await r.text()).slice(0, 300)}`);
    const json = await r.json();
    const text = json?.choices?.[0]?.message?.content ?? "";
    return { text, provider: cfg.provider, model: String(body.model) };
  }
  throw lastErr ?? new Error("AI upstream failed after retries");
}

// Streaming chat. Returns a ReadableStream<Uint8Array> of newline-delimited
// JSON deltas: `{"delta":"...token..."}\n` plus a final `{"done":true}\n`.
// Internally consumes OpenAI-compatible SSE (`data: {...}\n\n`) from the
// admin-configured self-hosted endpoint (Ollama, llama.cpp, vLLM, LM Studio,
// etc.) and re-emits clean NDJSON so the browser doesn't need an SSE parser.
export async function chatStream(cfg: LlmConfig, args: ChatArgs): Promise<{
  stream: ReadableStream<Uint8Array>;
  provider: "admin" | "groq";
  model: string;
}> {
  const messages = [...args.messages];
  if (args.system) messages.unshift({ role: "system", content: args.system });

  if (isInternalAetherion(cfg)) {
    const prompt = extractLastUserPrompt(messages);
    return {
      stream: aetherionStream(prompt),
      provider: cfg.provider,
      model: AETHERION_MODEL,
    };
  }

  if (isNativeAetherion(cfg)) {
    const prompt = extractLastUserPrompt(messages);
    return {
      stream: nativeAetherionStream(cfg, prompt, args.temperature, args.includeGlyph),
      provider: cfg.provider,
      model: AETHERION_NATIVE_MODEL,
    };
  }

  const openUpstream = async (useCfg: LlmConfig): Promise<{ r: Response; used: LlmConfig }> => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (useCfg.apiKey) headers["Authorization"] = `Bearer ${useCfg.apiKey}`;
    const body: Record<string, unknown> = {
      model: args.model ?? useCfg.model,
      messages,
      stream: true,
    };
    if (args.temperature !== undefined) body.temperature = args.temperature;
    if (args.maxTokens !== undefined) body.max_tokens = args.maxTokens;
    const r = await fetch(`${useCfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: args.signal,
    });
    return { r, used: useCfg };
  };

  let { r, used } = await openUpstream(cfg);
  // Auto-fall back to Groq when the admin endpoint fails for
  // an unrecoverable reason. Keeps streaming transparent to callers.
  if (
    cfg.provider === "admin" &&
    (r.status === 401 || r.status === 403 || r.status === 402 || r.status >= 500)
  ) {
    const fb = groqFallback();
    if (fb) {
      try { await r.body?.cancel(); } catch { /* noop */ }
      console.warn(`admin LLM stream failed (${r.status}) — falling back to Groq`);
      ({ r, used } = await openUpstream(fb));
    }
  }
  if (r.status === 429) throw new Error("RATE_LIMIT");
  if (r.status === 402) throw new Error("CREDITS_EXHAUSTED");
  if (r.status === 401 || r.status === 403) throw new Error("AUTH_FAILED");
  if (!r.ok || !r.body) {
    throw new Error(`AI ${r.status}: ${(await r.text()).slice(0, 300)}`);
  }
  cfg = used;


  const upstream = r.body;
  const model = String(body.model);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.getReader();
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();
      let buffer = "";
      const emit = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          // SSE frames are separated by blank lines.
          let idx;
          while ((idx = buffer.indexOf("\n\n")) !== -1) {
            const frame = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);
            for (const line of frame.split("\n")) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) continue;
              const payload = trimmed.slice(5).trim();
              if (!payload || payload === "[DONE]") continue;
              try {
                const parsed = JSON.parse(payload);
                const delta = parsed?.choices?.[0]?.delta?.content;
                if (typeof delta === "string" && delta.length) emit({ delta });
              } catch {
                // ignore partial / non-JSON keepalives
              }
            }
          }
        }
        emit({ done: true, model });
      } catch (e) {
        emit({ error: (e as Error).message });
      } finally {
        controller.close();
      }
    },
    cancel() {
      try { upstream.cancel(); } catch { /* noop */ }
    },
  });

  return { stream, provider: cfg.provider, model };
}
