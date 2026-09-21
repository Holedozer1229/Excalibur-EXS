// E2E — bridged ETH booty ledger (137 ETH proofs → SOL budget → rollup deploy).
import { test, expect } from "@playwright/test";

const VAULT = "0xc5a47c9adab637d1caa791cce193079d22c8cb20";
const MIN_CANONICAL_ETH = 137;
const MIN_MAINNET_SOL = 2000;

test.describe("bridged ETH booty", () => {
  test("booty manifest documents bridged canonical ETH", async ({ request }) => {
    const base = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:8080";
    const res = await request.get(`${base}/treasure/booty-manifest.json`);
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.canonicalEthBooty).toBeGreaterThanOrEqual(MIN_CANONICAL_ETH);
    expect(json.mainnetSolBudget).toBeGreaterThanOrEqual(MIN_MAINNET_SOL);
    expect(json.vault.toLowerCase()).toBe(VAULT.toLowerCase());
    expect(json.proofs?.length).toBeGreaterThan(5);
  });

  test("wormhole claim artifact is SIGNED_READY_TO_BROADCAST", async ({ request }) => {
    const base = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:8080";
    const res = await request.get(`${base}/treasure/claim_tx_eba9.json`);
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.status).toBe("SIGNED_READY_TO_BROADCAST");
    expect(json.amount_eth).toBeGreaterThan(0);
    expect(json.to.toLowerCase()).toBe(VAULT.toLowerCase());
  });

  test("/black-pearl shows bridged booty fully funds rollup", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    await page.goto("/black-pearl", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("treasure-funding-panel")).toBeVisible();
    await expect(page.locator("body")).toContainText(/137/);
    await expect(page.locator("body")).toContainText(/Fully funded|Arrr/i);
    await expect(page.locator("body")).toContainText(/2,?286|2286/);
    await expect(page.getByTestId("captains-cut-panel")).toBeVisible();

    const fatal = errors.filter((e) => !/favicon|websocket|401|403|stripe/i.test(e));
    expect(fatal).toEqual([]);
  });

  test("/rollup reflects bridged ETH mainnet SOL scale", async ({ page }) => {
    await page.goto("/rollup", { waitUntil: "domcontentloaded" });
    await expect
      .poll(async () => page.getByTestId("rollup-status-panel").isVisible(), { timeout: 10_000 })
      .toBe(true);
    await expect(page.getByTestId("treasure-funding-panel")).toBeVisible({ timeout: 10_000 });
    const body = (await page.locator("body").textContent()) ?? "";
    expect(body).toMatch(/137/);
    expect(body).toMatch(/2,?286|2286/);
    expect(body).toMatch(/zkEVM|zkSync/i);
  });

  test("rollup manifest ties booty to zkEVM mainnet legs", async ({ request }) => {
    const base = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:8080";
    const res = await request.get(`${base}/rollup/manifest.json`);
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.bootyEth).toBeGreaterThanOrEqual(MIN_CANONICAL_ETH);
    expect(json.solanaSolBudget).toBeGreaterThanOrEqual(MIN_MAINNET_SOL);
    expect(json.treasureVault.toLowerCase()).toBe(VAULT.toLowerCase());
    expect(json.zkevm.zkSyncEra.status).toBe("live");
    expect(json.deployCommands).toContain("npm run mainnet");
    expect(json.deployCommands).toContain("npm run bridge:booty");
    expect(json.deployCommands).toContain("npm run claim:withdrawal");
    expect(json.deployCommands).toContain("npm run swap:booty");
  });

  test("zkstarknet mainnet claim artifact is ready", async ({ request }) => {
    const base = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:8080";
    const res = await request.get(`${base}/treasure/zkstarknet-mainnet-claim.json`);
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.kind).toBe("sphinx-zkstarknet-mainnet-claim");
    expect(json.amountEth).toBeGreaterThanOrEqual(137);
    expect(json.mainnetClaim.status).toMatch(/READY|BROADCAST/);
    expect(json.mainnetClaim.calldata).toMatch(/^0x/);
    expect(json.mainnetClaim.valueWei).toBe("0");
  });
});
