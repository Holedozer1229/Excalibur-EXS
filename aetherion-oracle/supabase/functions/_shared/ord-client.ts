// Adapter for BRC-20 / inscription data lookups.
// Defaults to api.hiro.so; when ORD_BASE_URL secret is set, queries a self-hosted ord server.
// Returns a uniform shape so callers don't care which backend served the data.

const HIRO_BASE = "https://api.hiro.so";

export interface Brc20TokenInfo {
  exists: boolean;
  tick: string;
  max?: string;
  lim?: string;
  dec?: number;
  inscriptionId?: string;
  deployTx?: string;
}

export interface InscriptionStatus {
  inscriptionId: string;
  confirmed: boolean;
  blockHeight?: number;
  txid?: string;
}

function ordBase(): string | null {
  const u = Deno.env.get("ORD_BASE_URL");
  return u ? u.replace(/\/$/, "") : null;
}

function ordHeaders(): HeadersInit {
  const k = Deno.env.get("ORD_API_KEY");
  return k ? { Authorization: `Bearer ${k}`, Accept: "application/json" } : { Accept: "application/json" };
}

export async function getBrc20Token(tick: string): Promise<Brc20TokenInfo> {
  const t = tick.toUpperCase();
  const ord = ordBase();
  if (ord) {
    try {
      // ord server BRC-20 endpoint shape: /r/brc20/token/<tick>
      const r = await fetch(`${ord}/r/brc20/token/${encodeURIComponent(t)}`, { headers: ordHeaders() });
      if (r.status === 404) return { exists: false, tick: t };
      if (r.ok) {
        const j = await r.json();
        return {
          exists: true, tick: t,
          max: j?.max ?? j?.supply, lim: j?.lim ?? j?.limit_per_mint, dec: j?.decimals,
          inscriptionId: j?.inscription_id, deployTx: j?.tx_id,
        };
      }
    } catch (_) { /* fall through to hiro */ }
  }
  // Fallback: Hiro
  try {
    const r = await fetch(`${HIRO_BASE}/ordinals/v1/brc-20/tokens?ticker=${encodeURIComponent(t)}`);
    if (!r.ok) return { exists: false, tick: t };
    const j = await r.json();
    const hit = Array.isArray(j?.results) ? j.results[0] : null;
    if (!hit) return { exists: false, tick: t };
    return {
      exists: true, tick: t,
      max: hit.max_supply, lim: hit.mint_limit, dec: hit.decimals,
      inscriptionId: hit.id, deployTx: hit.tx_id,
    };
  } catch { return { exists: false, tick: t }; }
}

export async function getInscriptionStatus(inscriptionId: string): Promise<InscriptionStatus | null> {
  const ord = ordBase();
  if (ord) {
    try {
      const r = await fetch(`${ord}/r/inscription/${encodeURIComponent(inscriptionId)}`, { headers: ordHeaders() });
      if (r.ok) {
        const j = await r.json();
        return { inscriptionId, confirmed: !!j?.genesis_height, blockHeight: j?.genesis_height, txid: j?.genesis_transaction };
      }
    } catch { /* fall through */ }
  }
  try {
    const r = await fetch(`${HIRO_BASE}/ordinals/v1/inscriptions/${encodeURIComponent(inscriptionId)}`);
    if (!r.ok) return null;
    const j = await r.json();
    return { inscriptionId, confirmed: !!j?.genesis_block_height, blockHeight: j?.genesis_block_height, txid: j?.genesis_tx_id };
  } catch { return null; }
}

export function backendName(): "ord" | "hiro" {
  return ordBase() ? "ord" : "hiro";
}
