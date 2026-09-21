// Public read endpoint for the cross-chain lattice mapping.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data, error } = await supabase
      .from("cross_chain_nodes")
      .select("chain,tick,standard,venue,note,accent,href,edge_to,edge_label,sort_order")
      .eq("active", true)
      .order("sort_order", { ascending: true });

    if (error) throw error;

    const nodes = (data ?? []).map((r) => ({
      chain: r.chain,
      tick: r.tick,
      standard: r.standard,
      venue: r.venue,
      note: r.note,
      accent: r.accent,
      href: r.href,
      edgeTo: r.edge_to,
      edgeLabel: r.edge_label,
    }));

    const edges = nodes
      .filter((n) => n.edgeTo && n.edgeLabel)
      .map((n) => ({ from: n.tick, to: n.edgeTo, label: n.edgeLabel }));

    return new Response(JSON.stringify({ nodes, edges, updatedAt: new Date().toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=300" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e instanceof Error ? e.message : e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
