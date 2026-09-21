// Admin worker: processes pending ATART claims by generating BRC-20 mint+transfer
// inscription payloads. Marks claims as `inscribing` and records pending
// `brc20_operations` rows so an admin can broadcast via UniSat/Xverse.
//
// POST /tart-claims-worker
//   body (optional): { claim_ids?: string[], action?: "process" | "mark_inscribed" | "fail",
//                       inscription_id?: string, tx_hash?: string, note?: string }
//
// Default action "process" picks up all pending claims (or the supplied ids)
// and returns inscription payloads. Admin-only.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const TICK = "ATART";
const MAX_SUPPLY = "21000000";
const PER_MINT = "1";

const BodySchema = z.object({
  action: z.enum(["process", "mark_inscribed", "fail", "cancel"]).default("process"),
  claim_ids: z.array(z.string().uuid()).optional(),
  claim_id: z.string().uuid().optional(),
  inscription_id: z.string().optional(),
  tx_hash: z.string().optional(),
  note: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(10),
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);

    const { data: isAdmin } = await userClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "admin_only" }, 403);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = req.headers.get("content-length") === "0"
      ? {}
      : (await req.json().catch(() => ({})));
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
    const args = parsed.data;

    // ----- mark_inscribed: finalise a claim after admin broadcasts the reveal tx
    if (args.action === "mark_inscribed") {
      if (!args.claim_id || !args.inscription_id) {
        return json({ error: "claim_id and inscription_id required" }, 400);
      }
      const { data: updated, error } = await admin
        .from("tart_claims")
        .update({
          status: "inscribed",
          inscription_id: args.inscription_id,
          tx_hash: args.tx_hash ?? null,
          note: args.note ?? null,
        })
        .eq("id", args.claim_id)
        .select()
        .single();
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, claim: updated });
    }

    // ----- fail / cancel: refund ATART back to the user's ledger
    if (args.action === "fail" || args.action === "cancel") {
      if (!args.claim_id) return json({ error: "claim_id required" }, 400);
      const { data: claim, error: cErr } = await admin
        .from("tart_claims").select("*").eq("id", args.claim_id).single();
      if (cErr || !claim) return json({ error: "claim_not_found" }, 404);
      if (claim.status === "inscribed") return json({ error: "already_inscribed" }, 409);

      await admin.from("tart_ledger").insert({
        user_id: claim.user_id,
        delta: claim.amount,
        reason: args.action === "cancel" ? "claim_canceled" : "claim_failed",
        claim_id: claim.id,
        metadata: { note: args.note ?? null },
      });
      const { data: updated } = await admin
        .from("tart_claims")
        .update({ status: args.action === "cancel" ? "canceled" : "failed", note: args.note ?? null })
        .eq("id", claim.id).select().single();
      return json({ ok: true, claim: updated, refunded: claim.amount });
    }

    // ----- process: pull pending claims, mark `inscribing`, return mint+transfer payloads
    let query = admin
      .from("tart_claims")
      .select("id, user_id, amount, btc_address, status, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(args.limit);
    if (args.claim_ids && args.claim_ids.length > 0) {
      query = admin
        .from("tart_claims")
        .select("id, user_id, amount, btc_address, status, created_at")
        .in("id", args.claim_ids);
    }
    const { data: pending, error: pErr } = await query;
    if (pErr) return json({ error: pErr.message }, 500);
    if (!pending || pending.length === 0) {
      return json({ ok: true, processed: 0, claims: [] });
    }

    const payloads = pending.map((c) => {
      const mint = { p: "brc-20", op: "mint", tick: TICK, amt: String(c.amount) };
      const transfer = { p: "brc-20", op: "transfer", tick: TICK, amt: String(c.amount) };
      return {
        claim_id: c.id,
        user_id: c.user_id,
        amount: c.amount,
        btc_address: c.btc_address,
        mint_json: JSON.stringify(mint),
        transfer_json: JSON.stringify(transfer),
        instructions:
          `1) Inscribe ${JSON.stringify(mint)} to claim ${c.amount} ATART, ` +
          `2) Inscribe ${JSON.stringify(transfer)} and send it to ${c.btc_address}, ` +
          `3) Call this function again with action="mark_inscribed", claim_id="${c.id}", inscription_id="…".`,
      };
    });

    const ids = pending.map((c) => c.id);
    await admin.from("tart_claims").update({ status: "inscribing" }).in("id", ids);

    return json({
      ok: true,
      tick: TICK,
      max_supply: MAX_SUPPLY,
      per_mint: PER_MINT,
      processed: payloads.length,
      claims: payloads,
    });
  } catch (e) {
    console.error("tart-claims-worker error:", e);
    return json({ error: "internal_error" }, 500);
  }
});
