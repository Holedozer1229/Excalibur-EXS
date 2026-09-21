// Yes/No tarot page: deterministic public reading, must load without auth.
import { test, expect } from "@playwright/test";

test("/tarot/yes-no renders question form and verdict UI", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`console.error: ${m.text()}`); });

  await page.goto("/tarot/yes-no", { waitUntil: "domcontentloaded" });

  await expect
    .poll(async () => (await page.locator("body").innerText().catch(() => "")) ?? "", { timeout: 8_000 })
    .toMatch(/yes|no|maybe|tarot/i);

  // JSON-LD schema markup should be present for SEO.
  const jsonLd = await page.locator('script[type="application/ld+json"]').count();
  expect(jsonLd).toBeGreaterThan(0);

  const fatal = errors.filter((e) => !/stripe|hCaptcha|favicon|websocket|realtime|signal/i.test(e));
  expect(fatal, fatal.join("\n")).toEqual([]);
});
