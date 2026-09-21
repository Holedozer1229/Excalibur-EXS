// SEO surface smoke: sitemap, robots, canonicals, meta descriptions.
import { test, expect } from "@playwright/test";

test("robots.txt is served and references sitemap", async ({ request }) => {
  const res = await request.get("/robots.txt");
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(body).toMatch(/User-agent:\s*\*/i);
  expect(body).toMatch(/Sitemap:\s*https?:\/\/[^\s]+sitemap\.xml/i);
  // Admin & sensitive routes must remain disallowed.
  expect(body).toMatch(/Disallow:\s*\/admin\//);
  expect(body).toMatch(/Disallow:\s*\/debug/);
});

test("sitemap.xml is valid XML and contains key public routes", async ({ request }) => {
  const res = await request.get("/sitemap.xml");
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(body).toMatch(/<\?xml/);
  expect(body).toMatch(/<urlset/);
  for (const path of ["/", "/tarot", "/tarot/yes-no", "/token/aetx", "/ledger", "/buy/uruu", "/exs", "/camelot-fair", "/war-chest", "/bounty"]) {
    expect(body).toContain(`<loc>https://www.excaliburcrypto.com${path}</loc>`);
  }
  // Sensitive routes must NOT be indexed.
  for (const path of ["/admin", "/debug", "/reset-password", "/d/", "/claim/tart/"]) {
    expect(body).not.toContain(`<loc>https://www.excaliburcrypto.com${path}`);
  }
});

const HEAD_ROUTES: Array<{ path: string; titleMatch: RegExp; descMatch?: RegExp }> = [
  { path: "/",              titleMatch: /Aetherion|Oracle/i },
  { path: "/tarot/yes-no",  titleMatch: /Yes|No|Tarot/i, descMatch: /yes|no|maybe|tarot/i },
  { path: "/token/aetx",    titleMatch: /AETX|Aetherion/i },
  { path: "/buy/uruu",      titleMatch: /Buy URUU|Aetherion/i, descMatch: /buy|uruu|zkSync|bonding/i },
];

for (const route of HEAD_ROUTES) {
  test(`head metadata is present on ${route.path}`, async ({ page }) => {
    await page.goto(route.path, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveTitle(route.titleMatch);
    const readDesc = async () => {
      const values = await page.locator('head meta[name="description"]').evaluateAll(
        (nodes) => nodes.map((n) => (n as HTMLMetaElement).content),
      );
      return values.filter(Boolean);
    };
    const readCanonicals = async () =>
      page.locator('head link[rel="canonical"]').evaluateAll(
        (nodes) => nodes.map((n) => (n as HTMLLinkElement).href),
      );
    if (route.descMatch) {
      await expect
        .poll(async () => (await readDesc()).join(" || "), { timeout: 8_000 })
        .toMatch(route.descMatch);
    }
    // Wait for Helmet to attach the per-route canonical (pages that
    // render a loading state first mount PageHead only after data loads).
    const selfCanonical = new RegExp(route.path.replace(/\//g, "\\/") + "\\/?$");
    await expect
      .poll(async () => (await readCanonicals()).some((h) => selfCanonical.test(h)), { timeout: 8_000 })
      .toBe(true);
    const descs = await readDesc();
    expect(descs.length, "meta description present").toBeGreaterThan(0);
    for (const d of descs) expect(d.length).toBeLessThanOrEqual(160);
  });
}
