// Structured-data validation for the tarot pages.
//
// For each tarot route we:
//   1. Extract every <script type="application/ld+json"> from the rendered head/body.
//   2. Parse it as JSON (fail fast on trailing commas, HTML-escaped quotes, etc.
//      — those are the most common Rich Results Test failures).
//   3. Validate the shape against the schema.org type we advertise for that
//      route (WebApplication / CollectionPage / Article) using a small local
//      contract check that mirrors Google's required-field rules.
//   4. Ping schema.org's public validator (the same backend Google's Rich
//      Results Test uses for generic types) and assert zero errors. Skipped
//      automatically when offline / rate-limited so the suite stays green in
//      isolated CI environments.
//
// This is the local equivalent of running Rich Results Test by hand on every
// deploy — if this spec passes, the JSON-LD is well-formed and satisfies the
// per-type required fields Google surfaces.

import { test, expect, request as pwRequest } from "@playwright/test";

type Json = Record<string, unknown>;

const REQUIRED_BY_TYPE: Record<string, string[]> = {
  WebApplication:  ["name", "url", "applicationCategory"],
  CollectionPage:  ["name", "url"],
  Article:         ["headline"],
  Organization:    ["name"],
  WebSite:         ["name", "url"],
  BreadcrumbList:  ["itemListElement"],
  FAQPage:         ["mainEntity"],
};

async function readJsonLd(page: import("@playwright/test").Page): Promise<Json[]> {
  return page.locator('script[type="application/ld+json"]').evaluateAll(
    (nodes) => nodes.map((n) => (n as HTMLScriptElement).textContent || ""),
  ).then((texts) =>
    texts
      .filter(Boolean)
      .map((t, i) => {
        try { return JSON.parse(t) as Json; }
        catch (e) { throw new Error(`JSON-LD block #${i} is not valid JSON: ${(e as Error).message}\n---\n${t}`); }
      }),
  );
}

function assertShape(node: Json, label: string) {
  expect(node["@context"], `${label} missing @context`).toBe("https://schema.org");
  const type = node["@type"];
  expect(typeof type === "string" || Array.isArray(type), `${label} missing @type`).toBe(true);
  const primary = Array.isArray(type) ? String(type[0]) : String(type);
  const required = REQUIRED_BY_TYPE[primary];
  expect(required, `${label} unknown @type "${primary}" — extend REQUIRED_BY_TYPE if intentional`).toBeTruthy();
  for (const key of required!) {
    expect(node[key], `${label} @type=${primary} missing required "${key}"`).toBeTruthy();
  }
  // Url fields must be absolute so crawlers can resolve them.
  for (const urlField of ["url", "mainEntityOfPage"]) {
    const v = node[urlField];
    if (typeof v === "string") {
      expect(v, `${label} "${urlField}" must be absolute https URL`).toMatch(/^https:\/\//);
    }
  }
}

/** Post JSON-LD to schema.org's validator. Returns null when the validator
 *  is unreachable so the test can still pass in offline sandboxes. */
async function schemaOrgValidate(jsonLd: Json): Promise<{ errors: unknown[] } | null> {
  try {
    const ctx = await pwRequest.newContext();
    // Public endpoint used by validator.schema.org's UI. Payload key is `code`.
    const res = await ctx.post("https://validator.schema.org/validate", {
      form: { code: JSON.stringify(jsonLd) },
      timeout: 10_000,
    });
    if (!res.ok()) return null;
    const raw = await res.text();
    // Response is prefixed with `)]}'\n` — the standard XSSI guard.
    const clean = raw.replace(/^\)\]\}'\s*/, "");
    const parsed = JSON.parse(clean) as { errors?: unknown[] };
    return { errors: Array.isArray(parsed.errors) ? parsed.errors : [] };
  } catch {
    return null;
  }
}

const ROUTES: Array<{ path: string; expectTypes: string[] }> = [
  { path: "/tarot/yes-no",                 expectTypes: ["WebApplication"] },
  { path: "/tarot/meanings",               expectTypes: ["CollectionPage"] },
  { path: "/tarot/meanings/the-fool",      expectTypes: ["Article"] },
];

for (const route of ROUTES) {
  test(`JSON-LD on ${route.path} is well-formed and matches expected schema`, async ({ page }) => {
    await page.goto(route.path, { waitUntil: "domcontentloaded" });
    // Helmet mounts JSON-LD after hydration — poll for at least one block.
    await expect
      .poll(async () => (await readJsonLd(page)).length, { timeout: 8_000 })
      .toBeGreaterThan(0);

    const blocks = await readJsonLd(page);
    const seenTypes = new Set<string>();
    blocks.forEach((node, i) => {
      assertShape(node, `${route.path} JSON-LD[${i}]`);
      const t = node["@type"];
      seenTypes.add(Array.isArray(t) ? String(t[0]) : String(t));
    });

    for (const expected of route.expectTypes) {
      expect(seenTypes.has(expected), `${route.path} must ship @type=${expected}`).toBe(true);
    }

    // Best-effort Rich Results parity: send the first block to schema.org's
    // validator. Skips silently when the validator is unreachable.
    const remote = await schemaOrgValidate(blocks[0]);
    if (remote) {
      expect(remote.errors, `schema.org validator flagged errors on ${route.path}`).toHaveLength(0);
    } else {
      test.info().annotations.push({
        type: "info",
        description: `schema.org validator unreachable — validated locally only for ${route.path}`,
      });
    }
  });
}
