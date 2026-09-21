import { useEffect, useMemo, useState } from "react";
import { PageHead } from "@/components/PageHead";
import UruuLayout, { UruuCard } from "@/components/uruu/UruuLayout";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_STORAGE_KEY } from "@/lib/uruu/rpc";
import { demoValidators, rotationSlot, type ValidatorRow } from "@/lib/uruu/validators";

const SLOTS = 47;

function RotationWheel({ active }: { active: number }) {
  const r = 100;
  return (
    <svg viewBox="-120 -120 240 240" className="mx-auto w-full max-w-[280px]" role="img" aria-label="Proposer rotation">
      <circle cx="0" cy="0" r={r} fill="none" stroke="hsl(var(--border))" />
      {Array.from({ length: SLOTS }, (_, i) => {
        const angle = (i / SLOTS) * Math.PI * 2 - Math.PI / 2;
        const on = i === active;
        return (
          <circle
            key={i}
            cx={Math.cos(angle) * r}
            cy={Math.sin(angle) * r}
            r={on ? 6 : 3}
            fill={on ? "hsl(var(--primary))" : "hsl(var(--accent))"}
            opacity={on ? 1 : 0.5}
          />
        );
      })}
      <text x="0" y="6" textAnchor="middle" fill="hsl(var(--primary))" fontSize="16">{active}</text>
    </svg>
  );
}

export default function UruuValidators() {
  const [demo, setDemo] = useState(() => localStorage.getItem(DEMO_STORAGE_KEY) !== "false");
  const [rows, setRows] = useState<ValidatorRow[]>(() => demoValidators());
  const [query, setQuery] = useState("");
  const [height, setHeight] = useState(4_210_000);

  useEffect(() => {
    localStorage.setItem(DEMO_STORAGE_KEY, String(demo));
    if (demo) {
      setRows(demoValidators());
      return;
    }
    supabase
      .from("validator_cache")
      .select("address,bond,last_seen")
      .order("bond", { ascending: false })
      .then(({ data }) => {
        setRows(
          (data ?? []).map((v, i) => ({
            index: i,
            address: v.address,
            bond: Number(v.bond),
            status: "active" as const,
            uptime: 100,
            proposed: 0,
            lastHeight: 0,
          })),
        );
      });
  }, [demo]);

  useEffect(() => {
    const t = window.setInterval(() => setHeight((h) => h + 1), 2000);
    return () => window.clearInterval(t);
  }, []);

  const filtered = useMemo(
    () => rows.filter((r) => r.address.toLowerCase().includes(query.trim().toLowerCase())),
    [rows, query],
  );
  const maxBond = Math.max(1, ...rows.map((r) => r.bond));
  const sortedBonds = [...rows].sort((a, b) => b.bond - a.bond);

  return (
    <UruuLayout>
      <PageHead
        title="URUU Validator Dashboard — Bonds, Uptime & Proposer Rotation"
        description="Read-only URUU-1 validator set: bonds in URU, uptime, blocks proposed, and a live 47-slot proposer rotation wheel with a deterministic demo mode."
        path="/uruu/validators"
      />

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
        <UruuCard className="flex flex-wrap items-center justify-between gap-4 p-4">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="filter by address"
            aria-label="Filter validators by address"
            className="max-w-xs font-mono text-xs"
          />
          <label className="flex items-center gap-3 text-xs tracking-[0.2em] text-muted-foreground">
            DEMO MODE
            <Switch checked={demo} onCheckedChange={setDemo} aria-label="Demo mode" />
          </label>
        </UruuCard>

        <div className="grid gap-6 lg:grid-cols-2">
          <UruuCard className="p-6">
            <h2 className="text-xs text-primary tracking-[0.35em] mb-4">PROPOSER ROTATION</h2>
            <RotationWheel active={rotationSlot(height, SLOTS)} />
          </UruuCard>

          <UruuCard className="p-6">
            <h2 className="text-xs text-primary tracking-[0.35em] mb-4">BONDS (URU)</h2>
            <div className="space-y-1">
              {sortedBonds.slice(0, 20).map((v) => (
                <div key={v.address} className="flex items-center gap-2 text-[10px]">
                  <span className="w-6 text-right text-muted-foreground tabular-nums">{v.index}</span>
                  <span className="h-2 bg-primary" style={{ width: `${(v.bond / maxBond) * 70}%` }} />
                  <span className="tabular-nums text-muted-foreground">{v.bond.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </UruuCard>
        </div>

        <UruuCard className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-3 py-3 text-right tracking-[0.2em]">#</th>
                <th className="px-3 py-3 text-left tracking-[0.2em]">ADDRESS</th>
                <th className="px-3 py-3 text-right tracking-[0.2em]">BOND</th>
                <th className="px-3 py-3 text-left tracking-[0.2em]">STATUS</th>
                <th className="px-3 py-3 text-right tracking-[0.2em]">UPTIME 24H</th>
                <th className="px-3 py-3 text-right tracking-[0.2em]">PROPOSED</th>
                <th className="px-3 py-3 text-right tracking-[0.2em]">LAST</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((v) => (
                <tr key={v.address}>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{v.index}</td>
                  <td className="px-3 py-2">{v.address.slice(0, 12)}…{v.address.slice(-6)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{v.bond.toLocaleString()}</td>
                  <td className={`px-3 py-2 ${v.status === "active" ? "text-primary" : "text-muted-foreground"}`}>
                    {v.status}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{v.uptime.toFixed(2)}%</td>
                  <td className="px-3 py-2 text-right tabular-nums">{v.proposed}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{v.lastHeight.toLocaleString()}</td>
                </tr>
              ))}
              {!filtered.length && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No validators.</td></tr>
              )}
            </tbody>
          </table>
        </UruuCard>
      </div>
    </UruuLayout>
  );
}
