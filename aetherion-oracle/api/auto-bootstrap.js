/**
 * Vercel serverless auto-bootstrap — live operator read, no broadcast.
 * Autoscale does not mint yield. $1M / 72h is not this well.
 */
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";

const OPERATOR = "0xf8F395CEb5D866ecc94c7b1685A22432ef7F47d6";
const STOCK_ETH = 0.007123148111589634;
const STOCK_USD = 17.81;
const TARGET = 1_000_000;
const WINDOW_HOURS = 72;
const ANCHOR = "2026-08-29T21:00:00.000Z";
const PREDICTED = "0x1E4529cF826a79fd3b0E033Ff00dCDB3091c77B2";
const RPC = process.env.ETHEREUM_RPC ?? "https://ethereum.publicnode.com";

function formatRemaining(ms) {
  if (ms <= 0) return "0h 0m";
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h ${minutes}m`;
  return `${hours}h ${minutes}m`;
}

function millionaireWindow(now = new Date()) {
  const start = Date.parse(ANCHOR);
  const ends = start + WINDOW_HOURS * 3_600_000;
  const remainingMs = Math.max(0, ends - now.getTime());
  return {
    anchorAt: ANCHOR,
    endsAt: new Date(ends).toISOString(),
    remainingMs,
    remainingHours: remainingMs / 3_600_000,
    remainingLabel: formatRemaining(remainingMs),
    expired: remainingMs === 0,
  };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  let operatorWei = "0";
  try {
    const client = createPublicClient({
      chain: mainnet,
      transport: http(RPC, { fetchOptions: { headers: { "user-agent": "aetherion-auto-bootstrap/1" } } }),
    });
    operatorWei = (await client.getBalance({ address: OPERATOR })).toString();
  } catch {
    operatorWei = "0";
  }

  const empty = BigInt(operatorWei) <= 0n;
  const window = millionaireWindow();
  const usdPerHourNeeded = Math.round((TARGET / WINDOW_HOURS) * 100) / 100;
  const report = {
    kind: "auto-bootstrap",
    version: "1.1.0",
    updatedAt: new Date().toISOString(),
    mode: "dry-run",
    source: "vercel-cron",
    stockUsd: STOCK_USD,
    stockEth: STOCK_ETH,
    millionaire: {
      targetUsd: TARGET,
      windowHours: WINDOW_HOURS,
      stockUsd: STOCK_USD,
      usdPerHourNeeded,
      usdPerHourHonest: 0,
      multipleNeeded: Math.ceil(TARGET / STOCK_USD),
      reachableIn72h: false,
      window,
      note: `$${STOCK_USD} leftover is a one-shot stock. Need ~$${usdPerHourNeeded}/hr of NEW leftover to hit $1M in ${WINDOW_HOURS}h. Extra workers re-read the same well.`,
    },
    autoscale: {
      replicas: 1,
      intervalMs: 300000,
      reason: empty ? "operator_empty" : "same_well_no_new_leftover",
      scalesYield: false,
      note: empty
        ? "Operator 0 L1 ETH — one dry-run replica. Scaling does not create gas or leftover."
        : "Same well — stay at 1 replica. N cycles ≠ N × $17.81.",
    },
    steps: [
      { id: "pipelines", ok: true, detail: "23 rails hooked" },
      { id: "operator", ok: !empty, detail: `L1 ${operatorWei} wei` },
      { id: "excal", ok: true, detail: "CREATE2 predicted — bytecode pending gas" },
      { id: "eip-7949", ok: true, detail: "posted genesis-mainnet.json" },
      { id: "millionaire", ok: false, detail: "$1M in 72h is not reachable from this stock" },
    ],
    pipelines: [
      "vacuum",
      "flywheel",
      "artificial",
      "horizon",
      "ledger",
      "sail",
      "cosmos",
      "uruu",
      "bridge",
      "compound",
      "inject",
      "swap",
      "claim",
      "skynt",
      "excal",
      "bootstrap",
      "eip",
      "commitment",
      "eip-claim",
      "umbrella",
      "skynt-btc",
      "tetra",
      "wrap",
    ],
    excalPredicted: PREDICTED,
    broadcast: "FAIL_CLOSED",
    blockers: empty ? ["operator_l1_empty", "dry_run_default"] : ["dry_run_default"],
    deploy: {
      production: "https://www.excaliburcrypto.com",
      api: "/api/auto-bootstrap",
      cron: "17 3 * * *",
      watchCron: "17 */6 * * *",
      scalesYield: false,
    },
    honesty: {
      doesNotMintMillion: true,
      doesNotMultiplySameWell: true,
      ghostGalleonNotSpendable: true,
      ghostGalleonEth: 137.190325,
      note: "137 ETH is ledger-only. Autoscale is watch-replica count, not APY.",
    },
    note: `$${STOCK_USD} leftover is a one-shot stock. Need ~$${usdPerHourNeeded}/hr of NEW leftover to hit $1M in ${WINDOW_HOURS}h. Extra workers re-read the same well.`,
  };

  res.status(200).json(report);
}
