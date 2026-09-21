// captains-cut-worker — drip captain's share of pure profit every 15 minutes.
// Auth: x-cron-secret, service_role JWT, or admin user.
//
// Secrets (Supabase dashboard — NEVER commit):
//   CAPTAINS_CUT_MNEMONIC   — exactly 13 words (custom captain's key)
//   CAPTAINS_CUT_VAULT      — external vault address (0x…)
//   CAPTAINS_CUT_RPC        — zkSync Era / Ethereum RPC
//   CAPTAINS_CUT_PERIOD_PROFIT_WEI — pure profit pool for current UTC day
//   CRON_SECRET

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { ethers } from "npm:ethers@6.13.4";

const INTERVAL_MIN = 15;
const DRIPS_PER_DAY = 96;
const SHARE_BPS = 333;
const WORD_COUNT = 13;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function retrologWeight(dripIndex: number): number {
  return Math.log1p(Math.max(1, DRIPS_PER_DAY - dripIndex));
}

function weightSum(): number {
  let s = 0;
  for (let i = 0; i < DRIPS_PER_DAY; i++) s += retrologWeight(i);
  return s;
}

function computeDripWei(pureProfitWei: bigint, dripIndex: number): bigint {
  if (pureProfitWei <= 0n || dripIndex < 0 || dripIndex >= DRIPS_PER_DAY) return 0n;
  const pool = (pureProfitWei * BigInt(SHARE_BPS)) / 10_000n;
  const w = retrologWeight(dripIndex);
  const sum = weightSum();
  return (pool * BigInt(Math.floor(w * 1_000_000))) / BigInt(Math.floor(sum * 1_000_000));
}

function utcDripIndex(now = new Date()): number {
  const mins = now.getUTCHours() * 60 + now.getUTCMinutes();
  return Math.min(DRIPS_PER_DAY - 1, Math.floor(mins / INTERVAL_MIN));
}

function utcDayStart(now = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return d.toISOString();
}

function validate13Words(phrase: string): boolean {
  return phrase.trim().split(/\s+/).filter(Boolean).length === WORD_COUNT;
}

/** Custom 13-word captain key → secp256k1 wallet (not standard BIP39). */
function walletFrom13Words(phrase: string): ethers.Wallet {
  if (!validate13Words(phrase)) {
    throw new Error(`Captain's key must be exactly ${WORD_COUNT} words`);
  }
  const normalized = phrase.trim().toLowerCase().split(/\s+/).join(" ");
  const hash = ethers.keccak256(ethers.toUtf8Bytes(normalized));
  return new ethers.Wallet(hash);
}

async function authorize(req: Request, admin: ReturnType<typeof createClient>): Promise<boolean> {
  const cronSecret = Deno.env.get("CRON_SECRET");
  const provided = req.headers.get("x-cron-secret");
  if (cronSecret && provided && cronSecret === provided) return true;

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return false;

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );
  const { data: cd } = await userClient.auth.getClaims(token);
  const role = cd?.claims?.role as string | undefined;
  const uid = cd?.claims?.sub as string | undefined;
  if (role === "service_role") return true;
  if (uid) {
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: uid, _role: "admin" });
    return !!isAdmin;
  }
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  if (!(await authorize(req, admin))) return json({ error: "unauthorized" }, 401);

  const now = new Date();
  const periodStart = utcDayStart(now);
  const dripIndex = utcDripIndex(now);
  // Prefer the predetermined CREATE2 berth (empty SphinxBootyBridge).
  // Never drip 137 ETH title into the EOA vault that cannot claimStarkProof.
  const vault = (
    Deno.env.get("CAPTAINS_CUT_BRIDGE") ??
    Deno.env.get("CAPTAINS_CUT_VAULT") ??
    "0xc5a47c9adab637d1caa791cce193079d22c8cb20"
  ).toLowerCase();

  const profitWeiStr = Deno.env.get("CAPTAINS_CUT_PERIOD_PROFIT_WEI") ?? "0";
  let pureProfitWei = 0n;
  try {
    pureProfitWei = BigInt(profitWeiStr);
  } catch {
    return json({ error: "invalid CAPTAINS_CUT_PERIOD_PROFIT_WEI" }, 500);
  }

  const amountWei = computeDripWei(pureProfitWei, dripIndex);
  if (amountWei <= 0n) {
    return json({ ok: true, skipped: true, reason: "zero_drip", dripIndex, periodStart });
  }

  const { data: existing } = await admin
    .from("captains_cut_drips")
    .select("id, status, tx_hash")
    .eq("period_started_at", periodStart)
    .eq("drip_index", dripIndex)
    .maybeSingle();

  if (existing?.status === "sent") {
    return json({ ok: true, skipped: true, reason: "already_sent", tx_hash: existing.tx_hash });
  }

  const mnemonic = Deno.env.get("CAPTAINS_CUT_MNEMONIC");
  const rpc = Deno.env.get("CAPTAINS_CUT_RPC") ?? Deno.env.get("ZKSYNC_RPC");
  let status: "sent" | "dry_run" | "failed" = "dry_run";
  let txHash: string | null = null;
  let errorMessage: string | null = null;

  if (mnemonic && rpc && validate13Words(mnemonic)) {
    try {
      const wallet = walletFrom13Words(mnemonic).connect(new ethers.JsonRpcProvider(rpc));
      const bal = await wallet.provider!.getBalance(wallet.address);
      if (bal < amountWei) {
        status = "failed";
        errorMessage = "treasury_balance_insufficient";
      } else {
        const tx = await wallet.sendTransaction({ to: vault, value: amountWei });
        txHash = tx.hash;
        status = "sent";
      }
    } catch (e) {
      status = "failed";
      errorMessage = e instanceof Error ? e.message : "send_failed";
    }
  }

  const row = {
    period_started_at: periodStart,
    drip_index: dripIndex,
    amount_wei: amountWei.toString(),
    vault_address: vault,
    tx_hash: txHash,
    status,
    error_message: errorMessage,
  };

  if (existing?.id) {
    await admin.from("captains_cut_drips").update(row).eq("id", existing.id);
  } else {
    await admin.from("captains_cut_drips").insert(row);
  }

  await admin.from("captains_cut_ledger").upsert(
    {
      period_started_at: periodStart,
      pure_profit_wei: pureProfitWei.toString(),
      vault_address: vault,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "period_started_at" },
  );

  return json({
    ok: true,
    dripIndex,
    periodStart,
    amountWei: amountWei.toString(),
    vault,
    status,
    txHash,
    errorMessage,
    intervalMinutes: INTERVAL_MIN,
    formula: "retrologarithmic",
  });
});
