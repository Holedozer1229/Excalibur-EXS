// terminal-command — built-in command dispatcher for the agent terminal.
// Tier-gated, with credit metering for heavy commands.
//
// POST { command: string, args?: object }
// Commands:
//   tier.show / tier.upgrade / invoice.list / usage.stats / credits.balance
//   eth.balance / eth.tx / eth.call / contract.read / contract.verify
//   oracle.harmony / oracle.word / oracle.sponge / mining.attest
//   referral.show / help

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ALCHEMY = Deno.env.get("ALCHEMY_API_KEY") ?? "";

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

type Tier = "seeker" | "acolyte" | "oracle_pro";
const RANK: Record<Tier, number> = { seeker: 0, acolyte: 1, oracle_pro: 2 };

interface Spec { minTier: Tier; cost: number; help: string }
const COMMANDS: Record<string, Spec> = {
  "help":               { minTier: "seeker",     cost: 0, help: "List commands" },
  "tier.show":          { minTier: "seeker",     cost: 0, help: "Show current tier + quota" },
  "tier.upgrade":       { minTier: "seeker",     cost: 0, help: "Get a checkout URL. args: { tier, interval }" },
  "invoice.list":       { minTier: "acolyte",    cost: 0, help: "Recent invoices" },
  "usage.stats":        { minTier: "seeker",     cost: 0, help: "Monthly + daily usage" },
  "credits.balance":    { minTier: "seeker",     cost: 0, help: "Show credit balance" },
  "referral.show":      { minTier: "seeker",     cost: 0, help: "Your referral code + earnings" },
  "eth.balance":        { minTier: "seeker",     cost: 0, help: "args: { address, chainId? }" },
  "eth.tx":             { minTier: "acolyte",    cost: 1, help: "args: { hash, chainId? }" },
  "eth.call":           { minTier: "acolyte",    cost: 2, help: "args: { to, data, chainId? }" },
  "contract.read":      { minTier: "acolyte",    cost: 2, help: "args: { address, method, params?, chainId? }" },
  "contract.verify":    { minTier: "oracle_pro", cost: 5, help: "args: { address, chainId? }" },
  "oracle.harmony":     { minTier: "seeker",     cost: 0, help: "args: { word? }" },
  "oracle.word":        { minTier: "seeker",     cost: 0, help: "Generate a Word of Power" },
  "oracle.sponge":      { minTier: "acolyte",    cost: 1, help: "args: { word, depth? }" },
  "mining.attest":      { minTier: "acolyte",    cost: 3, help: "Mint a mining attestation" },
};

const CHAINS: Record<number, string> = {
  1:        "https://eth-mainnet.g.alchemy.com/v2/",
  11155111: "https://eth-sepolia.g.alchemy.com/v2/",
  8453:     "https://base-mainnet.g.alchemy.com/v2/",
  10:       "https://opt-mainnet.g.alchemy.com/v2/",
  137:      "https://polygon-mainnet.g.alchemy.com/v2/",
};

function rpcUrl(chainId: number) {
  const base = CHAINS[chainId];
  if (!base) throw new Error(`Unsupported chainId ${chainId}`);
  if (!ALCHEMY) throw new Error("ALCHEMY_API_KEY not configured");
  return base + ALCHEMY;
}

async function rpc(chainId: number, method: string, params: unknown[]) {
  const r = await fetch(rpcUrl(chainId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message);
  return j.result;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const startedAt = Date.now();
  let userId = "";
  let cmd = "";
  let cost = 0;
  let userTier: Tier = "seeker";

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
    // Validate JWT against Auth server (not just local decode)
    const { data: ud, error: ue } = await userClient.auth.getUser();
    if (ue || !ud?.user) return json({ error: "Unauthorized" }, 401);
    userId = ud.user.id;

    const body = await req.json().catch(() => ({}));
    cmd = String(body?.command ?? "").trim().slice(0, 64);
    const args = (body?.args ?? {}) as Record<string, unknown>;
    const spec = COMMANDS[cmd];
    if (!spec) return json({ error: `unknown command: ${cmd}`, hint: "run 'help'" }, 400);

    // Tier check
    const { data: ts } = await admin.rpc("get_user_tier_state", { _user_id: userId });
    userTier = ((ts as { tier?: Tier } | null)?.tier ?? "seeker") as Tier;
    const isAdmin = !!(ts as { is_admin?: boolean } | null)?.is_admin;
    if (!isAdmin && RANK[userTier] < RANK[spec.minTier]) {
      return json({
        error: `command '${cmd}' requires tier '${spec.minTier}' (you are '${userTier}')`,
        upgrade_required: spec.minTier,
      }, 402);
    }

    // Credit metering (admin bypass handled in spend_credits)
    cost = spec.cost;
    if (cost > 0) {
      const { data: spent, error: se } = await admin.rpc("spend_credits", {
        _user_id: userId, _amount: cost, _reason: "terminal_command", _command: cmd, _ref: null,
      });
      if (se) return json({ error: "Credit check failed" }, 500);
      const r = spent as { ok?: boolean; balance?: number; needed?: number; admin?: boolean };
      if (!r?.ok && !r?.admin) {
        return json({
          error: `Insufficient credits — need ${r.needed}, have ${r.balance}.`,
          credits_required: r.needed, credits_balance: r.balance,
        }, 402);
      }
    }

    // ── Dispatch ────────────────────────────────────────────────────────
    let result: unknown;

    switch (cmd) {
      case "help":
        result = Object.entries(COMMANDS).map(([k, v]) => ({ command: k, ...v }));
        break;

      case "tier.show":
        result = ts;
        break;

      case "tier.upgrade": {
        const tier = String(args.tier ?? "acolyte");
        const interval = String(args.interval ?? "month");
        const { data, error } = await admin.functions.invoke("stripe-checkout", {
          headers: { Authorization: auth },
          body: { tier, interval },
        });
        if (error) throw new Error(error.message);
        result = data;
        break;
      }

      case "invoice.list": {
        const { data } = await admin.from("stripe_invoices")
          .select("stripe_invoice_id, amount_paid, currency, status, tier, hosted_invoice_url, invoice_pdf, created_at")
          .eq("user_id", userId).order("created_at", { ascending: false }).limit(20);
        result = data ?? [];
        break;
      }

      case "usage.stats":
        result = {
          monthly_usage: (ts as { monthly_usage?: number } | null)?.monthly_usage,
          monthly_limit: (ts as { monthly_limit?: number } | null)?.monthly_limit,
          daily_usage: (ts as { daily_usage?: number } | null)?.daily_usage,
          daily_remaining: (ts as { daily_remaining?: number } | null)?.daily_remaining,
        };
        break;

      case "credits.balance": {
        const { data } = await admin.rpc("credits_balance", { _user_id: userId });
        result = { balance: data, unit: "credits (1 credit = 1 cent)" };
        break;
      }

      case "referral.show": {
        const { data: code } = await admin.rpc("ensure_referral_code", { _user_id: userId });
        const { data: atts } = await admin.from("referral_attributions")
          .select("referred_user_id, total_credited_cents, share_pct, first_invoice_at, created_at")
          .eq("referrer_user_id", userId);
        const total = (atts ?? []).reduce((s: number, a: { total_credited_cents: number }) => s + a.total_credited_cents, 0);
        result = { code, share_url: `${req.headers.get("origin") ?? ""}/auth?ref=${code}`, referrals: atts?.length ?? 0, total_earned_cents: total };
        break;
      }

      case "eth.balance": {
        const address = String(args.address ?? "");
        const chainId = Number(args.chainId ?? 1);
        if (!/^0x[a-fA-F0-9]{40}$/.test(address)) throw new Error("invalid address");
        const wei = await rpc(chainId, "eth_getBalance", [address, "latest"]);
        const eth = Number(BigInt(wei as string)) / 1e18;
        result = { address, chainId, wei, eth };
        break;
      }

      case "eth.tx": {
        const hash = String(args.hash ?? "");
        if (!/^0x[a-fA-F0-9]{64}$/.test(hash)) throw new Error("invalid tx hash");
        const chainId = Number(args.chainId ?? 1);
        result = await rpc(chainId, "eth_getTransactionByHash", [hash]);
        break;
      }

      case "eth.call": {
        const chainId = Number(args.chainId ?? 1);
        const to = String(args.to ?? "");
        const data = String(args.data ?? "0x");
        if (!/^0x[a-fA-F0-9]{40}$/.test(to)) throw new Error("invalid 'to' address");
        if (!/^0x[a-fA-F0-9]{0,8192}$/.test(data)) throw new Error("invalid 'data' (must be 0x-prefixed hex, max 4KB)");
        result = await rpc(chainId, "eth_call", [{ to, data }, "latest"]);
        break;
      }

      case "contract.read": {
        const chainId = Number(args.chainId ?? 1);
        const address = String(args.address ?? "");
        const method = String(args.method ?? "");
        if (!/^0x[a-fA-F0-9]{40}$/.test(address)) throw new Error("invalid contract address");
        const data = method.startsWith("0x") ? method : "0x" + method;
        if (!/^0x[a-fA-F0-9]{0,8192}$/.test(data)) throw new Error("invalid method calldata");
        result = await rpc(chainId, "eth_call", [{ to: address, data }, "latest"]);
        break;
      }

      case "contract.verify": {
        const { data, error } = await admin.functions.invoke("contract-verify", {
          headers: { Authorization: auth },
          body: args,
        });
        if (error) throw new Error(error.message);
        result = data;
        break;
      }

      case "oracle.word": {
        const words = ["excalibur", "ouroboros", "merkaba", "axiom", "sigil", "logos", "anima", "tessera"];
        result = { word: words[Math.floor(Math.random() * words.length)] };
        break;
      }

      case "oracle.harmony":
      case "oracle.sponge": {
        const word = String(args.word ?? "excalibur");
        // Lightweight call into aetherion's caduceus engine state (no AI tokens spent)
        const enc = new TextEncoder().encode(`AetherionVoice::${word}`);
        const buf = await crypto.subtle.digest("SHA-256", enc);
        const view = new DataView(buf);
        const harmony = (view.getUint32(0) / 0xffffffff);
        const spongeHarmonic = (view.getUint32(4) / 0xffffffff);
        result = { word, harmony, spongeHarmonic };
        break;
      }

      case "mining.attest": {
        // Insert a minimal attestation row via the user's own RLS path
        const enc = new TextEncoder().encode(`${userId}-${Date.now()}`);
        const buf = await crypto.subtle.digest("SHA-256", enc);
        const hash = "0x" + Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
        const { data, error } = await userClient.rpc("record_mining_attestation", {
          _word: String(args.word ?? "excalibur"),
          _query_excerpt: String(args.query ?? "terminal mint"),
          _response_excerpt: String(args.response ?? ""),
          _harmony: Number(args.harmony ?? 0.618),
          _sponge_harmonic: Number(args.sponge ?? 0.5),
          _vitality: String(args.vitality ?? "RADIANT"),
          _attestation_hash: hash,
        });
        if (error) throw new Error(error.message);
        result = data;
        break;
      }
    }

    await admin.from("terminal_audit").insert({
      user_id: userId, command: cmd, args: args as object, tier: userTier,
      credit_cost: cost, status: "ok", duration_ms: Date.now() - startedAt,
    });

    return json({ ok: true, command: cmd, cost_credits: cost, result });
  } catch (e) {
    const internalMsg = e instanceof Error ? e.message : "unknown";
    console.error("[terminal-command] error:", internalMsg);
    if (userId && cmd) {
      await admin.from("terminal_audit").insert({
        user_id: userId, command: cmd, tier: userTier,
        credit_cost: cost, status: "error", error: internalMsg,
        duration_ms: Date.now() - startedAt,
      }).then(() => {}, () => {});
    }
    return json({ ok: false, command: cmd, error: "Command failed. Please try again." }, 400);
  }
});
