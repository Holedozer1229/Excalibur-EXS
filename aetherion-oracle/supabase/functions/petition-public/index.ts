import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function mask(s: string | null | undefined, head = 6, tail = 4): string | null {
  if (!s) return null;
  if (s.length <= head + tail + 2) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
      return new Response(JSON.stringify({ error: "invalid id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await admin
      .from("petitions")
      .select("id, status, btc_target, eth_recipient, btc_txid, eth_txid, created_at, updated_at")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      return new Response(JSON.stringify({ error: "not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // sanitized public view
    const publicPetition = {
      id: data.id,
      status: data.status,
      btc_target_masked: mask(data.btc_target, 6, 6),
      eth_recipient_masked: mask(data.eth_recipient, 6, 4),
      btc_txid: data.btc_txid, // tx hashes are public chain data
      eth_txid: data.eth_txid,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    return new Response(JSON.stringify(publicPetition), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=15, s-maxage=30",
      },
    });
  } catch (err) {
    console.error("petition-public error:", err);
    return new Response(JSON.stringify({ error: "An internal error occurred." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
