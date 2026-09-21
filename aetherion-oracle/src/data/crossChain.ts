/**
 * Cross-chain lattice data source.
 *
 * Values are fetched from the `cross_chain_nodes` table (public read) so labels
 * can change without a code deploy. This module holds the typed schema plus a
 * static fallback used when the backend is unreachable.
 */
import { supabase } from "@/integrations/supabase/client";

export interface CrossChainNode {
  chain: string;
  tick: string;
  standard: string;
  venue: string;
  note: string;
  accent: string;
  href: string;
  edgeTo?: string | null;
  edgeLabel?: string | null;
}

export interface CrossChainEdge {
  from: string;
  to: string;
  label: string;
}

/** Static fallback — mirrors the seeded rows in `cross_chain_nodes`. */
export const CROSS_CHAIN_NODES: CrossChainNode[] = [
  {
    chain: "Ethereum",
    tick: "SKYNT",
    standard: "ERC-20",
    venue: "WETH pair",
    note: "Pool depth anchors the reference floor P₀ for the bonding curve.",
    accent: "text-primary",
    href: "/token/skynt",
    edgeTo: "wURUU",
    edgeLabel: "WETH → P₀ floor",
  },
  {
    chain: "zkSync Era",
    tick: "URUU",
    standard: "ERC-20 · live",
    venue: "zkSync Era",
    note: "Token is live. Wrap and curve are calculators only.",
    accent: "text-primary",
    href: "/token/uruu",
    edgeTo: "wURUU",
    edgeLabel: "ETH→WETH live · URUU wrap not live",
  },
  {
    chain: "Solana",
    tick: "wURUU",
    standard: "SPL · wrapped",
    venue: "Custom bonding curve",
    note: "P(s) = P₀ (1 + s/S)ⁿ. Disclosed 1% cap. Sell is open.",
    accent: "text-accent",
    href: "/token/wuruu",
  },
  {
    chain: "Bitcoin",
    tick: "ATART",
    standard: "BRC-20",
    venue: "UniSat",
    note: "Reading receipts route a BRC-20 bonus into the curve.",
    accent: "text-gold",
    href: "/claim/tart",
    edgeTo: "wURUU",
    edgeLabel: "BRC-20 bonus",
  },
  {
    chain: "EXS Tetra-PoW",
    tick: "EXS",
    standard: "Proof-of-Forge",
    venue: "excaliburcrypto.com",
    note: "Tetra-PoW forges mint EXS; host lattice for Aetherion.",
    accent: "text-amber-300",
    href: "/exs",
    edgeTo: "AETX",
    edgeLabel: "Excalibur mythos merge",
  },
];

export function edgesFromNodes(nodes: CrossChainNode[]): CrossChainEdge[] {
  return nodes
    .filter((n) => n.edgeTo && n.edgeLabel)
    .map((n) => ({ from: n.tick, to: n.edgeTo as string, label: n.edgeLabel as string }));
}

/** Fetch live mapping values; falls back to the static list on any failure. */
export async function fetchCrossChainNodes(): Promise<CrossChainNode[]> {
  try {
    const { data, error } = await supabase
      .from("cross_chain_nodes")
      .select("chain,tick,standard,venue,note,accent,href,edge_to,edge_label")
      .eq("active", true)
      .order("sort_order", { ascending: true });
    if (error || !data || data.length === 0) return CROSS_CHAIN_NODES;
    return data.map((row) => ({
      chain: row.chain,
      tick: row.tick,
      standard: row.standard,
      venue: row.venue,
      note: row.note,
      accent: row.accent,
      href: row.href,
      edgeTo: row.edge_to,
      edgeLabel: row.edge_label,
    }));
  } catch {
    return CROSS_CHAIN_NODES;
  }
}
