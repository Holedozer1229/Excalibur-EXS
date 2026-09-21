// Aetherion — Replicate webhook receiver.
// Called by Replicate when a prediction completes. Downloads output, uploads to
// the private `gallery` storage bucket, mints a long-lived signed URL, and
// marks the `media_generations` row completed/failed.
// Authenticated via a token derived from SUPABASE_SERVICE_ROLE_KEY (passed as ?token=).
// Public (no JWT) — Replicate cannot send Authorization headers.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
};

async function deriveWebhookToken(): Promise<string> {
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const buf = new TextEncoder().encode(`replicate-webhook:${secret}`);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).slice(0, 16).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("method", { status: 405 });

  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const jobId = url.searchParams.get("job") ?? "";
  const expected = await deriveWebhookToken();
  if (!token || token !== expected || !jobId) {
    return new Response("forbidden", { status: 403 });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    const payload = await req.json();
    const status: string = payload.status ?? "unknown";

    const { data: job } = await admin.from("media_generations").select("*").eq("id", jobId).maybeSingle();
    if (!job) return new Response("job not found", { status: 404 });
    // Idempotent: ignore if already finalized
    if (job.status === "completed" || job.status === "failed") {
      return new Response(JSON.stringify({ ok: true, ignored: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (status === "failed" || status === "canceled") {
      await admin.from("media_generations").update({
        status: "failed",
        error: String(payload.error ?? status).slice(0, 500),
      }).eq("id", jobId);
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (status !== "succeeded") {
      // Intermediate event — ignore (we only subscribed to "completed" but be safe)
      return new Response(JSON.stringify({ ok: true, skipped: status }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const out = payload.output;
    const outputUrl = Array.isArray(out) ? out[0] : out;
    if (typeof outputUrl !== "string") {
      await admin.from("media_generations").update({ status: "failed", error: "unexpected output shape" }).eq("id", jobId);
      return new Response("bad output", { status: 200 });
    }

    // Download & re-upload to public storage so URL doesn't expire
    const mediaResp = await fetch(outputUrl);
    if (!mediaResp.ok) {
      await admin.from("media_generations").update({ status: "failed", error: `fetch output ${mediaResp.status}` }).eq("id", jobId);
      return new Response("fetch failed", { status: 200 });
    }
    const bytes = new Uint8Array(await mediaResp.arrayBuffer());
    const respCt = (mediaResp.headers.get("content-type") ?? "").toLowerCase();
    let ext: string;
    let contentType: string;
    if (job.kind === "image") {
      if (respCt.includes("webp") || outputUrl.toLowerCase().endsWith(".webp")) {
        ext = "webp"; contentType = "image/webp";
      } else if (respCt.includes("png") || outputUrl.toLowerCase().endsWith(".png")) {
        ext = "png"; contentType = "image/png";
      } else {
        ext = "jpg"; contentType = "image/jpeg";
      }
    } else {
      ext = "mp4"; contentType = "video/mp4";
    }
    const path = `${job.user_id}/${job.dream_id ?? "misc"}-${job.kind}-${Date.now()}.${ext}`;
    const BUCKET = "gallery";
    const { error: upErr } = await admin.storage.from(BUCKET).upload(path, bytes, {
      contentType, upsert: true,
    });
    if (upErr) {
      await admin.from("media_generations").update({ status: "failed", error: `storage: ${upErr.message}` }).eq("id", jobId);
      return new Response("upload failed", { status: 200 });
    }
    // Bucket is private — mint a long-lived signed URL (1 year). The client
    // can re-sign from storage_path once this expires.
    const { data: signed, error: signErr } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 60 * 24 * 365);
    if (signErr || !signed?.signedUrl) {
      await admin.from("media_generations").update({ status: "failed", error: `sign: ${signErr?.message ?? "no url"}` }).eq("id", jobId);
      return new Response("sign failed", { status: 200 });
    }
    const publicUrl = signed.signedUrl;

    // Update dream row + job
    if (job.dream_id) {
      const col = job.kind === "image" ? "image_url" : "video_url";
      await admin.from("dreams").update({ [col]: publicUrl }).eq("id", job.dream_id);
    }
    await admin.from("media_generations").update({
      status: "completed", storage_path: path, output_url: publicUrl,
    }).eq("id", jobId);

    return new Response(JSON.stringify({ ok: true, url: publicUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("replicate-webhook error:", e);
    await admin.from("media_generations").update({ status: "failed", error: (e as Error).message.slice(0, 500) }).eq("id", jobId);
    return new Response(JSON.stringify({ error: "An internal error occurred." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
