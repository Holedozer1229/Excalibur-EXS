/**
 * Verifies that sitemap.xml entries exactly match the canonical URLs the token
 * pages render through <PageHead path="..." /> (canonical + og:url = SITE_ORIGIN + path).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SITE_ORIGIN } from "@/lib/site";

const PAGES: { file: string; expectedPath: string }[] = [
  { file: "src/pages/TokenSkynt.tsx", expectedPath: "/token/skynt" },
  { file: "src/pages/TokenWuruu.tsx", expectedPath: "/token/wuruu" },
];

function readProject(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

function pageHeadPath(source: string): string | null {
  const head = source.slice(source.indexOf("<PageHead"));
  const match = head.match(/path=\{?["'`]([^"'`]+)["'`]\}?/);
  return match ? match[1] : null;
}

describe("sitemap ↔ canonical parity", () => {
  const sitemap = readProject("public/sitemap.xml");
  const locs = Array.from(sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1].trim());

  it("has no sitemap URLs on a foreign origin", () => {
    const foreign = locs.filter((u) => !u.startsWith(`${SITE_ORIGIN}/`) && u !== SITE_ORIGIN);
    expect(foreign).toEqual([]);
  });

  for (const page of PAGES) {
    it(`${page.expectedPath} canonical matches its sitemap entry exactly`, () => {
      const path = pageHeadPath(readProject(page.file));
      expect(path).toBe(page.expectedPath);

      const canonical = `${SITE_ORIGIN}${path}`;
      expect(locs).toContain(canonical);
      // exactly one entry, no trailing-slash or www duplicate
      expect(locs.filter((u) => u.replace(/\/$/, "") === canonical)).toHaveLength(1);
    });
  }
});
