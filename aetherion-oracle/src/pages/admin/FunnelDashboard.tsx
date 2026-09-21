// /admin/funnel — admin-only first-party funnel dashboard.
// Reads funnel_summary RPC (self-gated to admins).

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, RefreshCw } from "lucide-react";

interface Summary {
  window_days: number;
  since: string;
  by_event: Record<string, number>;
  visits_by_source: Record<string, number>;
  funnel: { visits: number; casts: number; waitlist: number; signups: number; paid: number };
  waitlist_total: number;
}

const WINDOWS = [1, 7, 30] as const;

const FunnelDashboard = () => {
  const [windowDays, setWindowDays] = useState<(typeof WINDOWS)[number]>(7);
  const [data, setData] = useState<Summary | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async (w: number) => {
    setLoading(true);
    setErr(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Admin login required.");
      const { data: res, error } = await supabase.rpc("funnel_summary", { _window_days: w });
      if (error) throw error;
      setData(res as unknown as Summary);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(windowDays); }, [windowDays]);

  const rate = (num: number, den: number) =>
    den > 0 ? `${((num / den) * 100).toFixed(1)}%` : "—";

  const f = data?.funnel;

  return (
    <div className="min-h-screen bg-background px-5 py-10 text-foreground">
      <Helmet>
        <title>Funnel · Admin · Aetherion</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Button asChild variant="ghost" size="sm" className="mb-2">
              <Link to="/admin/audit"><ArrowLeft className="mr-1 h-4 w-4" /> Admin</Link>
            </Button>
            <h1 className="font-saga text-3xl">Funnel</h1>
            <p className="text-sm text-muted-foreground">First-party traffic + conversion telemetry.</p>
          </div>
          <div className="flex items-center gap-2">
            {WINDOWS.map((w) => (
              <Button
                key={w}
                size="sm"
                variant={w === windowDays ? "default" : "outline"}
                onClick={() => setWindowDays(w)}
              >
                {w}d
              </Button>
            ))}
            <Button size="sm" variant="ghost" onClick={() => load(windowDays)} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {err && (
          <Card className="border-destructive/40 bg-destructive/10">
            <CardContent className="p-4 text-sm text-destructive">{err}</CardContent>
          </Card>
        )}

        {loading && !data && (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading funnel…
          </div>
        )}

        {f && (
          <>
            <section className="grid gap-3 sm:grid-cols-5">
              {[
                { label: "Visits", value: f.visits },
                { label: "Casts", value: f.casts },
                { label: "Waitlist", value: f.waitlist },
                { label: "Signups", value: f.signups },
                { label: "Paid", value: f.paid },
              ].map(({ label, value }) => (
                <Card key={label}>
                  <CardContent className="p-4">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
                    <p className="mt-1 font-mono text-2xl">{value.toLocaleString()}</p>
                  </CardContent>
                </Card>
              ))}
            </section>

            <section className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                { label: "Visit → Cast", num: f.casts, den: f.visits },
                { label: "Cast → Signup", num: f.signups, den: f.casts },
                { label: "Signup → Paid", num: f.paid, den: f.signups },
              ].map((r) => (
                <Card key={r.label} className="border-violet-500/30 bg-violet-500/5">
                  <CardContent className="p-4">
                    <p className="text-[10px] uppercase tracking-wider text-violet-300">{r.label}</p>
                    <p className="mt-1 font-mono text-2xl text-violet-100">{rate(r.num, r.den)}</p>
                  </CardContent>
                </Card>
              ))}
            </section>

            <section className="mt-6 grid gap-4 md:grid-cols-2">
              <Card>
                <CardContent className="p-5">
                  <h2 className="mb-3 font-saga text-lg">Visits by source</h2>
                  <SourceTable rows={data!.visits_by_source} />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <h2 className="mb-3 font-saga text-lg">Events ({data!.window_days}d)</h2>
                  <SourceTable rows={data!.by_event} />
                  <p className="mt-3 text-xs text-muted-foreground">
                    Waitlist total in window: <span className="font-mono">{data!.waitlist_total}</span>
                  </p>
                </CardContent>
              </Card>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

const SourceTable = ({ rows }: { rows: Record<string, number> }) => {
  const entries = Object.entries(rows).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No data yet.</p>;
  }
  return (
    <table className="w-full text-sm">
      <tbody>
        {entries.map(([k, v]) => (
          <tr key={k} className="border-b border-border/30 last:border-0">
            <td className="py-1.5 pr-2 text-muted-foreground">{k}</td>
            <td className="py-1.5 text-right font-mono">{v.toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default FunnelDashboard;
