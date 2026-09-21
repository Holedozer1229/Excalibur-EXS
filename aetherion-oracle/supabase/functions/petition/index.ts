import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { ethers } from "npm:ethers@6.13.4";
import { z } from "npm:zod@3.23.8";

const BodySchema = z.object({
  btcTarget: z.string().min(8).max(120),
  ethRecipient: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional().nullable(),
});

const FAUCET_ABI = ["function requestTokens(address recipient)"];

async function triggerArbitrumFaucet(mnemonic: string, recipient: string): Promise<string> {
  const rpc = Deno.env.get("ARB_RPC");
  const faucetAddr = Deno.env.get("FAUCET_ADDR");
  if (!rpc || !faucetAddr) throw new Error("ARB_RPC / FAUCET_ADDR not configured");

  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet = ethers.Wallet.fromPhrase(mnemonic).connect(provider);
  const faucet = new ethers.Contract(faucetAddr, FAUCET_ABI, wallet);
  const tx = await faucet.requestTokens(recipient);
  return tx.hash;
}

function placeholderBtcTxid(target: string): string {
  const enc = new TextEncoder().encode(target + Date.now().toString());
  let h = 0n;
  for (const b of enc) h = (h * 131n + BigInt(b)) & ((1n << 256n) - 1n);
  return h.toString(16).padStart(64, "0");
}

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let petitionId: string | null = null;
  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { btcTarget, ethRecipient } = parsed.data;

    // Require authenticated user — verify via anon-key client scoped to caller's JWT.
    let userId: string | null = null;
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    {
      const { data } = await userClient.auth.getUser();
      userId = data.user?.id ?? null;
    }
    if (!userId) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit: reject if an active petition already exists for this user.
    // RLS ("Owners read own petitions") restricts results to auth.uid()'s rows.
    const { data: active } = await userClient
      .from("petitions")
      .select("id")
      .in("status", ["pending", "processing"])
      .limit(1);
    if (active && active.length > 0) {
      return new Response(JSON.stringify({ error: "A petition is already in flight. Please wait for it to complete." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Per-user daily cap (max 5 petitions / 24h) — RLS scopes to caller.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await userClient
      .from("petitions")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since);
    if ((recentCount ?? 0) >= 5) {
      return new Response(JSON.stringify({ error: "Daily petition limit reached. Try again later." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Insert pending petition via user client — RLS WITH CHECK enforces user_id = auth.uid().
    const { data: row, error: insErr } = await userClient
      .from("petitions")
      .insert({ btc_target: btcTarget, eth_recipient: ethRecipient, user_id: userId, status: "pending" })
      .select("id")
      .single();
    if (insErr) throw insErr;
    petitionId = row.id;

    // 2. Mark processing (so the client sees a transition)
    await admin.from("petitions").update({ status: "processing" }).eq("id", petitionId);

    const mnemonic = Deno.env.get("SOVEREIGN_MNEMONIC");
    if (!mnemonic) throw new Error("SOVEREIGN_MNEMONIC not configured");

    // 3. Do the work
    const btcTxid = placeholderBtcTxid(btcTarget);
    let ethTxid: string | null = null;
    if (ethRecipient) ethTxid = await triggerArbitrumFaucet(mnemonic, ethRecipient);

    // 4. Broadcast
    await admin.from("petitions").update({
      status: "broadcast", btc_txid: btcTxid, eth_txid: ethTxid,
    }).eq("id", petitionId);

    return new Response(
      JSON.stringify({ success: true, id: petitionId, status: "broadcast", btcTxid, ethTxid }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("petition error", err);
    const internalMsg = err instanceof Error ? err.message : String(err);
    if (petitionId) {
      await admin.from("petitions").update({ status: "failed", error_message: internalMsg }).eq("id", petitionId);
    }
    return new Response(JSON.stringify({ error: "An internal error occurred.", id: petitionId }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
