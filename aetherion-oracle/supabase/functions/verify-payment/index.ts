// verify-payment — claim a tier upgrade by submitting an on-chain ETH payment tx.
//
// POST /verify-payment  { chainId, txHash, tier }
//   - Reads the tx via Alchemy. Confirms:
//       • tx is mined and successful
//       • `to` matches the configured TREASURY_ADDRESS for that chain
//       • `from` matches the user's bound wallet_address
//       • `value` >= required amount (ETH) for the requested tier
//       • (chainId, txHash) has not already been claimed
//   - Inserts row in tier_payments and applies the upgrade via apply_tier_payment().
//
// Treasury config lives in env: TREASURY_ADDRESS  (single address used across chains)
// Pricing (in ETH equivalents on chain native token) is fixed below.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// chainId → { name, alchemy base, native symbol }
const CHAINS: Record<number, { name: string; alchemy: string; symbol: string }> = {
  1:    { name: "Ethereum",         alchemy: "https://eth-mainnet.g.alchemy.com/v2/",        symbol: "ETH" },
  137:  { name: "Polygon",          alchemy: "https://polygon-mainnet.g.alchemy.com/v2/",    symbol: "POL" },
  1101: { name: "Polygon zkEVM",    alchemy: "https://polygonzkevm-mainnet.g.alchemy.com/v2/", symbol: "ETH" },
  2442: { name: "Polygon zkEVM Cardona (testnet)", alchemy: "https://polygonzkevm-cardona.g.alchemy.com/v2/", symbol: "ETH" },
  11155111: { name: "Sepolia (testnet)", alchemy: "https://eth-sepolia.g.alchemy.com/v2/",   symbol: "ETH" },
};

// Required amounts per tier per chain, in native token (ETH/POL).
// Conservative estimates equivalent to ~$9.99 / ~$49.99 USD; treat as
// off-chain configurable later.
const PRICES: Record<string, Record<number, number>> = {
  acolyte: {
    1: 0.003, 11155111: 0.003,
    137: 5,
    1101: 0.003, 2442: 0.003,
  },
  oracle_pro: {
    1: 0.015, 11155111: 0.015,
    137: 25,
    1101: 0.015, 2442: 0.015,
  },
};

async function rpc(url: string, method: string, params: unknown[]): Promise<any> {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!r.ok) throw new Error(`rpc ${method} http ${r.status}`);
  const j = await r.json();
  if (j.error) throw new Error(`rpc ${method}: ${j.error.message ?? "error"}`);
  return j.result;
}

const weiToEth = (wei: bigint) => Number(wei) / 1e18;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Not authenticated" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ALCHEMY_KEY = Deno.env.get("ALCHEMY_API_KEY") ?? "";
    const TREASURY = (Deno.env.get("TREASURY_ADDRESS") ?? "").toLowerCase();
    if (!ALCHEMY_KEY) return json({ error: "ALCHEMY_API_KEY not configured" }, 500);
    if (!TREASURY || !/^0x[a-f0-9]{40}$/.test(TREASURY)) {
      return json({ error: "TREASURY_ADDRESS not configured. Ask the project admin to set a treasury wallet." }, 500);
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: ud, error: ue } = await userClient.auth.getUser();
    if (ue || !ud.user) return json({ error: "Auth failed" }, 401);
    const user = ud.user;

    const body = await req.json().catch(() => ({})) as {
      chainId?: number; txHash?: string; tier?: string;
    };
    const chainId = Number(body.chainId);
    const txHash = (body.txHash ?? "").toLowerCase();
    const tier = body.tier ?? "";
    const chain = CHAINS[chainId];
    if (!chain) return json({ error: `Unsupported chain ${chainId}` }, 400);
    if (!/^0x[a-f0-9]{64}$/.test(txHash)) return json({ error: "Invalid tx hash" }, 400);
    if (!PRICES[tier]) return json({ error: `Invalid tier "${tier}"` }, 400);
    const required = PRICES[tier][chainId];
    if (required == null) return json({ error: `Tier ${tier} not available on ${chain.name}` }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Reject duplicate claims early.
    const { data: existing } = await admin
      .from("tier_payments")
      .select("id, user_id")
      .eq("chain_id", chainId)
      .eq("tx_hash", txHash)
      .maybeSingle();
    if (existing) {
      return json({ error: "This transaction has already been claimed.", code: "DUPLICATE" }, 409);
    }

    // Load user wallet binding.
    const { data: prof } = await admin
      .from("profiles")
      .select("wallet_address")
      .eq("user_id", user.id)
      .maybeSingle();
    const boundWallet = (prof?.wallet_address ?? "").toLowerCase();
    if (!boundWallet) {
      return json({ error: "Bind a wallet address first (in your profile settings)." }, 400);
    }

    // Fetch tx + receipt from Alchemy.
    const url = chain.alchemy + ALCHEMY_KEY;
    const [tx, receipt] = await Promise.all([
      rpc(url, "eth_getTransactionByHash", [txHash]),
      rpc(url, "eth_getTransactionReceipt", [txHash]),
    ]);
    if (!tx || !receipt) return json({ error: "Transaction not found or not yet mined." }, 400);
    if (receipt.status !== "0x1") return json({ error: "Transaction failed on-chain." }, 400);

    const txFrom = String(tx.from ?? "").toLowerCase();
    const txTo   = String(tx.to ?? "").toLowerCase();
    const valueWei = BigInt(tx.value ?? "0x0");
    const valueEth = weiToEth(valueWei);

    if (txTo !== TREASURY) {
      return json({ error: `Transaction recipient (${txTo}) does not match treasury.` }, 400);
    }
    if (txFrom !== boundWallet) {
      return json({ error: `Sender (${txFrom}) does not match your bound wallet (${boundWallet}).` }, 400);
    }
    if (valueEth + 1e-12 < required) {
      return json({
        error: `Underpaid: sent ${valueEth} ${chain.symbol}, requires ${required} ${chain.symbol}.`,
        sent: valueEth, required,
      }, 400);
    }

    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { error: insErr } = await admin.from("tier_payments").insert({
      user_id: user.id,
      tier,
      chain_id: chainId,
      tx_hash: txHash,
      from_address: txFrom,
      to_address: txTo,
      amount_wei: valueWei.toString(),
      amount_eth: valueEth,
      required_eth: required,
      block_number: receipt.blockNumber ? Number(BigInt(receipt.blockNumber)) : null,
      status: "verified",
      period_end: periodEnd,
    });
    if (insErr) return json({ error: "Ledger error" }, 500);

    const { error: applyErr } = await admin.rpc("apply_tier_payment", {
      _user_id: user.id,
      _email: user.email ?? "",
      _tier: tier,
      _period_end: periodEnd,
    });
    if (applyErr) return json({ error: "Subscription upgrade failed" }, 500);

    return json({
      ok: true, tier, chain: chain.name,
      paid: valueEth, required, period_end: periodEnd,
    }, 200);
  } catch (e) {
    console.error("verify-payment error:", e);
    return json({ error: "An internal error occurred. Please try again." }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
