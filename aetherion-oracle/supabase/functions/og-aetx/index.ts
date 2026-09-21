// og-aetx — dynamic Open Graph image for /token/aetx.
// Fetches live AETX BRC-20 supply from Hiro and renders a 1200x630 PNG
// (with SVG fallback) that shows tick, inscription ID, and minted progress.
import satori from "npm:satori@0.10.13";
import { Resvg, initWasm } from "npm:@resvg/resvg-wasm@2.6.2";

const AETX_INSCRIPTION_ID =
  "81231a6098679a4b8183c6d4695b46666772ee7b09d30b6b1636f8e78be89dfbi0";
const HIRO = "https://api.hiro.so/ordinals/v1";

let wasmReady: Promise<void> | null = null;
async function ensureWasm() {
  if (!wasmReady) {
    wasmReady = (async () => {
      const wasm = await fetch(
        "https://unpkg.com/@resvg/resvg-wasm@2.6.2/index_bg.wasm",
      ).then((r) => r.arrayBuffer());
      await initWasm(wasm);
    })();
  }
  return wasmReady;
}

let fontPromise: Promise<{ regular: ArrayBuffer; bold: ArrayBuffer }> | null = null;
async function getFonts() {
  if (!fontPromise) {
    fontPromise = (async () => {
      const [regular, bold] = await Promise.all([
        fetch("https://cdn.jsdelivr.net/gh/JetBrains/JetBrainsMono@master/fonts/ttf/JetBrainsMono-Regular.ttf").then((r) => r.arrayBuffer()),
        fetch("https://cdn.jsdelivr.net/gh/JetBrains/JetBrainsMono@master/fonts/ttf/JetBrainsMono-Bold.ttf").then((r) => r.arrayBuffer()),
      ]);
      return { regular, bold };
    })();
  }
  return fontPromise;
}

type Live = {
  tick: string;
  max: number;
  minted: number;
  pct: number;
  txCount: number | null;
  block: number | null;
};

async function fetchLive(): Promise<Live> {
  const fallback: Live = { tick: "AETX", max: 21_000_000, minted: 0, pct: 0, txCount: null, block: null };
  try {
    const [tokR, insR] = await Promise.all([
      fetch(`${HIRO}/brc-20/tokens/AETX`),
      fetch(`${HIRO}/inscriptions/${AETX_INSCRIPTION_ID}`),
    ]);
    const tokJ = tokR.ok ? await tokR.json() : null;
    const t = tokJ && "token" in (tokJ as object) ? (tokJ as { token: Record<string, unknown> }).token : tokJ;
    const insJ = insR.ok ? await insR.json() : null;
    const max = Number((t as { max_supply?: string })?.max_supply ?? 21_000_000);
    const minted = Number((t as { minted_supply?: string })?.minted_supply ?? 0);
    return {
      tick: String((t as { ticker?: string })?.ticker ?? "AETX").toUpperCase(),
      max,
      minted,
      pct: max > 0 ? Math.min(100, (minted / max) * 100) : 0,
      txCount: Number((t as { tx_count?: number })?.tx_count ?? 0) || null,
      block: Number((insJ as { genesis_block_height?: number })?.genesis_block_height ?? 0) || null,
    };
  } catch {
    return fallback;
  }
}

function fmt(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function shortId(id: string): string {
  return `${id.slice(0, 10)}…${id.slice(-10)}`;
}

function template(live: Live) {
  const pctLabel = `${live.pct.toFixed(2)}%`;
  const gold = "#FFBF00";
  const barW = Math.max(2, Math.round((1040 * live.pct) / 100));
  return {
    type: "div",
    props: {
      style: {
        width: "1200px",
        height: "630px",
        display: "flex",
        flexDirection: "column",
        padding: "72px 80px",
        backgroundColor: "#000",
        backgroundImage: "radial-gradient(circle at 78% 22%, rgba(255,191,0,0.16), transparent 55%), radial-gradient(circle at 12% 88%, rgba(255,191,0,0.08), transparent 60%)",
        fontFamily: "JetBrains Mono",
        color: "#e5e5e5",
      },
      children: [
        { type: "div", props: { style: { fontSize: 22, color: gold, letterSpacing: 6 }, children: "AETHERION · BRC-20 · BITCOIN L1" } },
        {
          type: "div",
          props: {
            style: { display: "flex", alignItems: "baseline", gap: 24, marginTop: 40 },
            children: [
              { type: "div", props: { style: { fontSize: 168, fontWeight: 700, color: gold, lineHeight: 1, letterSpacing: -4 }, children: live.tick } },
              { type: "div", props: { style: { fontSize: 28, color: "#888", letterSpacing: 3 }, children: "AETHERION EXCALIBUR" } },
            ],
          },
        },
        {
          type: "div",
          props: {
            style: { display: "flex", flexDirection: "column", marginTop: 44 },
            children: [
              { type: "div", props: { style: { fontSize: 16, color: "#888", letterSpacing: 3 }, children: "INSCRIPTION" } },
              { type: "div", props: { style: { fontSize: 26, color: gold, marginTop: 8 }, children: shortId(AETX_INSCRIPTION_ID) } },
            ],
          },
        },
        {
          type: "div",
          props: {
            style: { display: "flex", flexDirection: "column", marginTop: 36 },
            children: [
              {
                type: "div",
                props: {
                  style: { display: "flex", justifyContent: "space-between", alignItems: "baseline" },
                  children: [
                    { type: "div", props: { style: { fontSize: 18, color: "#888", letterSpacing: 3 }, children: "MINTED" } },
                    { type: "div", props: { style: { fontSize: 26, color: gold, fontWeight: 700 }, children: `${fmt(live.minted)} / ${fmt(live.max)}   ${pctLabel}` } },
                  ],
                },
              },
              {
                type: "div",
                props: {
                  style: { marginTop: 14, width: "1040px", height: "18px", backgroundColor: "rgba(255,191,0,0.12)", border: `1px solid ${gold}`, display: "flex" },
                  children: [
                    { type: "div", props: { style: { width: `${barW}px`, height: "16px", backgroundColor: gold } } },
                  ],
                },
              },
            ],
          },
        },
        {
          type: "div",
          props: {
            style: { marginTop: "auto", display: "flex", justifyContent: "space-between", fontSize: 16, color: "#888", letterSpacing: 3 },
            children: [
              { type: "div", props: { children: live.block ? `GENESIS BLOCK ${live.block.toLocaleString()}` : "AETHERION-ORACLE.COM" } },
              { type: "div", props: { children: live.txCount ? `${live.txCount.toLocaleString()} INSCRIPTIONS` : "MAX 21,000,000 · LIM 1,000" } },
            ],
          },
        },
      ],
    },
  };
}

function svgFallback(live: Live): string {
  const gold = "#FFBF00";
  const pctLabel = `${live.pct.toFixed(2)}%`;
  const barW = Math.max(2, Math.round((1040 * live.pct) / 100));
  const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="bg1" cx="78%" cy="22%" r="55%"><stop offset="0%" stop-color="${gold}" stop-opacity="0.16"/><stop offset="100%" stop-color="${gold}" stop-opacity="0"/></radialGradient>
    <radialGradient id="bg2" cx="12%" cy="88%" r="60%"><stop offset="0%" stop-color="${gold}" stop-opacity="0.08"/><stop offset="100%" stop-color="${gold}" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1200" height="630" fill="#000"/>
  <rect width="1200" height="630" fill="url(#bg1)"/>
  <rect width="1200" height="630" fill="url(#bg2)"/>
  <text x="80" y="110" font-family="monospace" font-size="22" fill="${gold}" letter-spacing="6">AETHERION · BRC-20 · BITCOIN L1</text>
  <text x="80" y="290" font-family="monospace" font-size="160" font-weight="700" fill="${gold}">${esc(live.tick)}</text>
  <text x="80" y="342" font-family="monospace" font-size="22" fill="#888" letter-spacing="3">AETHERION EXCALIBUR</text>
  <text x="80" y="392" font-family="monospace" font-size="16" fill="#888" letter-spacing="3">INSCRIPTION</text>
  <text x="80" y="426" font-family="monospace" font-size="24" fill="${gold}">${esc(shortId(AETX_INSCRIPTION_ID))}</text>
  <text x="80" y="482" font-family="monospace" font-size="18" fill="#888" letter-spacing="3">MINTED</text>
  <text x="1120" y="482" text-anchor="end" font-family="monospace" font-size="24" font-weight="700" fill="${gold}">${fmt(live.minted)} / ${fmt(live.max)}  ${pctLabel}</text>
  <rect x="80" y="498" width="1040" height="18" fill="rgba(255,191,0,0.12)" stroke="${gold}"/>
  <rect x="81" y="499" width="${barW}" height="16" fill="${gold}"/>
  <text x="80" y="580" font-family="monospace" font-size="16" fill="#888" letter-spacing="3">${live.block ? `GENESIS BLOCK ${live.block.toLocaleString()}` : "AETHERION-ORACLE.COM"}</text>
  <text x="1120" y="580" text-anchor="end" font-family="monospace" font-size="16" fill="#888" letter-spacing="3">${live.txCount ? `${live.txCount.toLocaleString()} INSCRIPTIONS` : "MAX 21,000,000 · LIM 1,000"}</text>
</svg>`;
}

async function renderPng(live: Live): Promise<Uint8Array> {
  await ensureWasm();
  const fonts = await getFonts();
  const svg = await satori(template(live) as unknown as Parameters<typeof satori>[0], {
    width: 1200,
    height: 630,
    fonts: [
      { name: "JetBrains Mono", data: fonts.regular, weight: 400, style: "normal" },
      { name: "JetBrains Mono", data: fonts.bold, weight: 700, style: "normal" },
    ],
  });
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } });
  return resvg.render().asPng();
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const wantSvg = url.searchParams.get("format") === "svg";
    const live = await fetchLive();

    if (wantSvg) {
      return new Response(svgFallback(live), {
        status: 200,
        headers: {
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Cache-Control": "public, max-age=300, s-maxage=900",
        },
      });
    }

    try {
      const png = await renderPng(live);
      return new Response(png, {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Content-Length": String(png.byteLength),
          "Cache-Control": "public, max-age=600, s-maxage=1800",
        },
      });
    } catch (err) {
      console.error("og-aetx PNG render failed, serving SVG:", err);
      return new Response(svgFallback(live), {
        status: 200,
        headers: {
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Cache-Control": "public, max-age=60",
          "X-OG-Fallback": "svg",
        },
      });
    }
  } catch (err) {
    console.error("og-aetx error:", err);
    return new Response("error", { status: 500 });
  }
});
