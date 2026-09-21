// Public status endpoint: reports whether the self-contained LLM is configured.
// Used by the frontend to surface a "Configure local LLM" banner without
// exposing any secrets. Does NOT return the URL, model, or API key — only
// a boolean and (optionally) a redacted host hint for admin display.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { resolveLlmConfig } from "../_shared/llm.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const cfg = await resolveLlmConfig();
    let host = "";
    try { host = new URL(cfg.baseUrl).host; } catch { /* noop */ }
    return new Response(
      JSON.stringify({ configured: true, provider: cfg.provider, model: cfg.model, host }),
      { headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } },
    );
  } catch {
    return new Response(
      JSON.stringify({
        configured: false,
        message: "No local LLM configured. Admin: visit /admin/settings to point Aetherion at a self-hosted Ollama, llama.cpp, vLLM, or LM Studio endpoint.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } },
    );
  }
});
