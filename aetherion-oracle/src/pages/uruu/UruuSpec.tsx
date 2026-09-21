import { useState } from "react";
import { PageHead } from "@/components/PageHead";
import UruuLayout, { UruuCard } from "@/components/uruu/UruuLayout";
import { URUU_CHAIN_SPEC } from "@/lib/uruu/spec";
import { bin6, uruuStepTrace, PHI } from "@/lib/uruu/step";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function Bits({ value }: { value: number }) {
  return (
    <span className="inline-flex gap-[2px] align-middle">
      {bin6(value).split("").map((b, i) => (
        <span
          key={i}
          className={`h-3 w-3 rounded-[1px] border border-border ${b === "1" ? "bg-primary" : "bg-transparent"}`}
        />
      ))}
    </span>
  );
}

export default function UruuSpec() {
  const [a, setA] = useState(23);
  const [b, setB] = useState(41);
  const [trace, setTrace] = useState(() => uruuStepTrace(23, 41));

  const clamp = (v: string) => Math.max(0, Math.min(63, Number(v) || 0));

  return (
    <UruuLayout>
      <PageHead
        title="URUU — EVM Layer 1 Chain Specification & Step Primitive"
        description="URUU-1 is an EVM Layer 1 with a phase-biased consensus primitive: chain ID 21842, 2s blocks, PoS round-robin proposers, and the 6-bit URUU step precompile."
        path="/uruu"
      />

      <section className="uruu-hero-glow border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h1 className="text-2xl sm:text-4xl text-primary tracking-[0.2em] leading-tight">
            URUU — an EVM Layer 1 with a phase-biased consensus primitive
          </h1>
          <p className="mt-6 text-sm text-muted-foreground tracking-[0.15em]">
            CHAIN 0x5552 · URU · 2s BLOCKS · PROOF-OF-STAKE · EVM CANCUN
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-10 px-4 py-12">
        <UruuCard className="p-6">
          <h2 className="text-xs text-primary tracking-[0.35em] mb-6">SPECIFICATION</h2>
          <dl className="divide-y divide-border">
            {URUU_CHAIN_SPEC.map((row) => (
              <div key={row.label} className="flex justify-between gap-6 py-2 text-xs sm:text-sm">
                <dt className="text-muted-foreground tracking-[0.15em]">{row.label}</dt>
                <dd className="text-right">{row.value}</dd>
              </div>
            ))}
          </dl>
        </UruuCard>

        <UruuCard className="p-6">
          <h2 className="text-xs text-primary tracking-[0.35em] mb-6">THE URUU STEP</h2>
          <pre className="overflow-x-auto text-xs sm:text-sm leading-7 text-foreground">
{`uruu_step(a, b) = (b XOR rot3(a)) XOR floor(PHI × (b AND a)) mod 64
rot3(x)         = ((x << 3) | (x >> 3)) & 0x3F
PHI             = ${PHI}`}
          </pre>
        </UruuCard>

        <UruuCard className="p-6">
          <h2 className="text-xs text-primary tracking-[0.35em] mb-6">LIVE DEMO</h2>
          <div className="flex flex-wrap items-end gap-4">
            <label className="text-xs text-muted-foreground tracking-[0.2em]">
              A (0–63)
              <Input
                type="number"
                min={0}
                max={63}
                value={a}
                onChange={(e) => setA(clamp(e.target.value))}
                className="mt-2 w-28 text-right font-mono"
              />
            </label>
            <label className="text-xs text-muted-foreground tracking-[0.2em]">
              B (0–63)
              <Input
                type="number"
                min={0}
                max={63}
                value={b}
                onChange={(e) => setB(clamp(e.target.value))}
                className="mt-2 w-28 text-right font-mono"
              />
            </label>
            <Button onClick={() => setTrace(uruuStepTrace(a, b))} className="tracking-[0.2em]">
              COMPUTE
            </Button>
          </div>

          <table className="mt-8 w-full text-xs sm:text-sm">
            <tbody className="divide-y divide-border">
              {[
                ["rot3(a)", trace.rot],
                ["xor_part", trace.xorPart],
                ["and_part", trace.andPart],
                ["phi_term", trace.phiTerm],
                ["result", trace.result],
              ].map(([label, value]) => (
                <tr key={label as string}>
                  <td className="py-3 text-muted-foreground tracking-[0.15em]">{label}</td>
                  <td className="py-3 text-right tabular-nums">{value as number}</td>
                  <td className="py-3 pl-4 text-right"><Bits value={value as number} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </UruuCard>
      </div>
    </UruuLayout>
  );
}
