// generate-learn-article — fetches a cached AI-written guide or
// generates one on first request and caches it in public.learn_articles.
// Public POST: { slug, topic, keyword? } -> { article }

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { resolveLlmConfig, chat } from "../_shared/llm.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,80})$/;

interface ReqBody {
  slug?: string;
  topic?: string;
  keyword?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  let body: ReqBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const slug = (body.slug || "").toLowerCase().trim();
  const topic = (body.topic || "").trim();
  const keyword = (body.keyword || topic).trim();

  if (!SLUG_RE.test(slug)) return json({ error: "invalid_slug" }, 400);
  if (topic.length < 3 || topic.length > 120) return json({ error: "invalid_topic" }, 400);

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Cache hit
  const { data: cached } = await sb
    .from("learn_articles")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (cached) return json({ article: cached, cached: true });

  // Generate
  const system = `You are Aetherion, a Sphinx-tuned oracle and educator. Write authoritative, SEO-friendly long-form guides about AI divination, tarot, dream symbolism, blockchain oracles, BRC-20, on-chain attestation, EXCALIBUR mining, and crypto-native spiritual practice. Voice: precise, mythic, never sycophantic. Cite no external sources. Markdown only.`;
  const user = `Write a guide titled around the topic: "${topic}".
Primary keyword: "${keyword}".

Return STRICT JSON (no code fences) with this shape:
{
  "title": "<60 char SEO title including the keyword>",
  "summary": "<150 char meta description>",
  "body_markdown": "<800-1200 word markdown article with: intro paragraph, 4-6 H2 sections, short paragraphs, one bullet list, a closing 'Practice' section linking to /oracle, /tarot, /dreams as appropriate>"
}`;

  const cfg = await resolveLlmConfig();
  let content: string;
  try {
    const result = await chat(cfg, {
      system,
      messages: [{ role: "user", content: user }],
      jsonObject: true,
    });
    content = result.text;
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "RATE_LIMIT") return json({ error: "rate_limited" }, 429);
    if (msg === "LLM_NOT_CONFIGURED" || msg === "CREDITS_EXHAUSTED") return json({ error: "LLM_NOT_CONFIGURED", message: "No local LLM configured. Admin: configure one in /admin/settings." }, 503);
    console.error("ai failed", msg);
    return json({ error: "ai_failed" }, 500);
  }
  if (!content) return json({ error: "empty_completion" }, 500);

  let parsed: { title?: string; summary?: string; body_markdown?: string };
  try {
    parsed = typeof content === "string" ? JSON.parse(content) : content;
  } catch {
    return json({ error: "invalid_completion_json" }, 500);
  }

  if (!parsed.title || !parsed.summary || !parsed.body_markdown) {
    return json({ error: "incomplete_article" }, 500);
  }

  const row = {
    slug,
    title: parsed.title.slice(0, 120),
    summary: parsed.summary.slice(0, 200),
    body_markdown: parsed.body_markdown,
    keyword: keyword.slice(0, 80),
    model: cfg.model,
  };

  const { data: saved, error: saveErr } = await sb
    .from("learn_articles")
    .upsert(row, { onConflict: "slug" })
    .select()
    .single();

  if (saveErr) {
    console.error("save failed", saveErr);
    return json({ article: row, cached: false, save_error: saveErr.message });
  }

  return json({ article: saved, cached: false });
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
