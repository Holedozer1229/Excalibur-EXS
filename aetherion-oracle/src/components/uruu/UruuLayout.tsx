import { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { URUU_PRECOMPILE_SEAL, URUU_SOURCE_REPO } from "@/lib/uruu/spec";

const NAV = [
  { to: "/uruu", label: "SPEC", end: true },
  { to: "/uruu/explorer", label: "EXPLORER", end: false },
  { to: "/uruu/validators", label: "VALIDATORS", end: false },
];

export function UruuCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`border border-border bg-card/60 rounded-sm ${className}`}>{children}</div>
  );
}

export default function UruuLayout({ children }: { children: ReactNode }) {
  return (
    <div className="uruu-scope min-h-screen flex flex-col">
      <header className="border-b border-border">
        <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-4 text-xs">
          <span className="text-primary tracking-[0.45em]">URUU‑1</span>
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `tracking-[0.25em] transition-colors ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border mt-16">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-xs text-muted-foreground sm:flex-row sm:justify-between">
          <NavLink to="/uruu" className="hover:text-primary tracking-[0.2em]">SPECIFICATION</NavLink>
          <a href={URUU_SOURCE_REPO} target="_blank" rel="noreferrer" className="hover:text-primary tracking-[0.2em]">
            SOURCE REPO
          </a>
          <a
            href={`https://etherscan.io/address/${URUU_PRECOMPILE_SEAL}`}
            target="_blank"
            rel="noreferrer"
            className="hover:text-primary"
          >
            PRECOMPILE {URUU_PRECOMPILE_SEAL.slice(0, 10)}…101
          </a>
        </div>
      </footer>
    </div>
  );
}
