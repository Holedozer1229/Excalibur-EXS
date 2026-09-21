// Verify a user-deployed ERC-20 "Knight of the Round Table" token on-chain
// and record it on the user's profile. Polygon zkEVM only (1101 mainnet, 2442 cardona).
//
// POST /contract-verify  { chainId, address, txHash? }
//   - reads bytecode (must be non-empty)
//   - calls name(), symbol(), decimals(), totalSupply(), owner()
//   - requires owner() == profile.wallet_address (case-insensitive)
//   - upserts public.verified_contracts
//
// GET  /contract-verify   → list current user's verified contracts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPPORTED_CHAINS: Record<number, { name: string; alchemy: string }> = {
  1101: { name: "Polygon zkEVM",         alchemy: "https://polygonzkevm-mainnet.g.alchemy.com/v2/" },
  2442: { name: "Polygon zkEVM Cardona", alchemy: "https://polygonzkevm-cardona.g.alchemy.com/v2/" },
};

// Minimal ABI selectors (function signature → keccak256 first 4 bytes, hardcoded)
const SELECTORS = {
  name:        "0x06fdde03",
  symbol:      "0x95d89b41",
  decimals:    "0x313ce567",
  totalSupply: "0x18160ddd",
  owner:       "0x8da5cb5b", // Ownable
};

async function rpc(url: string, method: string, params: unknown[]): Promise<unknown> {
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

async function ethCall(url: string, to: string, data: string): Promise<string> {
  return await rpc(url, "eth_call", [{ to, data }, "latest"]) as string;
}

function decodeString(hex: string): string {
  if (!hex || hex === "0x") return "";
  const h = hex.replace(/^0x/, "");
  // ABI: offset(32) + length(32) + bytes
  if (h.length < 128) {
    // some non-spec tokens return bytes32
    const raw = Buffer.from(h, "hex").toString("utf8").replace(/\0+$/g, "");
    return raw;
  }
  const len = parseInt(h.slice(64, 128), 16);
  const data = h.slice(128, 128 + len * 2);
  return Buffer.from(data, "hex").toString("utf8");
}
function decodeUint(hex: string): bigint {
  if (!hex || hex === "0x") return 0n;
  return BigInt(hex);
}
function decodeAddress(hex: string): string {
  if (!hex || hex === "0x") return "";
  return "0x" + hex.replace(/^0x/, "").slice(-40);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: u, error: ue } = await userClient.auth.getUser();
    if (ue || !u.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = u.user.id;

    if (req.method === "GET") {
      const { data, error } = await userClient
        .from("verified_contracts")
        .select("*")
        .order("verified_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify({ contracts: data ?? [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "method not allowed" }), {
        status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { chainId, address, txHash } = await req.json() as {
      chainId?: number; address?: string; txHash?: string;
    };
    if (!chainId || !SUPPORTED_CHAINS[chainId]) {
      return new Response(JSON.stringify({ error: "Unsupported chain. Use Polygon zkEVM (1101) or Cardona (2442)." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return new Response(JSON.stringify({ error: "Invalid contract address" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Wallet must be bound on profile and match owner()
    const { data: profile, error: pe } = await userClient
      .from("profiles").select("wallet_address").eq("user_id", userId).maybeSingle();
    if (pe) throw pe;
    const wallet = profile?.wallet_address;
    if (!wallet) {
      return new Response(JSON.stringify({
        error: "Bind your SKYNT wallet on your profile first, then deploy from that wallet.",
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const ALCHEMY = Deno.env.get("ALCHEMY_API_KEY");
    if (!ALCHEMY) throw new Error("ALCHEMY_API_KEY missing");
    const rpcUrl = SUPPORTED_CHAINS[chainId].alchemy + ALCHEMY;

    // 1) bytecode must exist
    const code = await rpc(rpcUrl, "eth_getCode", [address, "latest"]) as string;
    if (!code || code === "0x" || code === "0x0") {
      return new Response(JSON.stringify({ error: "No contract found at that address on this chain." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) ERC-20 surface
    let name = "", symbol = "", decimals = 18, totalSupply = 0n, ownerAddr = "";
    try {
      name        = decodeString(await ethCall(rpcUrl, address, SELECTORS.name));
      symbol      = decodeString(await ethCall(rpcUrl, address, SELECTORS.symbol));
      decimals    = Number(decodeUint(await ethCall(rpcUrl, address, SELECTORS.decimals)));
      totalSupply = decodeUint(await ethCall(rpcUrl, address, SELECTORS.totalSupply));
    } catch (e) {
      return new Response(JSON.stringify({ error: `Contract is not a standard ERC-20: ${(e as Error).message}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3) owner() must equal bound wallet
    try {
      ownerAddr = decodeAddress(await ethCall(rpcUrl, address, SELECTORS.owner));
    } catch {
      return new Response(JSON.stringify({ error: "Contract does not expose owner() — deploy an Ownable ERC-20." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (ownerAddr.toLowerCase() !== wallet.toLowerCase()) {
      return new Response(JSON.stringify({
        error: `Contract owner (${ownerAddr}) does not match your bound wallet (${wallet}).`,
      }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 4) Optional tx receipt sanity
    if (txHash && /^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      try {
        const receipt = await rpc(rpcUrl, "eth_getTransactionReceipt", [txHash]) as
          { contractAddress?: string; from?: string } | null;
        if (receipt?.contractAddress &&
            receipt.contractAddress.toLowerCase() !== address.toLowerCase()) {
          return new Response(JSON.stringify({ error: "txHash did not deploy this address." }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch { /* non-fatal */ }
    }

    // 5) Upsert
    const totalSupplyNum = Number(totalSupply) / Math.pow(10, decimals || 0);
    const { data: row, error: ie } = await userClient.from("verified_contracts").upsert({
      user_id: userId,
      chain_id: chainId,
      contract_address: address,
      name, symbol, decimals,
      total_supply: Number.isFinite(totalSupplyNum) ? totalSupplyNum : 0,
      tx_hash: txHash ?? null,
      owner_address: ownerAddr,
      verified_at: new Date().toISOString(),
    }, { onConflict: "user_id,chain_id" }).select("*").single();
    if (ie) throw ie;

    return new Response(JSON.stringify({ contract: row, chain: SUPPORTED_CHAINS[chainId].name }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("contract-verify error:", e);
    return new Response(JSON.stringify({ error: "An internal error occurred. Please try again." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
