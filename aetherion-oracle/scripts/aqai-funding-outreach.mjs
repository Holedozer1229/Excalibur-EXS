#!/usr/bin/env node
/**
 * AQAI funding outreach — dry-run by default.
 *
 * Writes:
 *   public/treasure/aqai-funding-outreach.json
 *   public/treasure/aqai-outreach-outbox/*.eml  (when AQAI_OUTREACH_LIVE=1)
 *
 * Does NOT auto-file grants (portals only).
 * Placeholder "Example *" CRM rows are never prepared for send.
 *
 * Optional email API (if configured):
 *   RESEND_API_KEY + SMTP_FROM (as from address)
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CRM = join(ROOT, "hardware/aetherion-qai/funding/investor-crm.csv");
const OUT_DIR = join(ROOT, "public/treasure");
const OUT = join(OUT_DIR, "aqai-funding-outreach.json");
const OUTBOX = join(OUT_DIR, "aqai-outreach-outbox");
const LIVE = process.env.AQAI_OUTREACH_LIVE === "1";
const DECK_URL =
  process.env.AQAI_DECK_URL ??
  "https://www.excaliburcrypto.com/chipset";
const TOTAL_ASK = process.env.AQAI_ASK_TOTAL ?? "$1.5M";
const FROM = process.env.SMTP_FROM || process.env.AQAI_FROM || "";

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const cols = line.split(",");
    const row = {};
    headers.forEach((h, i) => {
      row[h.trim()] = (cols[i] ?? "").trim();
    });
    return row;
  });
}

function isPlaceholder(row) {
  return /^Example\b/i.test(row.name || "") || !row.email || !row.email.includes("@");
}

function buildAngelBody(row) {
  return `Hi ${row.name},

We're building Verified Cognition Silicon — accelerators that prove what they ran. Caduceus Soft Silicon and the AQAI ISA are live at ${DECK_URL} (design/simulation today; fabless MPW path next — we do not claim shipping die yet).

Ask: ${row.check_size || "$25–100k"} toward a ${TOTAL_ASK} pre-seed for FPGA + first MPW.

Lab: ${DECK_URL}
Pitch deck: ${DECK_URL.replace(/\/chipset$/, "")}/chipset/pitch-deck.html

If verifiable inference is on your thesis, happy to send the one-pager and book 20 minutes.

— AETHERION QAI`;
}

function buildFundBody(row) {
  return `${row.name},

Category: Verified Cognition Silicon. Moat is architectural unity (seal + twin-pipe + skin/EP + PoM), not FLOPs. Soft Silicon opcode map matches planned die.

Traction: live control plane + RTL package. Raise: ${TOTAL_ASK} SAFE → FPGA seal demo + shuttle.

Materials: ${DECK_URL}

— AETHERION QAI`;
}

function toEml({ from, to, subject, body }) {
  return [
    `From: ${from || "founder@example.com"}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=utf-8`,
    `Date: ${new Date().toUTCString()}`,
    ``,
    body,
    ``,
  ].join("\r\n");
}

async function maybeResend({ to, subject, body }) {
  const key = process.env.RESEND_API_KEY;
  if (!key || !FROM) {
    return { sent: false, channel: "none", reason: "RESEND_API_KEY/SMTP_FROM not set — wrote .eml only" };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: [to],
      subject,
      text: body,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    return { sent: false, channel: "resend", reason: `HTTP ${res.status}: ${t.slice(0, 200)}` };
  }
  return { sent: true, channel: "resend", reason: "ok" };
}

async function main() {
  if (!existsSync(CRM)) {
    console.error("Missing CRM:", CRM);
    process.exit(1);
  }
  const rows = parseCsv(readFileSync(CRM, "utf8"));
  const prepared = [];
  const grantQueue = [];

  if (LIVE) mkdirSync(OUTBOX, { recursive: true });

  for (const row of rows) {
    if (row.type === "grant") {
      grantQueue.push({
        name: row.name,
        status: row.status,
        note: "Apply via grant portal — not emailed as an application",
        priority: row.priority,
      });
      continue;
    }
    if (isPlaceholder(row)) {
      prepared.push({
        name: row.name,
        type: row.type,
        status: "skipped_placeholder",
        email: row.email || null,
        reason: "Replace Example rows with real contacts before live send",
      });
      continue;
    }
    const subject =
      row.type === "fund"
        ? "Fabless VCS — Caduceus Soft→Hard continuity"
        : "AETHERION QAI — seal-native AI silicon (Soft Silicon live)";
    const body = row.type === "fund" ? buildFundBody(row) : buildAngelBody(row);
    let sendResult = { sent: false, channel: "dry_run", reason: "dry_run" };

    if (LIVE) {
      const safe = row.name.replace(/[^\w.-]+/g, "_").slice(0, 40);
      const emlPath = join(OUTBOX, `${safe}.eml`);
      writeFileSync(emlPath, toEml({ from: FROM, to: row.email, subject, body }));
      sendResult = await maybeResend({ to: row.email, subject, body });
      if (!sendResult.sent) {
        sendResult = {
          ...sendResult,
          eml: emlPath,
          reason: `${sendResult.reason}; .eml written for manual send`,
        };
      } else {
        sendResult.eml = emlPath;
      }
    }

    prepared.push({
      name: row.name,
      type: row.type,
      segment: row.segment,
      email: row.email,
      check_size: row.check_size,
      subject,
      body,
      live: LIVE,
      ...sendResult,
    });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    mode: LIVE ? "live" : "dry_run",
    ask: TOTAL_ASK,
    deckUrl: DECK_URL,
    pitchDeckPublic: "/chipset/pitch-deck.html",
    capitalPath: "fabless_soft_silicon_grants_angels_mpw",
    verdict:
      "Best path: Soft Silicon revenue + NSF SBIR + angel/pre-seed SAFE → FPGA → MPW. Never own a fab.",
    outreach: prepared,
    grants: grantQueue,
    nextOperatorSteps: [
      "Replace Example rows in investor-crm.csv with real emails",
      "Print /chipset/pitch-deck.html to PDF",
      "Draft NSF SBIR pitch from hardware/aetherion-qai/funding/GRANTS.md",
      "Counsel on SAFE + entity + EAR",
      "AQAI_OUTREACH_LIVE=1 to write .eml outbox; optional RESEND_API_KEY to send",
    ],
    honesty: [
      "Not claiming fabricated AQAI die in production",
      "Placeholder CRM rows never sent",
      "Grants require human portal submission",
    ],
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(`Wrote ${OUT}`);
  console.log(`Mode: ${report.mode} · outreach: ${prepared.length} · grants: ${grantQueue.length}`);
  if (!LIVE) console.log("Dry-run only. AQAI_OUTREACH_LIVE=1 writes .eml outbox (+ optional Resend).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
