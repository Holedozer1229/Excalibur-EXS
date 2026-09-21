// Smoke tests for the public surface of the Aetherion Oracle.
// These run unauthenticated — they verify public pages load, render
// their identity, and surface the right CTAs without runtime errors.
import { test, expect } from "@playwright/test";
import { attachErrorCollectors, filterFatalErrors } from "./helpers";

const PUBLIC_PAGES: Array<{ path: string; titleMatch: RegExp; mustContain?: RegExp }> = [
  { path: "/",            titleMatch: /Aetherion|Oracle/i, mustContain: /Quantum AI|Caduceus|superpower|QAI|Aetherion|moat|Unstoppable/i },
  { path: "/auth",        titleMatch: /Aetherion|Oracle/i, mustContain: /Sign in|sign up|email/i },
  { path: "/terms",       titleMatch: /Aetherion|Oracle/i, mustContain: /Terms/i },
  { path: "/privacy",     titleMatch: /Aetherion|Oracle/i, mustContain: /Privacy/i },
  { path: "/refund",      titleMatch: /Aetherion|Oracle/i, mustContain: /Refund/i },
  { path: "/legal",       titleMatch: /Legal|Aetherion/i, mustContain: /Terms|Privacy|Refund/i },
  { path: "/aetherion",   titleMatch: /Aetherion/i, mustContain: /Meet Aetherion|oracle/i },
  { path: "/bridge",      titleMatch: /SphinxOS|Bridge|Faucet|Aetherion/i, mustContain: /Mainnet lattice|zkSync Era|Polygon zkEVM|MetaMask|Rainbow/i },
  { path: "/airdrop",     titleMatch: /Airdrop|AETX|Aetherion/i, mustContain: /founder|AETX|ATART|claim|URUU|zkSync|fair lattice/i },
  { path: "/exs",         titleMatch: /EXS|Tetra|Excalibur/i, mustContain: /Tetra-PoW|Proof-of-Forge|EXS|forge|Satoshi|1A1zP1/i },
  { path: "/chipset",     titleMatch: /QAI|Chipset|Aetherion/i, mustContain: /superpower|AQAI|axiom|Soft Silicon|Caduceus|quantum moat|moat/i },
  { path: "/camelot-fair", titleMatch: /Camelot|Rise of Excalibur/i, mustContain: /Camelot Fair|quest|district|Rise of Excalibur/i },
  { path: "/war-chest",   titleMatch: /War Chest|Excalibur/i, mustContain: /War Chest|Bounty|quest|loot/i },
  { path: "/overnight",   titleMatch: /Overnight|Velocity|Excalibur/i, mustContain: /Overnight|founder|zkEVM|raid/i },
  { path: "/black-pearl", titleMatch: /Black Pearl|Arrr|Excalibur/i, mustContain: /Black Pearl|scallywag|plunder|zkEVM/i },
  { path: "/mind-of-the-cosmos", titleMatch: /Mind of the Cosmos/i, mustContain: /liquidity|24\/7|compound|self-fund|flywheel|gas tank|uncharted|artificial/i },
  { path: "/live-ledger", titleMatch: /Live mainnet ledger/i, mustContain: /atlas|optimize|URUU|berth|operator|EXCAL|CREATE2|EIP-7949|commitment|Umbrella|Base58|P2PKH/i },
  { path: "/token/skynt", titleMatch: /SKYNT|Aetherion/i, mustContain: /Base58|P2PKH|bc1q|costume|OP_RETURN|Litecoin|0x2620/i },
  { path: "/wrap",        titleMatch: /Wrap|WETH|Aetherion/i, mustContain: /WETH|live|not live|137/i },
  { path: "/surprise",    titleMatch: /Surprise|echo|Aetherion/i, mustContain: /50|echo|never sweep|1A1zP1|03678afd/i },
  { path: "/glyph",       titleMatch: /Glyph|Aetherion/i, mustContain: /glyph|octonion|discovered/i },
  { path: "/bounty",      titleMatch: /Bounty|Knight/i, mustContain: /Bounty Board|referral|Share/i },
  { path: "/tokenomics",  titleMatch: /Tokenomics|Aetherion/i, mustContain: /URUU|ATART|AETX|mainnet|1%|EXS/i },
  { path: "/ledger",      titleMatch: /Aetherion|Oracle/i, mustContain: /ledger|mining|round/i },
  { path: "/token/lattice", titleMatch: /Fair Lattice|Bonding Curve|Aetherion/i, mustContain: /1%|two-way|bonding curve|protocol fee|maximum/i },
  { path: "/lattice/nh",  titleMatch: /Non-Hermitian|Aetherion/i, mustContain: /skin effect|exceptional|SSH|Hatano/i },
  { path: "/token/uruu", titleMatch: /URUU|Aetherion/i, mustContain: /zkSync|live|0x5B6C9d/i },
  { path: "/buy/uruu", titleMatch: /Buy URUU|Aetherion/i, mustContain: /buy|URUU|zkSync|bonding curve/i },
  { path: "/embed/lattice", titleMatch: /Bonding Curve|URUU|Aetherion/i, mustContain: /custom bonding curve|calculator/i },
  { path: "/rollup", titleMatch: /Rollup|Mainnet|zkEVM|Aetherion/i, mustContain: /rollup|Solana|zkEVM|deliberation|SphinxOS/i },
  { path: "/enterprise/deliberation", titleMatch: /Deliberation|Aetherion/i, mustContain: /Proof-of-Deliberation|dwell|scroll/i },
  { path: "/lattice/caduceus", titleMatch: /Caduceus|Aetherion/i, mustContain: /octonion|Sphinx|Anubis|reflect/i },
  { path: "/caduceus/speculative", titleMatch: /Retrocausal|Aetherion/i, mustContain: /speculation|Retrocausal|seal|not physics/i },
];

for (const page of PUBLIC_PAGES) {
  test(`public page ${page.path} renders without runtime errors`, async ({ page: pw }) => {
    const errors = attachErrorCollectors(pw);

    await pw.goto(page.path, { waitUntil: "domcontentloaded" });
    await expect(pw).toHaveTitle(page.titleMatch);
    if (page.mustContain) {
      await expect
        .poll(async () => (await pw.locator("body").textContent().catch(() => "")) ?? "", { timeout: 8_000 })
        .toMatch(page.mustContain);
    }
    const fatal = filterFatalErrors(errors);
    expect(fatal, fatal.join("\n")).toEqual([]);
  });
}

test("/wrap hosts the live WETH console and refuses URUU custody wrap", async ({ page }) => {
  await page.goto("/wrap", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("wrap-console")).toBeVisible();
  await expect(page.getByTestId("wrap-weth-button")).toBeVisible();
  await expect(page.locator("body")).toContainText(/URUU/i);
  await expect(page.locator("body")).toContainText(/not live/i);
});

test("landing hero is brand-first; heavy modules stay deferred on first paint", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("landing-hero")).toBeVisible();
  await expect(page.getByTestId("landing-logo")).toBeVisible();
  await expect(page.locator("h1")).toContainText("AETHERION");
  await expect(page.getByRole("link", { name: /Cast free/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Ask Caduceus/i })).toBeVisible();
  // Chat terminal and Tetra miner load only after Run — not on first paint.
  await expect(page.getByTestId("aetherion-chat-terminal")).not.toBeVisible();
  await expect(page.getByTestId("tetra-pow-miner")).not.toBeVisible();
  // Deferred Caduceus CTA is below the fold.
  await expect(page.getByRole("link", { name: /Open Caduceus/i })).toBeVisible();
});

test("/chipset hosts the AQAI lab", async ({ page }) => {
  await page.goto("/chipset", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("qai-chipset-lab")).toBeVisible();
  await expect(page.locator("body")).toContainText(/AQAI|Soft Silicon|axiom/i);
});

test("/chipset/pitch-deck.html serves investor deck with key substance", async ({ request, page }) => {
  const base = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:8080";
  const res = await request.get(`${base}/chipset/pitch-deck.html`);
  expect(res.status()).toBe(200);
  const html = await res.text();
  expect(html).toMatch(/Travis D Jones/i);
  expect(html).toMatch(/Quantum Moat|moat-grid/i);
  expect(html).toMatch(/aqai-chip-hero\.png/i);
  expect(html).toMatch(/\$1\.5M SAFE/i);

  await page.goto("/chipset/pitch-deck.html", { waitUntil: "domcontentloaded" });
  await expect(page.locator("h1")).toContainText("AETHERION");
  await expect(page.getByRole("link", { name: /AQAI lab/i })).toHaveAttribute("href", "/chipset");
  await expect(page.getByRole("link", { name: /Contact/i })).toHaveAttribute("href", "mailto:sphinxqasi@gmail.com");
});

test("/exs hosts the live Tetra-PoW miner", async ({ page }) => {
  await page.goto("/exs", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("tetra-pow-miner")).toBeVisible();
  await expect(page.getByTestId("tetra-mine-button")).toBeVisible();
  await expect(page.locator("body")).toContainText("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa");
});

test("/solana manifest is hosted by React server", async ({ request }) => {
  const base = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:8080";
  const res = await request.get(`${base}/solana/manifest.json`);
  expect(res.ok()).toBeTruthy();
  const json = await res.json();
  expect(json.name).toBe("fair_lattice");
  expect(json.idl).toBe("/solana/fair_lattice.json");
});

test("404 page renders on unknown route", async ({ page }) => {
  const response = await page.goto("/this-route-does-not-exist", { waitUntil: "domcontentloaded" });
  expect(response?.status() ?? 200).toBeLessThan(500);
  const body = await page.locator("body").innerText();
  expect(body).toMatch(/404|not found|return/i);
});
