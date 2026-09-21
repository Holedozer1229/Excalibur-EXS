import { test, expect } from "@playwright/test";

test.describe("wheeler it from bit", () => {
  test("/lattice/bit collapses intent to a public bit string", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    await page.goto("/lattice/bit", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1, name: /^it from bit$/i })).toBeVisible();
    await expect(page.getByText(/john archibald wheeler/i)).toBeVisible();

    const panel = page.getByTestId("bit-collapse-panel");
    await panel.getByRole("button", { name: /collapse to bits/i }).click();
    await expect(panel.getByText(/commitment/i)).toBeVisible();
    await expect(panel.getByText(/#[1-9]\d? /)).toBeVisible();

    const fatal = errors.filter((e) => !/stripe|hCaptcha|favicon|websocket|realtime/i.test(e));
    expect(fatal, fatal.join("\n")).toEqual([]);
  });
});
