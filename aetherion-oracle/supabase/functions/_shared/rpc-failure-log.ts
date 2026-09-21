// Structured logging for tier/usage RPC fallbacks.
//
// Writes to public.rpc_failure_log via the service-role client so we can
// track how often the backend degrades to the seeker default, alert on
// spikes, and group failures by function + RPC + failure kind.
//
// Also emits a single-line JSON log to stdout (`[rpc-fallback] {...}`) so
// the same event shows up in the edge function logs even if the DB insert
// itself fails — never block the request on this telemetry.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export type RpcFailureKind =
  | "rpc_error"          // Supabase RPC returned an error object
  | "threw"              // The RPC call threw / network error
  | "corrupted_payload"  // RPC returned a non-object or invalid shape
  | "missing_row";       // RPC returned null / no row for this user

export interface RpcFailureEvent {
  userId: string | null;
  functionName: string;
  rpcName: string;
  failureKind: RpcFailureKind;
  fallbackTier?: string;
  errorCode?: string | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
}

const truncate = (v: unknown, max = 500): string | null => {
  if (v == null) return null;
  const s = typeof v === "string" ? v : (() => { try { return JSON.stringify(v); } catch { return String(v); } })();
  return s.length > max ? s.slice(0, max) : s;
};

export async function logRpcFailure(
  admin: SupabaseClient,
  ev: RpcFailureEvent,
): Promise<void> {
  // Structured stdout line — always emitted, even if the insert below fails.
  const line = {
    tag: "rpc-fallback",
    ts: new Date().toISOString(),
    user_id: ev.userId,
    function_name: ev.functionName,
    rpc_name: ev.rpcName,
    failure_kind: ev.failureKind,
    fallback_tier: ev.fallbackTier ?? "seeker",
    error_code: ev.errorCode ?? null,
    error_message: truncate(ev.errorMessage),
    metadata: ev.metadata ?? {},
  };
  try { console.warn(`[rpc-fallback] ${JSON.stringify(line)}`); } catch { /* */ }

  // Persist — fire-and-forget. Never throw from telemetry.
  try {
    await admin.from("rpc_failure_log").insert({
      user_id: ev.userId,
      function_name: ev.functionName,
      rpc_name: ev.rpcName,
      failure_kind: ev.failureKind,
      fallback_tier: ev.fallbackTier ?? "seeker",
      error_code: ev.errorCode ?? null,
      error_message: truncate(ev.errorMessage),
      metadata: ev.metadata ?? {},
    });
  } catch (e) {
    try { console.error("[rpc-fallback] insert failed:", e); } catch { /* */ }
  }
}
