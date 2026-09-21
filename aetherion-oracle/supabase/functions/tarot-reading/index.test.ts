// End-to-end smoke test for the /tarot flow.
//
// Exercises the full chain a real seeker walks through:
//   1. POST /tarot-reading with a wallet + question     → cards + divination receipt
//   2. Receipt is bound (nonce + commitment_hash + wallet round-trip in payload)
//   3. verify_divination_receipt RPC seals the receipt  → ok:true, verified_at
//   4. Replay the same nonce/hash                        → ok:false, ALREADY_VERIFIED
//   5. Tamper with the hash                              → ok:false, HASH_MISMATCH
//   6. Unknown nonce                                     → ok:false, NOT_FOUND
//
// Required env (auto-loaded from project .env):
//   VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

assert(SUPABASE_URL, "SUPABASE_URL missing");
assert(ANON_KEY, "ANON key missing");
assert(SERVICE_ROLE, "SERVICE_ROLE missing");

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const WALLET = "bc1pqqqqsmokeetest0000000000000000000000000000000000000000000000";

async function makeSeeker() {
  const email = `tarot-smoke-${crypto.randomUUID().slice(0, 8)}@example.com`;
  const password = `Pw_${crypto.randomUUID()}`;
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  if (error) throw error;
  const user = data.user!;

  // Sign in to get a JWT, so the edge function can bind the receipt to user_id.
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: sess, error: signErr } = await userClient.auth.signInWithPassword({ email, password });
  if (signErr) throw signErr;
  return { id: user.id, email, jwt: sess.session!.access_token, userClient };
}

async function cleanup(userId: string, nonce?: string) {
  if (nonce) {
    try { await admin.from("divination_receipts").delete().eq("nonce", nonce); } catch { /* ignore */ }
  }
  await admin.auth.admin.deleteUser(userId).catch(() => {});
}

Deno.test("tarot-reading: end-to-end binding + verify + replay protection", async () => {
  const seeker = await makeSeeker();
  let nonce: string | undefined;

  try {
    // ---- 1. Cast the reading ----
    const res = await fetch(`${SUPABASE_URL}/functions/v1/tarot-reading`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${seeker.jwt}`,
        apikey: ANON_KEY,
      },
      body: JSON.stringify({
        question: "Smoke test: what shape is the path ahead?",
        wallet: WALLET,
      }),
    });
    const reading = await res.json();
    assertEquals(res.status, 200, `tarot-reading failed: ${JSON.stringify(reading)}`);

    // ---- 2. Receipt shape ----
    assert(Array.isArray(reading.cards) && reading.cards.length === 3, "three cards drawn");
    assert(typeof reading.interpretation === "string" && reading.interpretation.length > 0, "interpretation present");
    assert(reading.divination, "divination receipt present");
    const { nonce: n, hash, wallet: maskedWallet, boundAt, verifyUrl } = reading.divination;
    nonce = n;
    assert(/^[0-9a-f]{32}$/.test(n), `nonce is 32 hex chars: ${n}`);
    assert(/^[0-9a-f]{64}$/.test(hash), `commitment is sha256 hex: ${hash}`);
    assert(typeof maskedWallet === "string" && maskedWallet.includes("…"), `wallet masked: ${maskedWallet}`);
    assert(!Number.isNaN(Date.parse(boundAt)), "boundAt is ISO date");
    assertEquals(verifyUrl, `/verify?nonce=${n}&hash=${hash}`);

    // Confirm row landed in DB bound to wallet + user.
    const { data: row } = await admin
      .from("divination_receipts")
      .select("nonce, commitment_hash, wallet_address, user_id, verified_at")
      .eq("nonce", n).single();
    assert(row, "receipt persisted");
    assertEquals(row!.commitment_hash, hash, "DB hash matches");
    assertEquals(row!.wallet_address, WALLET, "wallet bound on server (full, not masked)");
    assertEquals(row!.user_id, seeker.id, "receipt bound to authed user");
    assertEquals(row!.verified_at, null, "not yet sealed");

    // ---- 3. Verify → seals the receipt ----
    const { data: v1, error: e1 } = await seeker.userClient.rpc("verify_divination_receipt", {
      _nonce: n, _commitment_hash: hash,
    });
    assert(!e1, `verify rpc errored: ${e1?.message}`);
    const ok1 = v1 as Record<string, unknown>;
    assertEquals(ok1.ok, true, "first verify ok");
    assertEquals(ok1.nonce, n);
    assertEquals(ok1.commitment_hash, hash);
    assert(typeof ok1.verified_at === "string", "verified_at returned");

    // ---- 4. Replay → ALREADY_VERIFIED ----
    const { data: v2 } = await seeker.userClient.rpc("verify_divination_receipt", {
      _nonce: n, _commitment_hash: hash,
    });
    const replay = v2 as Record<string, unknown>;
    assertEquals(replay.ok, false, "replay refused");
    assertEquals(replay.reason, "ALREADY_VERIFIED", "replay reason");
    assert(typeof replay.verified_at === "string", "carries verified_at");

    // ---- 5. Hash tampering ----
    const tamperedHash = hash.replace(/.$/, hash.endsWith("0") ? "1" : "0");
    const { data: v3 } = await seeker.userClient.rpc("verify_divination_receipt", {
      _nonce: n, _commitment_hash: tamperedHash,
    });
    assertEquals((v3 as Record<string, unknown>).reason, "HASH_MISMATCH", "hash mismatch detected");

    // ---- 6. Unknown nonce ----
    const { data: v4 } = await seeker.userClient.rpc("verify_divination_receipt", {
      _nonce: "deadbeef".repeat(4), _commitment_hash: hash,
    });
    assertEquals((v4 as Record<string, unknown>).reason, "NOT_FOUND", "unknown nonce → NOT_FOUND");
  } finally {
    await cleanup(seeker.id, nonce);
  }
});

Deno.test("tarot-reading: missing question → 400", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/tarot-reading`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
    body: JSON.stringify({ question: "" }),
  });
  const body = await res.json();
  assertEquals(res.status, 400);
  assert(typeof body.error === "string");
});
