// vm-terminal — execute a command on a remote SSH host with optional
// live stdout/stderr streaming via Supabase Realtime broadcast.
//
// POST { host, port?, username, password? | privateKey?, command, timeoutMs?, sessionId? }
//
// When `sessionId` is provided, the function broadcasts events on topic
// `vm-term:{sessionId}` as the command runs:
//   { event: "chunk", payload: { stream: "stdout"|"stderr", text } }
//   { event: "done",  payload: { code, durationMs } }
// The final HTTP response still includes the full captured stdout/stderr.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { NodeSSH } from "npm:node-ssh@13.2.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_KEY);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Send a single broadcast message via the Realtime HTTP API. Best-effort —
// failures are swallowed so they never break command execution.
async function broadcast(topic: string, event: string, payload: unknown) {
  try {
    await fetch(`${SUPABASE_URL}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({
        messages: [{ topic, event, payload, private: true }],
      }),
    });
  } catch (_) { /* ignore */ }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const started = Date.now();
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
    const { data: cd } = await userClient.auth.getClaims(auth.replace("Bearer ", ""));
    if (!cd?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = cd.claims.sub;

    // Tier gate: oracle_pro only (admins bypass)
    const { data: ts } = await admin.rpc("get_user_tier_state", { _user_id: userId });
    const tier = (ts as { tier?: string } | null)?.tier ?? "seeker";
    const isAdmin = !!(ts as { is_admin?: boolean } | null)?.is_admin;
    if (!isAdmin && tier !== "oracle_pro") {
      return json({ error: "vm-terminal requires Oracle Pro", upgrade_required: "oracle_pro" }, 402);
    }

    const body = await req.json();
    const host = String(body?.host ?? "").trim();
    const port = Number(body?.port ?? 22);
    const username = String(body?.username ?? "").trim();
    const password = body?.password ? String(body.password) : undefined;
    const privateKey = body?.privateKey ? String(body.privateKey) : undefined;
    const command = String(body?.command ?? "").trim();
    const timeoutMs = Math.min(Number(body?.timeoutMs ?? 30_000), 60_000);
    const sessionId = body?.sessionId ? String(body.sessionId).slice(0, 64) : null;
    const topic = sessionId ? `vm-term:${userId}:${sessionId}` : null;

    if (!host || !username || !command) return json({ error: "host, username, command required" }, 400);
    if (!password && !privateKey) return json({ error: "password or privateKey required" }, 400);
    if (/\r|\n/.test(command)) return json({ error: "multi-line commands not allowed" }, 400);

    const ssh = new NodeSSH();
    await Promise.race([
      ssh.connect({ host, port, username, password, privateKey, readyTimeout: 15_000 }),
      new Promise((_, rej) => setTimeout(() => rej(new Error("connect timeout")), 15_000)),
    ]);

    // Persist a session row up front so the user can find it even on crash.
    let dbSessionId: string | null = null;
    if (sessionId) {
      const { data: srow } = await admin.from("vm_terminal_sessions").insert({
        user_id: userId, session_id: sessionId, host, username, command, status: "running",
      }).select("id").single();
      dbSessionId = srow?.id ?? null;
    }

    if (topic) await broadcast(topic, "open", { host, command, at: Date.now() });

    const decoder = new TextDecoder();
    let stdout = "";
    let stderr = "";
    const onStdout = (chunk: Uint8Array) => {
      const text = decoder.decode(chunk);
      stdout += text;
      if (topic) broadcast(topic, "chunk", { stream: "stdout", text });
    };
    const onStderr = (chunk: Uint8Array) => {
      const text = decoder.decode(chunk);
      stderr += text;
      if (topic) broadcast(topic, "chunk", { stream: "stderr", text });
    };

    const execPromise = ssh.exec(command, [], {
      stream: "both",
      onStdout, onStderr,
      execOptions: { pty: false },
    }) as Promise<unknown>;

    let code: number | null = 0;
    let timedOut = false;
    let errorMessage: string | null = null;
    try {
      await Promise.race([
        execPromise,
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error("command timeout")), timeoutMs)),
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errorMessage = msg;
      timedOut = /timeout/i.test(msg);
      code = timedOut ? 124 : 1;
      stderr += `\n[${msg}]`;
      if (topic) await broadcast(topic, "chunk", { stream: "stderr", text: `\n[${msg}]` });
    }
    ssh.dispose();

    const duration = Date.now() - started;
    const status = code === 0 ? "ok" : (timedOut ? "timeout" : "error");

    // Persist final transcript (idempotent — update by session_id)
    if (sessionId) {
      await admin.from("vm_terminal_sessions").update({
        stdout, stderr, exit_code: code, duration_ms: duration,
        status, error_message: errorMessage, ended_at: new Date().toISOString(),
      }).eq("session_id", sessionId);
    }

    // Final status carries totals so the UI can recover even if chunks dropped.
    if (topic) await broadcast(topic, "done", {
      code, status, durationMs: duration,
      stdoutBytes: stdout.length, stderrBytes: stderr.length,
      stdout, stderr, errorMessage, sessionId, dbSessionId,
    });

    await admin.from("terminal_audit").insert({
      user_id: userId, command: `ssh:${command.slice(0, 200)}`,
      args: { host, port, username, streamed: !!topic, session_id: sessionId }, tier,
      credit_cost: 0, status: code === 0 ? "ok" : "error",
      error: code !== 0 ? stderr.slice(0, 500) : null,
      duration_ms: duration,
    });

    return json({
      ok: code === 0, stdout, stderr, code, status,
      durationMs: duration, sessionId, dbSessionId, errorMessage,
    });
  } catch (_e) {
    return json({ ok: false, error: "An internal error occurred. Please try again." }, 500);
  }
});
