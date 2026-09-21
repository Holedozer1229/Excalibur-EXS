// E2E — mainnet zkEVM rollup command center + hosted manifests.
import { test, expect } from "@playwright/test";

test.describe("mainnet zkEVM rollup", () => {
  test("/rollup shows status panel and zkEVM rails", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    await page.goto("/rollup", { waitUntil: "domcontentloaded" });
    await expect
      .poll(async () => await page.title(), { timeout: 10_000 })
      .toMatch(/Rollup|Mainnet|zkEVM|Aetherion/i);
    await expect
      .poll(async () => page.getByTestId("rollup-status-panel").isVisible(), { timeout: 10_000 })
      .toBe(true);
    await expect(page.getByTestId("rollup-leg-zksync")).toBeVisible();
    await expect(page.getByTestId("rollup-leg-polygon")).toBeVisible();
    await expect(page.getByTestId("rollup-rail-zkevm")).toBeVisible();
    await expect(page.locator("body")).toContainText(/zkEVM|zkSync|Polygon/i);

    const fatal = errors.filter((e) => !/favicon|websocket|401|403/i.test(e));
    expect(fatal).toEqual([]);
  });

  test("/bridge?mode=mainnet surfaces mainnet lattice", async ({ page }) => {
    await page.goto("/bridge?mode=mainnet", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toContainText(/zkSync Era|Polygon zkEVM|Mainnet lattice/i);
  });
});

test("/rollup manifest is hosted", async ({ request }) => {
  const base = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:8080";
  const res = await request.get(`${base}/rollup/manifest.json`);
  expect(res.ok()).toBeTruthy();
  const json = await res.json();
  expect(json.name).toBe("sphinxos-zkevm-rollup");
  expect(json.zkevm.zkSyncEra.chainId).toBe(324);
  expect(json.zkevm.polygonZkEvm.chainId).toBe(1101);
  expect(json.zkevm.uruu.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
});
