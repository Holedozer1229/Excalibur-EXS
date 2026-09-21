import { defineConfig, devices } from "@playwright/test";

// Cloud shells often set NO_COLOR=1 and FORCE_COLOR=0 together; Node warns on the conflict.
if (process.env.NO_COLOR) {
  delete process.env.FORCE_COLOR;
}

// E2E smoke tests against the running preview/dev server.
// Set PLAYWRIGHT_BASE_URL when running against a deployed environment.
const iPhone = devices["iPhone 13"];
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:8080";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : undefined,
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run build && npm run preview -- --host 127.0.0.1 --port 8080",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium-mobile",
      use: {
        // Force chromium engine while keeping the iPhone 13 viewport / UA.
        browserName: "chromium",
        viewport: iPhone.viewport,
        userAgent: iPhone.userAgent,
        deviceScaleFactor: iPhone.deviceScaleFactor,
        isMobile: iPhone.isMobile,
        hasTouch: iPhone.hasTouch,
      },
    },
  ],
});
