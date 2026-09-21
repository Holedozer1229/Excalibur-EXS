// Voice transcription — forwards a client-uploaded audio blob to the
// Lovable AI Gateway /v1/audio/transcriptions endpoint and streams the
// SSE transcript deltas back unchanged.
//
// Auth-gated: an authenticated user is required so anonymous callers
// cannot spend workspace credits.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/audio/transcriptions";
const MAX_BYTES = 20 * 1024 * 1024; // 20 MiB — well under gateway cap
const ALLOWED_TYPES = new Set([
  "audio/wav", "audio/wave", "audio/x-wav",
  "audio/webm", "audio/mp4", "audio/mpeg", "audio/mp3", "audio/ogg",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Require an authenticated user.
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
  );
  const { data: userData, error: userErr } = await supa.auth.getUser(token);
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return new Response(JSON.stringify({ error: "expected_multipart" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return new Response(JSON.stringify({ error: "missing_file" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (file.size === 0 || file.size < 2048) {
    return new Response(JSON.stringify({ error: "empty_recording" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (file.size > MAX_BYTES) {
    return new Response(JSON.stringify({ error: "file_too_large" }), {
      status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const mime = (file.type || "").split(";")[0];
  if (mime && !ALLOWED_TYPES.has(mime)) {
    return new Response(JSON.stringify({ error: "unsupported_type", mime }), {
      status: 415, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Name the upload for its container so OpenAI infers format correctly.
  const ext = ({
    "audio/wav": "wav", "audio/wave": "wav", "audio/x-wav": "wav",
    "audio/webm": "webm", "audio/mp4": "mp4", "audio/mpeg": "mp3",
    "audio/mp3": "mp3", "audio/ogg": "ogg",
  } as Record<string, string>)[mime] ?? "wav";

  const upstream = new FormData();
  upstream.append("model", "openai/gpt-4o-mini-transcribe");
  upstream.append("file", file, `recording.${ext}`);
  upstream.append("stream", "true");

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: upstream,
  });
  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    console.error("stt upstream failed", res.status, detail);
    return new Response(JSON.stringify({ error: "stt_failed", status: res.status, detail }), {
      status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return new Response(res.body, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" },
  });
});
