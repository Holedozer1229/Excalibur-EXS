import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle2, XCircle, Loader2 } from "lucide-react";

type Health = "ok" | "down" | "checking";

interface ServiceState {
  label: string;
  status: Health;
  detail?: string;
  latencyMs?: number;
}

const BUILD_TIME = typeof __BUILD_TIME__ !== "undefined" ? __BUILD_TIME__ : new Date().toISOString();
const BUILD_MODE = typeof __BUILD_MODE__ !== "undefined" ? __BUILD_MODE__ : "unknown";
const VERSION = BUILD_TIME.slice(0, 10).replace(/-/g, ".") + "-" + BUILD_TIME.slice(11, 16).replace(":", "");

function StatusDot({ status }: { status: Health }) {
  if (status === "checking") return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  if (status === "ok") return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  return <XCircle className="h-4 w-4 text-destructive" />;
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function Status() {
  const [services, setServices] = useState<ServiceState[]>([
    { label: "Frontend (this app)", status: "checking" },
    { label: "Database", status: "checking" },
    { label: "Edge Functions", status: "checking" },
    { label: "Auth", status: "checking" },
  ]);
  const [checkedAt, setCheckedAt] = useState<string>(new Date().toISOString());
  const [running, setRunning] = useState(false);

  async function runChecks() {
    setRunning(true);
    const next: ServiceState[] = [];

    // Frontend
    next.push({ label: "Frontend (this app)", status: "ok", detail: `Mode: ${BUILD_MODE}` });

    // Database
    const t1 = performance.now();
    try {
      const { error } = await supabase.from("profiles").select("id", { count: "exact", head: true }).limit(1);
      const lat = Math.round(performance.now() - t1);
      if (error && error.code && !["PGRST116", "42501"].includes(error.code)) {
        next.push({ label: "Database", status: "down", detail: error.message, latencyMs: lat });
      } else {
        next.push({ label: "Database", status: "ok", latencyMs: lat });
      }
    } catch (e) {
      next.push({ label: "Database", status: "down", detail: (e as Error).message });
    }

    // Auth
    const t2 = performance.now();
    try {
      await supabase.auth.getSession();
      next.push({ label: "Auth", status: "ok", latencyMs: Math.round(performance.now() - t2) });
    } catch (e) {
      next.push({ label: "Auth", status: "down", detail: (e as Error).message });
    }

    // Edge functions: ping a lightweight public function with OPTIONS
    const t3 = performance.now();
    try {
      const url = `https://zdnulzxymjdtidlqnjoe.supabase.co/functions/v1/user-state`;
      const res = await fetch(url, { method: "OPTIONS" });
      const lat = Math.round(performance.now() - t3);
      // 2xx or 204 from CORS preflight = reachable
      if (res.ok || res.status === 204 || res.status === 401) {
        next.push({ label: "Edge Functions", status: "ok", latencyMs: lat });
      } else {
        next.push({ label: "Edge Functions", status: "down", detail: `HTTP ${res.status}`, latencyMs: lat });
      }
    } catch (e) {
      next.push({ label: "Edge Functions", status: "down", detail: (e as Error).message });
    }

    setServices(next);
    setCheckedAt(new Date().toISOString());
    setRunning(false);
  }

  useEffect(() => {
    runChecks();
    const id = setInterval(runChecks, 60_000);
    return () => clearInterval(id);
  }, []);

  const allOk = services.every((s) => s.status === "ok");
  const anyDown = services.some((s) => s.status === "down");

  useEffect(() => {
    document.title = `Status — ${allOk ? "All systems operational" : anyDown ? "Service disruption" : "Checking…"}`;
  }, [allOk, anyDown]);

  return (
    <main className="min-h-screen bg-background text-foreground py-16 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="space-y-2">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Home</Link>
          <h1 className="text-3xl font-semibold tracking-tight">System Status</h1>
          <p className="text-muted-foreground">
            {allOk ? "All systems operational." : anyDown ? "One or more services are unavailable." : "Running health checks…"}
          </p>
        </header>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Deployment</CardTitle>
            <Badge variant={allOk ? "default" : "secondary"}>{allOk ? "Healthy" : anyDown ? "Degraded" : "Checking"}</Badge>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Version</div>
              <div className="font-mono">{VERSION}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Build mode</div>
              <div className="font-mono">{BUILD_MODE}</div>
            </div>
            <div className="col-span-2">
              <div className="text-muted-foreground">Last published / built</div>
              <div className="font-mono">{new Date(BUILD_TIME).toLocaleString()} <span className="text-muted-foreground">({formatRelative(BUILD_TIME)})</span></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Services</CardTitle>
            <Button variant="ghost" size="sm" onClick={runChecks} disabled={running}>
              <RefreshCw className={`h-4 w-4 mr-2 ${running ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {services.map((s) => (
              <div key={s.label} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <StatusDot status={s.status} />
                  <div>
                    <div className="text-sm">{s.label}</div>
                    {s.detail && <div className="text-xs text-muted-foreground">{s.detail}</div>}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground font-mono">
                  {s.status === "checking" ? "…" : s.latencyMs !== undefined ? `${s.latencyMs}ms` : s.status === "ok" ? "ok" : "down"}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center">
          Last checked {formatRelative(checkedAt)} • Auto-refreshes every 60s
        </p>
      </div>
    </main>
  );
}
