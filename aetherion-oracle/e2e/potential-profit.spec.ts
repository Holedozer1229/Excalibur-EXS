import { test, expect } from "@playwright/test";

test.describe("potential profit — UI", () => {
  test("/overnight renders MRR and bounty profit projections", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    await page.goto("/overnight", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("overnight-page")).toBeVisible();
    await expect(page.getByTestId("overnight-velocity-rail")).toBeVisible();

    await expect(page.getByTestId("profit-mrr-10")).toHaveText(/\$59\.9\/mo MRR/);
    await expect(page.getByTestId("profit-mrr-50")).toHaveText(/\$299\.5\/mo MRR/);
    await expect(page.getByTestId("profit-bounty")).toHaveText(/~\$47\.92\/mo illustrative/);

    const fatal = errors.filter((e) => !/stripe|hCaptcha|favicon|websocket|realtime|401|403/i.test(e));
    expect(fatal, fatal.join("\n")).toEqual([]);
  });

  test("/token/lattice volume moonshot shows year-one fee profit", async ({ page }) => {
    await page.goto("/token/lattice", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("volume-moonshot-panel")).toBeVisible();
    await expect(page.getByTestId("moonshot-yearly")).toBeVisible();

    const yearlyText = await page.getByTestId("moonshot-yearly").textContent();
    const solMatch = yearlyText?.match(/([\d,]+(?:\.\d+)?)\s*SOL/i);
    expect(solMatch).toBeTruthy();
    const sol = Number(solMatch![1].replace(/,/g, ""));
    // Moon preset: 50k SOL/day × 1.5% blended × 365 days
    expect(sol).toBeCloseTo(273_750, -2);

    await expect(page.getByText(/\$41\.\d+M/i).first()).toBeVisible();
  });
});
