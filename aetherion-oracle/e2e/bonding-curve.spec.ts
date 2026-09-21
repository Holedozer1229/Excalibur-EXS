import { test, expect } from "@playwright/test";

test.describe("custom bonding curve", () => {
  test("/token/lattice quotes buy and sell on the power curve", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    await page.goto("/token/lattice", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /fair lattice/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/solana program live|token live/i).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("volume-moonshot-panel")).toBeVisible();
    await expect(page.getByTestId("curve-referral-hub")).toBeVisible();
    await expect(page.getByTestId("moonshot-yearly")).toBeVisible();
    await expect(page.getByRole("heading", { name: /custom bonding curve/i })).toBeVisible();

    const curve = page.getByTestId("custom-bonding-curve");
    await expect(curve).toBeVisible();
    await curve.locator("#curve-amount").fill("1");
    await expect(curve.getByText(/you receive/i)).toBeVisible();
    await expect(curve.getByText(/if you sell it back/i)).toBeVisible();

    await curve.getByRole("button", { name: /sell wuruu/i }).click();
    await curve.locator("#curve-amount").fill("100000");
    await expect(curve.getByText(/you receive/i)).toBeVisible();
    await expect(curve.getByText(/avg price/i)).toBeVisible();

    await curve.getByRole("button", { name: /steep/i }).click();
    await expect(curve.getByText(/n = 2\.50/i)).toBeVisible();

    await page.getByText(/compare: constant-product amm/i).click();
    await expect(page.getByRole("heading", { name: /two-way quote/i })).toBeVisible();

    const fatal = errors.filter((e) => !/stripe|hCaptcha|favicon|websocket|realtime/i.test(e));
    expect(fatal, fatal.join("\n")).toEqual([]);
  });

  test("/token/uruu documents the live zkSync contract", async ({ page }) => {
    await page.goto("/token/uruu", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /^uruu$/i })).toBeVisible();
    await expect(page.getByText("0x5B6C9d85465Cc6FFe84039183872239657D90208").first()).toBeVisible();
    await expect(page.getByText(/not live/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open the bonding curve/i })).toBeVisible();
    await expect(page.getByText(/total supply/i)).toBeVisible({ timeout: 12_000 });
    await expect(page.getByText(/100,000,000|100000000/)).toBeVisible();
  });

  test("/buy/uruu landing and /embed/lattice widget load", async ({ page }) => {
    await page.goto("/buy/uruu", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("buy-uruu-page")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: /buy uruu/i })).toBeVisible();
    await expect(page.getByTestId("custom-bonding-curve")).toBeVisible();

    await page.goto("/embed/lattice", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("embed-lattice")).toBeVisible();
    await expect(page.getByTestId("custom-bonding-curve")).toBeVisible();
  });

  test("/tokenomics and /token/wuruu stay consistent with live URUU", async ({ page }) => {
    await page.goto("/tokenomics", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("link", { name: /^uruu$/i }).first()).toBeVisible();
    await expect(page.getByText(/custom bonding curve/i).first()).toBeVisible();

    await page.goto("/token/wuruu", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /^wuruu$/i })).toBeVisible();
    await expect(page.getByText(/token live|blockscout live|cached on-chain/i).first()).toBeVisible({ timeout: 12_000 });
    await expect(page.getByRole("link", { name: /custom bonding curve/i }).first()).toBeVisible();
  });
});
