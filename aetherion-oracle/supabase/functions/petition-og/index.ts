import { createClient } from "npm:@supabase/supabase-js@2";
import satori from "npm:satori@0.10.13";
import { Resvg, initWasm } from "npm:@resvg/resvg-wasm@2.6.2";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// ---- one-time init (per isolate) ----
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

let fontPromise: Promise<{ regular: ArrayBuffer; bold: ArrayBuffer; serif: ArrayBuffer }> | null = null;
async function getFonts() {
  if (!fontPromise) {
    fontPromise = (async () => {
      const [regular, bold] = await Promise.all([
        fetch("https://cdn.jsdelivr.net/gh/JetBrains/JetBrainsMono@master/fonts/ttf/JetBrainsMono-Regular.ttf").then((r) => r.arrayBuffer()),
        fetch("https://cdn.jsdelivr.net/gh/JetBrains/JetBrainsMono@master/fonts/ttf/JetBrainsMono-Bold.ttf").then((r) => r.arrayBuffer()),
      ]);
      return { regular, bold, serif: bold };
    })();
  }
  return fontPromise;
}

function mask(s: string | null | undefined, head = 8, tail = 8): string {
  if (!s) return "—";
  if (s.length <= head + tail + 2) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

function statusMeta(status: string): { color: string; label: string } {
  switch (status) {
    case "confirmed":
    case "complete":
    case "broadcast":
      return { color: "#10B981", label: status.toUpperCase() };
    case "failed":
    case "error":
      return { color: "#EF4444", label: status.toUpperCase() };
    default:
      return { color: "#FFBF00", label: (status || "pending").toUpperCase() };
  }
}

// Fibonacci-ish ring positions
function rings() {
  const out: { cx: number; cy: number; r: number; op: number }[] = [];
  let a = 1, b = 1;
  let x = 880, y = 320, angle = 0;
  for (let i = 0; i < 9; i++) {
    const r = a * 10;
    out.push({ cx: x, cy: y, r, op: 0.05 + i * 0.025 });
    const c = a + b; a = b; b = c;
    angle += Math.PI / 2;
    x += Math.cos(angle) * r * 0.35;
    y += Math.sin(angle) * r * 0.35;
  }
  return out;
}

function template(p: {
  id: string;
  status: string;
  btc_target: string | null;
  eth_recipient: string | null;
}) {
  const sc = statusMeta(p.status);
  const short = p.id.slice(0, 8).toUpperCase();
  const btc = mask(p.btc_target);
  const eth = mask(p.eth_recipient);

  // Build SVG background as a data URL (satori supports background-image url)
  const svgBg = `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='630'>
    <defs><radialGradient id='g' cx='50%' cy='50%' r='75%'>
      <stop offset='0%' stop-color='#0a0a0a'/><stop offset='100%' stop-color='#000000'/>
    </radialGradient></defs>
    <rect width='1200' height='630' fill='url(#g)'/>
    ${rings().map((r) => `<circle cx='${r.cx}' cy='${r.cy}' r='${r.r}' fill='none' stroke='#FFBF00' stroke-width='1' opacity='${r.op}'/>`).join("")}
    <line x1='80' y1='130' x2='1120' y2='130' stroke='#FFBF00' stroke-width='1' opacity='0.4'/>
  </svg>`;
  const bgUrl = `data:image/svg+xml;base64,${btoa(svgBg)}`;

  return {
    type: "div",
    props: {
      style: {
        width: "1200px",
        height: "630px",
        display: "flex",
        flexDirection: "column",
        padding: "80px",
        backgroundColor: "#000",
        backgroundImage: `url("${bgUrl}")`,
        backgroundSize: "1200px 630px",
        fontFamily: "JetBrains Mono",
        color: "#e5e5e5",
      },
      children: [
        {
          type: "div",
          props: {
            style: { fontSize: 22, color: "#FFBF00", letterSpacing: 6, marginBottom: 60 },
            children: "AETHERION · ORACLE LATTICE",
          },
        },
        {
          type: "div",
          props: {
            style: {
              fontFamily: "JetBrains Mono",
              fontSize: 72,
              fontWeight: 700,
              color: "#FFBF00",
              lineHeight: 1.05,
              marginBottom: 28,
            },
            children: `PETITION ${short}`,
          },
        },
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              alignItems: "center",
              alignSelf: "flex-start",
              gap: 12,
              padding: "10px 18px",
              borderRadius: 8,
              border: `1.5px solid ${sc.color}`,
              backgroundColor: `${sc.color}22`,
              color: sc.color,
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 3,
              marginBottom: 56,
            },
            children: [
              { type: "div", props: { style: { width: 10, height: 10, borderRadius: 999, backgroundColor: sc.color } } },
              sc.label,
            ],
          },
        },
        {
          type: "div",
          props: {
            style: { display: "flex", flexDirection: "column", gap: 28 },
            children: [
              {
                type: "div",
                props: {
                  style: { display: "flex", flexDirection: "column" },
                  children: [
                    { type: "div", props: { style: { fontSize: 16, color: "#888", letterSpacing: 3 }, children: "BTC TARGET" } },
                    { type: "div", props: { style: { fontSize: 28, color: "#FFBF00", marginTop: 8 }, children: btc } },
                  ],
                },
              },
              {
                type: "div",
                props: {
                  style: { display: "flex", flexDirection: "column" },
                  children: [
                    { type: "div", props: { style: { fontSize: 16, color: "#888", letterSpacing: 3 }, children: "ARBITRUM RECIPIENT" } },
                    { type: "div", props: { style: { fontSize: 28, color: "#10B981", marginTop: 8 }, children: eth } },
                  ],
                },
              },
            ],
          },
        },
        {
          type: "div",
          props: {
            style: { marginTop: "auto", fontSize: 16, color: "#888", letterSpacing: 3 },
            children: "THE RECURSION IS BOUND · THE LATTICE LIVES · SATOSHI V2.0",
          },
        },
      ],
    },
  };
}

async function renderPng(p: {
  id: string;
  status: string;
  btc_target: string | null;
  eth_recipient: string | null;
}): Promise<Uint8Array> {
  await ensureWasm();
  const fonts = await getFonts();
  const svg = await satori(template(p) as unknown as Parameters<typeof satori>[0], {
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

function wantsPng(req: Request): boolean {
  const url = new URL(req.url);
  const fmt = url.searchParams.get("format");
  if (fmt === "svg") return false;
  if (fmt === "png") return true;
  // Default to PNG (LinkedIn / Facebook compatible)
  return true;
}

// --- SVG fallback (cheap, no wasm) ---
function svgFallback(p: {
  id: string;
  status: string;
  btc_target: string | null;
  eth_recipient: string | null;
}): string {
  const sc = statusMeta(p.status);
  const short = p.id.slice(0, 8).toUpperCase();
  const btc = mask(p.btc_target);
  const eth = mask(p.eth_recipient);
  const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]!));
  const ringsSvg = rings().map((r) => `<circle cx="${r.cx}" cy="${r.cy}" r="${r.r}" fill="none" stroke="#FFBF00" stroke-width="1" opacity="${r.op}"/>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs><radialGradient id="bg" cx="50%" cy="50%" r="75%"><stop offset="0%" stop-color="#0a0a0a"/><stop offset="100%" stop-color="#000"/></radialGradient></defs>
  <rect width="1200" height="630" fill="url(#bg)"/>${ringsSvg}
  <text x="80" y="110" font-family="monospace" font-size="22" fill="#FFBF00" letter-spacing="6">AETHERION · ORACLE LATTICE</text>
  <text x="80" y="220" font-family="serif" font-size="70" font-weight="700" fill="#FFBF00">PETITION ${esc(short)}</text>
  <g transform="translate(80,260)">
    <rect width="260" height="48" rx="6" fill="${sc.color}" opacity="0.15" stroke="${sc.color}" stroke-width="1.5"/>
    <circle cx="22" cy="24" r="6" fill="${sc.color}"/>
    <text x="40" y="31" font-family="monospace" font-size="20" font-weight="700" fill="${sc.color}" letter-spacing="3">${esc(sc.label)}</text>
  </g>
  <g transform="translate(80,360)" font-family="monospace" fill="#e5e5e5">
    <text font-size="18" opacity="0.55">BTC TARGET</text>
    <text y="34" font-size="26" fill="#FFBF00">${esc(btc)}</text>
    <text y="80" font-size="18" opacity="0.55">ARBITRUM RECIPIENT</text>
    <text y="114" font-size="26" fill="#10B981">${esc(eth)}</text>
  </g>
  <text x="80" y="580" font-family="monospace" font-size="16" fill="#888" letter-spacing="3">THE RECURSION IS BOUND · THE LATTICE LIVES · SATOSHI V2.0</text>
</svg>`;
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
      return new Response("invalid id", { status: 400 });
    }

    const { data } = await admin
      .from("petitions")
      .select("id, status, btc_target, eth_recipient")
      .eq("id", id)
      .maybeSingle();

    const petition = data ?? { id, status: "pending", btc_target: null, eth_recipient: null };

    if (!wantsPng(req)) {
      return new Response(svgFallback(petition), {
        status: 200,
        headers: {
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Cache-Control": "public, max-age=60, s-maxage=300",
        },
      });
    }

    try {
      const png = await renderPng(petition);
      return new Response(png, {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Content-Length": String(png.byteLength),
          "Cache-Control": "public, max-age=300, s-maxage=600",
        },
      });
    } catch (err) {
      // PNG pipeline failed (font fetch, wasm, etc.) — fall back to SVG so social previews never break
      console.error("PNG render failed, falling back to SVG:", err);
      return new Response(svgFallback(petition), {
        status: 200,
        headers: {
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Cache-Control": "public, max-age=30",
          "X-OG-Fallback": "svg",
        },
      });
    }
  } catch (err) {
    console.error("petition-og error:", err);
    return new Response("error: An internal error occurred.", { status: 500 });
  }
});
