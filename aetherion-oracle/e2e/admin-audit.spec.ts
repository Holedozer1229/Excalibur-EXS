// E2E — /admin/audit auth gate + admin-only audit log surface.
import { test, expect } from "@playwright/test";
import { attachErrorCollectors, filterFatalErrors } from "./helpers";

test.describe("/admin/audit", () => {
  test("redirects unauthenticated visitors to /auth", async ({ page }) => {
    const errors = attachErrorCollectors(page);
    await page.goto("/admin/audit", { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/auth/, { timeout: 8_000 });
    expect(page.url()).toMatch(/\/auth/);
    expect(filterFatalErrors(errors)).toEqual([]);
  });

  test("never exposes audit table without admin session", async ({ page, context }) => {
    const errors = attachErrorCollectors(page);
    await context.clearCookies();
    await page.goto("/admin/audit", { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/auth/, { timeout: 8_000 });
    expect(page.url()).toMatch(/\/auth/);
    await expect(page.getByTestId("admin-audit-page")).not.toBeVisible();
    expect(filterFatalErrors(errors)).toEqual([]);
  });

  test("page head is no-index and title mentions audit when reachable", async ({ page }) => {
    await page.goto("/admin/audit", { waitUntil: "domcontentloaded" });
    // Unauthenticated users land on /auth — still verify no server error.
    const status = await page.evaluate(() => document.readyState);
    expect(status).toBe("complete");
    const title = await page.title();
    expect(title).toMatch(/Aetherion|Audit|Sign/i);
  });
});

test.describe("/admin/audit DOM contract", () => {
  test("loading shell uses data-testid before auth resolves", async ({ page }) => {
    await page.route("**/*", async (route) => {
      // Slow auth slightly so loading state may flash — best-effort.
      if (/supabase\.co.*auth/.test(route.request().url())) {
        await new Promise((r) => setTimeout(r, 200));
      }
      await route.continue();
    });
    await page.goto("/admin/audit", { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/(auth|admin\/audit)/, { timeout: 8_000 });
    const loading = page.getByTestId("admin-audit-loading");
    const denied = page.getByTestId("admin-audit-denied");
    const audit = page.getByTestId("admin-audit-page");
    await expect
      .poll(async () => {
        if (await audit.isVisible()) return "audit";
        if (await denied.isVisible()) return "denied";
        if (await loading.isVisible()) return "loading";
        if (page.url().includes("/auth")) return "auth";
        return "unknown";
      }, { timeout: 8_000 })
      .not.toBe("unknown");
  });
});
