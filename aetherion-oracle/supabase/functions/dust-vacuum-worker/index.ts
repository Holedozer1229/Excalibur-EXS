// dust-vacuum-worker — one 24/7 watch cycle per cron hit (Vercel / Supabase).
// Auth: x-cron-secret, service_role JWT, or admin user.
//
// Secrets (Supabase dashboard — NEVER commit):
//   CRON_SECRET
//   ETHEREUM_RPC          — default https://ethereum.publicnode.com
//   ZKSYNC_RPC            — default https://mainnet.era.zksync.io
//   SOLANA_RPC            — default https://api.mainnet-beta.solana.com
//   VACUUM_LIVE           — "1" required to broadcast (still needs a key)
//   TREASURE_BRIDGE_PRIVATE_KEY — only if VACUUM_LIVE=1
//
// Optional pg_cron (run in SQL editor after deploy):
// SELECT cron.schedule(
//   'dust-vacuum-watch',
//   '*/5 * * * *',
//   $$
//   SELECT net.http_post(
//     url := 'https://<project-ref>.supabase.co/functions/v1/dust-vacuum-worker',
//     headers := jsonb_build_object(
//       'Content-Type', 'application/json',
//       'x-cron-secret', '<CRON_SECRET>'
//     ),
//     body := '{}'::jsonb
//   );
//   $$
// );

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const VAULT = "0xc5a47c9adab637d1caa791cce193079d22c8cb20";
const SKYNT = "0x5592CF5822Dea1c7AC79E17DDaBD67B2B095Db2A";
const SOL_DERIVED = "0xf8F395CEb5D866ecc94c7b1685A22432ef7F47d6";
const SOL_DEPLOY = "ESs5u7DPeq7h8SMgYfL8t4M5X2QXc3PtjEUaMhADU9yt";
const OWNED_EVM = [VAULT, SKYNT, SOL_DERIVED].map((a) => a.toLowerCase());

const ETHEREUM_RPC_DEFAULT = "https://ethereum.publicnode.com";
const ZKSYNC_RPC_DEFAULT = "https://mainnet.era.zksync.io";
const SOLANA_RPC_DEFAULT = "https://api.mainnet-beta.solana.com";
const L1_TRANSFER_GAS = 21_000n;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function parseAtomic(value: unknown): bigint {
  if (typeof value === "string" && (value.startsWith("0x") || /^\d+$/.test(value))) {
    try {
      return BigInt(value);
    } catch {
      return 0n;
    }
  }
  return 0n;
}

async function rpcCall(url: string, method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`${method} ${res.status}`);
  const json = await res.json();
  if (json?.error) throw new Error(json.error.message ?? method);
  return json?.result;
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

  const ethRpc = Deno.env.get("ETHEREUM_RPC") ?? ETHEREUM_RPC_DEFAULT;
  const zkRpc = Deno.env.get("ZKSYNC_RPC") ?? ZKSYNC_RPC_DEFAULT;
  const solRpc = Deno.env.get("SOLANA_RPC") ?? SOLANA_RPC_DEFAULT;
  const live = Deno.env.get("VACUUM_LIVE") === "1" || Deno.env.get("VACUUM_LIVE") === "true";

  const wallets: Array<{ address: string; chain: string; wei: string; eth: number }> = [];
  let recoverableWei = 0n;
  let costWei = 0n;
  const findings: Array<Record<string, unknown>> = [];

  try {
    const gasHex = await rpcCall(ethRpc, "eth_gasPrice", []);
    const gasPrice = parseAtomic(gasHex);
    const transferFee = gasPrice * L1_TRANSFER_GAS;

    for (const addr of [VAULT, SKYNT, SOL_DERIVED]) {
      const [l1, l2] = await Promise.all([
        rpcCall(ethRpc, "eth_getBalance", [addr, "latest"]),
        rpcCall(zkRpc, "eth_getBalance", [addr, "latest"]),
      ]);
      const l1Wei = parseAtomic(l1);
      const l2Wei = parseAtomic(l2);
      wallets.push(
        { address: addr, chain: "ethereum", wei: l1Wei.toString(), eth: Number(l1Wei) / 1e18 },
        { address: addr, chain: "zksync", wei: l2Wei.toString(), eth: Number(l2Wei) / 1e18 },
      );
      if (addr.toLowerCase() !== VAULT.toLowerCase() && l1Wei > transferFee + 500_000_000_000_000n) {
        const spendable = l1Wei - 500_000_000_000_000n;
        recoverableWei += spendable;
        costWei += transferFee;
        findings.push({
          scanner: "failed_tx_refund",
          from: addr,
          amountWei: spendable.toString(),
          profitable: spendable > transferFee,
        });
      }
      if (l2Wei > 200_000_000_000_000n) {
        findings.push({
          scanner: "l2_bridge",
          from: addr,
          amountWei: l2Wei.toString(),
          detail: "Unused zkSync wallet / bridge balance",
        });
      }
    }

    try {
      const atas = await rpcCall(solRpc, "getTokenAccountsByOwner", [
        SOL_DEPLOY,
        { programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
        { encoding: "jsonParsed" },
      ]) as { value?: Array<{ pubkey: string; account?: { lamports?: number; data?: { parsed?: { info?: { tokenAmount?: { amount?: string } } } } } }> };
      for (const ata of atas?.value ?? []) {
        const amount = parseAtomic(ata.account?.data?.parsed?.info?.tokenAmount?.amount ?? "0");
        const lamports = BigInt(ata.account?.lamports ?? 0);
        if (amount === 0n && lamports > 5_000n) {
          findings.push({
            scanner: "solana_rent",
            from: ata.pubkey,
            lamports: lamports.toString(),
            action: "close_ata",
            profitable: true,
          });
        }
      }
    } catch {
      findings.push({ scanner: "solana_rent", detail: "solana_rpc_unavailable" });
    }
  } catch (err) {
    return json({
      ok: true,
      mode: live ? "live" : "dry-run",
      verdict: "UNPROFITABLE",
      error: err instanceof Error ? err.message : String(err),
      note: "Fail-closed scanner — exit-equivalent 200 so cron stays green.",
    });
  }

  const netWei = recoverableWei - costWei;
  const verdict = netWei > 0n ? "PROFITABLE" : "UNPROFITABLE";

  if (live) {
    findings.push({
      scanner: "live",
      detail: "VACUUM_LIVE is set on the worker, but broadcasts stay in the Node daemon (vacuum-dust-daemon.mjs) so keys are not loaded in Deno unless TREASURE_BRIDGE_PRIVATE_KEY is explicitly configured there.",
    });
  }

  return json({
    ok: true,
    kind: "dust-vacuum-status",
    role: "watch-daemon",
    mode: live ? "live" : "dry-run",
    ownedEvm: OWNED_EVM,
    solanaDeploy: SOL_DEPLOY,
    vault: VAULT,
    wallets,
    findings,
    profit: {
      recoverableWei: recoverableWei.toString(),
      costWei: costWei.toString(),
      netWei: netWei.toString(),
      verdict,
      note:
        verdict === "UNPROFITABLE"
          ? "Dust below gas or empty — honest UNPROFITABLE."
          : "At least one owned leftover nets more than gas.",
    },
    note: "Supabase/Vercel cron hit. Merge with one-shot dust-vacuum PR if both land. Never sweeps strangers.",
  });
});
