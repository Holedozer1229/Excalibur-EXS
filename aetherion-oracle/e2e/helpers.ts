import type { Page } from "@playwright/test";

/** Base URL for request fixtures — matches playwright.config.ts default. */
export function baseUrl(): string {
  return process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:8080";
}

/** Attach listeners that collect console/page errors during a test. */
export function attachErrorCollectors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`);
  });
  return errors;
}

/** Drop noisy third-party / HMR warnings so smoke tests stay stable. */
export function filterFatalErrors(errors: string[]): string[] {
  return errors.filter(
    (e) =>
      !/stripe|hCaptcha|favicon|websocket|realtime|signal|fetchPriority|fetchpriority|status of 401|status of 403|Content Security Policy|blockscout|Cannot find module .*vite\/dist\/node\/chunks|NO_COLOR.*FORCE_COLOR/i.test(
        e,
      ),
  );
}

/** Navigate and wait for DOM; returns collected errors (not yet filtered). */
export async function gotoDom(page: Page, path: string): Promise<string[]> {
  const errors = attachErrorCollectors(page);
  await page.goto(path, { waitUntil: "domcontentloaded" });
  return errors;
}
