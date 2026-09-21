// Public lightweight web search used to ground oracle answers.
// Scrapes DuckDuckGo's HTML endpoint — no API key, no user data sent onward.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

function decode(s: string): string {
  return s
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Per-IP rate limit: 30 searches / minute.
const HITS = new Map<string, number[]>();
function limited(ip: string, max = 30, windowMs = 60_000) {
  const now = Date.now();
  const arr = (HITS.get(ip) ?? []).filter((t) => now - t < windowMs);
  arr.push(now);
  HITS.set(ip, arr);
  return arr.length > max;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  if (limited(ip)) return json({ error: "rate_limited" }, 429);

  let query = "";
  try {
    const body = (await req.json()) as { query?: string };
    query = String(body.query ?? "").slice(0, 300).trim();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  if (query.length < 2) return json({ error: "query_required" }, 400);

  try {
    const res = await fetch("https://html.duckduckgo.com/html/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (compatible; AetherionOracle/1.0)",
      },
      body: new URLSearchParams({ q: query }).toString(),
    });
    if (!res.ok) return json({ error: "search_upstream", status: res.status }, 502);
    const html = await res.text();

    const results: Array<{ title: string; url: string; snippet: string }> = [];
    const linkRe = /<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
    const snipRe = /class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/g;
    const snippets: string[] = [];
    let sm: RegExpExecArray | null;
    while ((sm = snipRe.exec(html)) !== null) snippets.push(decode(sm[1]));
    let lm: RegExpExecArray | null;
    while ((lm = linkRe.exec(html)) !== null && results.length < 6) {
      let url = lm[1];
      const uddg = /[?&]uddg=([^&]+)/.exec(url);
      if (uddg) url = decodeURIComponent(uddg[1]);
      if (url.startsWith("//")) url = `https:${url}`;
      results.push({ title: decode(lm[2]), url, snippet: snippets[results.length] ?? "" });
    }

    const context = results
      .map((r, i) => `[${i + 1}] ${r.title} — ${r.url}\n${r.snippet}`)
      .join("\n\n");

    return json({ query, results, context });
  } catch (e) {
    return json({ error: (e as Error).message }, 502);
  }
});
