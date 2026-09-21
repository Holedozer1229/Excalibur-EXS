// Integration test for public.get_user_tier_state.
//
// Regression guard: a brand-new user (no row in query_usage, no row in
// subscribers) MUST see daily_remaining=100000 — never null, never 0 due to a
// NULL coalescing bug. Free Seeker is product-ungated.
//
// We use the service role to create a confirmed user, call the RPC directly
// against the database (the same call the user-state edge function makes),
// then clean up.
//
// Required env (loaded automatically from project .env):
//   VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

assert(SUPABASE_URL, "SUPABASE_URL missing");
assert(SERVICE_ROLE, "SUPABASE_SERVICE_ROLE_KEY missing");

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const randomEmail = () =>
  `tier-test-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}@example.com`;

async function makeUser(): Promise<{ id: string; email: string }> {
  const email = randomEmail();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: `Pw_${crypto.randomUUID()}`,
    email_confirm: true,
  });
  if (error) throw error;
  return { id: data.user!.id, email };
}

async function deleteUser(id: string) {
  await admin.auth.admin.deleteUser(id).catch(() => { /* ignore */ });
}

Deno.test("get_user_tier_state: new user gets daily_remaining=100000 (never null/0)", async () => {
  const user = await makeUser();
  try {
    const { data, error } = await admin.rpc("get_user_tier_state", { _user_id: user.id });
    if (error) throw error;
    const state = data as Record<string, unknown>;

    assertEquals(state.tier, "seeker", "default tier");
    assertEquals(state.subscribed, false, "not subscribed");
    assertEquals(state.daily_limit, 100000, "daily_limit=100000");
    assertEquals(state.daily_usage, 0, "no usage yet");
    assertEquals(state.daily_remaining, 100000, "daily_remaining must be 100000");
    assert(state.daily_remaining !== null, "daily_remaining MUST NOT be null");
    assertEquals(state.monthly_usage, 0, "monthly_usage=0");
    assert(typeof state.monthly_limit === "number" && (state.monthly_limit as number) >= 450,
      "monthly_limit at least seeker default");
  } finally {
    await deleteUser(user.id);
  }
});

Deno.test("get_user_tier_state: returns complete shape with no nulls", async () => {
  const user = await makeUser();
  try {
    const { data, error } = await admin.rpc("get_user_tier_state", { _user_id: user.id });
    if (error) throw error;
    const state = data as Record<string, unknown>;
    for (const key of [
      "tier", "subscribed", "monthly_usage", "monthly_limit",
      "daily_usage", "daily_limit", "daily_remaining", "period",
    ]) {
      assert(key in state, `missing key ${key}`);
      assert(state[key] !== null, `${key} must not be null`);
    }
  } finally {
    await deleteUser(user.id);
  }
});

Deno.test("get_user_tier_state: counts existing usage correctly", async () => {
  const user = await makeUser();
  try {
    // Seed 3 queries today.
    const today = new Date().toISOString().slice(0, 10);
    const { error: insErr } = await admin.from("query_usage").insert({
      user_id: user.id, usage_date: today, query_count: 3,
    });
    if (insErr) throw insErr;

    const { data } = await admin.rpc("get_user_tier_state", { _user_id: user.id });
    const state = data as Record<string, unknown>;
    assertEquals(state.daily_usage, 3);
    assertEquals(state.daily_remaining, 12);
    assertEquals(state.monthly_usage, 3);
  } finally {
    await deleteUser(user.id);
  }
});
