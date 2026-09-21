// Smoke test for exponential-backoff retry behavior in the shared LLM client.
// We stub globalThis.fetch to return transient 502/503 responses on the first
// attempts and a valid completion on the last, then assert:
//   - the client retried the expected number of times
//   - the delay between attempts grew (exponential backoff, not a tight loop)
//   - Retry-After header on a 503 is honored
//   - fatal 4xx (401/402/429) fail-fast without retry
//
// Runs under `deno test --allow-net --allow-env`.

import { assert, assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { chat, type LlmConfig } from "../_shared/llm.ts";

const CFG: LlmConfig = {
  provider: "admin",
  baseUrl: "https://stub.local/v1",
  model: "stub-model",
  apiKey: "test-key",
};

function okBody() {
  return JSON.stringify({ choices: [{ message: { content: "hello world" } }] });
}

/** Install a fake fetch + fake setTimeout; return controls + cleanup. */
function installStubs(responses: Array<() => Response>) {
  const origFetch = globalThis.fetch;
  const origSetTimeout = globalThis.setTimeout;
  const calls: Array<{ url: string; at: number }> = [];
  const delays: number[] = [];
  let idx = 0;
  const start = performance.now();

  globalThis.fetch = ((input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : (input as Request).url ?? String(input);
    calls.push({ url, at: performance.now() - start });
    const make = responses[Math.min(idx, responses.length - 1)];
    idx++;
    return Promise.resolve(make());
  }) as typeof fetch;

  // Fast-forward backoff: record the delay, then resolve immediately.
  globalThis.setTimeout = ((cb: () => void, ms?: number) => {
    delays.push(Number(ms ?? 0));
    return origSetTimeout(cb, 0);
  }) as typeof setTimeout;

  return {
    calls,
    delays,
    restore() {
      globalThis.fetch = origFetch;
      globalThis.setTimeout = origSetTimeout;
    },
  };
}

Deno.test("chat() retries transient 502 with exponential backoff and eventually succeeds", async () => {
  const stubs = installStubs([
    () => new Response("bad gateway", { status: 502 }),
    () => new Response("bad gateway", { status: 502 }),
    () => new Response(okBody(), { status: 200, headers: { "content-type": "application/json" } }),
  ]);
  try {
    const out = await chat(CFG, { messages: [{ role: "user", content: "hi" }] });
    assertEquals(out.text, "hello world");
    assertEquals(stubs.calls.length, 3, "should retry twice then succeed");
    assertEquals(stubs.delays.length, 2, "one backoff sleep per retry");
    // Exponential: second delay > first delay (base * 2^attempt + jitter).
    assert(stubs.delays[1] > stubs.delays[0], `expected exponential growth, got ${stubs.delays.join(", ")}`);
    // First backoff should be at least the base delay (~400ms).
    assert(stubs.delays[0] >= 400, `first delay too small: ${stubs.delays[0]}`);
  } finally {
    stubs.restore();
  }
});

Deno.test("chat() honors Retry-After header on 503", async () => {
  const stubs = installStubs([
    () => new Response("try later", { status: 503, headers: { "retry-after": "2" } }),
    () => new Response(okBody(), { status: 200 }),
  ]);
  try {
    await chat(CFG, { messages: [{ role: "user", content: "hi" }] });
    assertEquals(stubs.delays.length, 1);
    assertEquals(stubs.delays[0], 2000, "Retry-After: 2 must map to 2000ms sleep");
  } finally {
    stubs.restore();
  }
});

Deno.test("chat() gives up after MAX_ATTEMPTS transient failures", async () => {
  const stubs = installStubs([
    () => new Response("upstream", { status: 502 }),
    () => new Response("upstream", { status: 502 }),
    () => new Response("upstream", { status: 502 }),
    () => new Response("upstream", { status: 503 }),
  ]);
  try {
    await assertRejects(
      () => chat(CFG, { messages: [{ role: "user", content: "hi" }] }),
      Error,
      "AI 503",
    );
    assertEquals(stubs.calls.length, 4, "should try MAX_ATTEMPTS=4 times");
    assertEquals(stubs.delays.length, 3, "should sleep between attempts, not after last");
  } finally {
    stubs.restore();
  }
});

Deno.test("chat() does NOT retry on fatal 401/402/429", async () => {
  for (const [status, msg] of [[401, "AUTH_FAILED"], [402, "CREDITS_EXHAUSTED"], [429, "RATE_LIMIT"]] as const) {
    const stubs = installStubs([() => new Response("nope", { status })]);
    try {
      await assertRejects(
        () => chat(CFG, { messages: [{ role: "user", content: "hi" }] }),
        Error,
        msg,
      );
      assertEquals(stubs.calls.length, 1, `status ${status} must fail fast, no retry`);
      assertEquals(stubs.delays.length, 0, `status ${status} must not sleep`);
    } finally {
      stubs.restore();
    }
  }
});

Deno.test("chat() retries on network-level errors (fetch throw)", async () => {
  let calls = 0;
  const origFetch = globalThis.fetch;
  const origSetTimeout = globalThis.setTimeout;
  const delays: number[] = [];
  globalThis.setTimeout = ((cb: () => void, ms?: number) => {
    delays.push(Number(ms ?? 0));
    return origSetTimeout(cb, 0);
  }) as typeof setTimeout;
  globalThis.fetch = (() => {
    calls++;
    if (calls < 3) return Promise.reject(new TypeError("network down"));
    return Promise.resolve(new Response(okBody(), { status: 200 }));
  }) as typeof fetch;
  try {
    const out = await chat(CFG, { messages: [{ role: "user", content: "hi" }] });
    assertEquals(out.text, "hello world");
    assertEquals(calls, 3);
    assert(delays[1] > delays[0], "network retries also back off exponentially");
  } finally {
    globalThis.fetch = origFetch;
    globalThis.setTimeout = origSetTimeout;
  }
});
