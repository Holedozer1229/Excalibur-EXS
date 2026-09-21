import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fetchTierState, type ServerTierState } from "@/lib/tiers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { PageHead } from "@/components/PageHead";

interface SessionInfo {
  user_id: string;
  email: string | null;
  created_at: string | undefined;
}

const Debug = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [state, setState] = useState<ServerTierState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchedAt, setFetchedAt] = useState<string>("");

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data: s } = await supabase.auth.getSession();
    if (!s.session) {
      navigate("/auth");
      return;
    }
    setSession({
      user_id: s.session.user.id,
      email: s.session.user.email ?? null,
      created_at: s.session.user.created_at,
    });
    const t = await fetchTierState();
    if (!t) setError("Failed to load tier state from server.");
    setState(t);
    setFetchedAt(new Date().toISOString());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const monthlyPct = state ? Math.round((state.monthly_usage / Math.max(1, state.monthly_limit)) * 100) : 0;
  const dailyPct = state ? Math.round((state.daily_usage / Math.max(1, state.daily_limit)) * 100) : 0;

  const Row = ({ k, v, mono = true }: { k: string; v: React.ReactNode; mono?: boolean }) => (
    <TableRow>
      <TableCell className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground w-1/2">{k}</TableCell>
      <TableCell className={mono ? "font-mono text-xs" : "text-xs"}>{v}</TableCell>
    </TableRow>
  );

  return (
    <>
      <PageHead title="Debug | Aetherion" description="Internal debug view." path="/debug" noIndex />
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display uppercase tracking-widest">▌ Debug Console ▐</h1>
            <p className="text-xs text-muted-foreground font-mono mt-1">
              Raw tier &amp; quota diagnostics · {fetchedAt || "—"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/")}>← Home</Button>
            <Button size="sm" onClick={load} disabled={loading}>{loading ? "Loading…" : "Refresh"}</Button>
          </div>
        </header>

        {error && (
          <Card className="border-destructive">
            <CardContent className="p-4 text-sm text-destructive font-mono">{error}</CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-sm font-display uppercase tracking-widest">Session</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                <Row k="user_id" v={session?.user_id ?? "—"} />
                <Row k="email" v={session?.email ?? "—"} />
                <Row k="account_created" v={session?.created_at ?? "—"} />
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-display uppercase tracking-widest">Tier &amp; Subscription</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                <Row k="tier" v={state?.tier ?? "—"} />
                <Row k="subscribed" v={
                  <span className={state?.subscribed ? "text-serpent" : "text-muted-foreground"}>
                    {String(state?.subscribed ?? "—")}
                  </span>
                } />
                <Row k="period" v={state?.period ?? "—"} />
                <Row k="wallet_address" v={state?.wallet_address ?? "(none)"} />
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-display uppercase tracking-widest">Daily Quota</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                <Row k="daily_usage" v={state?.daily_usage ?? "—"} />
                <Row k="daily_limit" v={state?.daily_limit ?? "—"} />
                <Row k="daily_remaining" v={
                  <span className={state && state.daily_remaining === 0 ? "text-destructive" : ""}>
                    {state?.daily_remaining ?? "—"}
                  </span>
                } />
                <Row k="daily_pct_used" v={`${dailyPct}%`} />
                <Row k="resets_at" v="00:00 UTC" />
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-display uppercase tracking-widest">Monthly Quota</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                <Row k="monthly_usage" v={state?.monthly_usage ?? "—"} />
                <Row k="monthly_limit" v={state?.monthly_limit ?? "—"} />
                <Row k="monthly_remaining" v={state ? Math.max(0, state.monthly_limit - state.monthly_usage) : "—"} />
                <Row k="monthly_pct_used" v={`${monthlyPct}%`} />
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-display uppercase tracking-widest">Raw Payload</CardTitle></CardHeader>
          <CardContent>
            <pre className="text-[10px] font-mono bg-secondary/50 border border-border rounded p-3 overflow-auto max-h-96">
{JSON.stringify(state, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  );
};

export default Debug;
