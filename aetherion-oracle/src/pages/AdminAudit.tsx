import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail } from "lucide-react";
import { PageHead } from "@/components/PageHead";

interface AuditRow {
  id: string;
  user_id: string;
  email: string | null;
  from_tier: string | null;
  to_tier: string;
  change_type: string;
  effective_at: string;
  source: string;
  stripe_event_id: string | null;
  stripe_subscription_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

const typeColor: Record<string, string> = {
  immediate: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  scheduled: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  renewal: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  canceled: "bg-zinc-500/20 text-zinc-300 border-zinc-500/40",
  payment_failed: "bg-red-500/20 text-red-300 border-red-500/40",
  payment_recovered: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  admin_grant: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40",
};

export default function AdminAudit() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState<string | null>(null);
  const { toast } = useToast();

  const RESENDABLE = new Set(["payment_failed", "payment_recovered", "renewal"]);

  async function handleResend(row: AuditRow) {
    setResending(row.id);
    try {
      const { data, error } = await supabase.functions.invoke("admin-resend-alert", {
        body: { audit_id: row.id },
      });
      if (error) throw error;
      const d = data as { template?: string; recipient?: string; error?: string };
      if (d?.error) throw new Error(d.error);
      toast({ title: "Email resent", description: `${d.template} → ${d.recipient}` });
    } catch (e) {
      toast({
        title: "Resend failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setResending(null);
    }
  }

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }
      const { data: roles } = await supabase
        .from("user_roles").select("role").eq("user_id", session.user.id);
      const admin = (roles ?? []).some((r: { role: string }) => r.role === "admin");
      setIsAdmin(admin);
      if (!admin) { setLoading(false); return; }
      const { data, error } = await supabase
        .from("tier_change_audit")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) setError(error.message);
      setRows((data as AuditRow[]) ?? []);
      setLoading(false);
    })();
  }, [navigate]);

  if (loading) return <div data-testid="admin-audit-loading" className="min-h-screen p-8 text-zinc-300">Loading…</div>;
  if (!isAdmin) return (
    <div data-testid="admin-audit-denied" className="min-h-screen p-8 text-zinc-300">
      <p>Admin access required.</p>
      <Link to="/" className="underline">Return home</Link>
    </div>
  );

  return (
    <>
      <PageHead title="Audit log | Aetherion" description="Admin tier change audit log." path="/admin/audit" noIndex />
    <div data-testid="admin-audit-page" className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 data-testid="admin-audit-title" className="text-2xl font-semibold tracking-tight">Tier Change Audit Log</h1>
          <Button variant="outline" asChild><Link to="/">Back</Link></Button>
        </div>
        {error && <p className="text-red-400 mb-4">{error}</p>}
        <Card className="bg-zinc-900/60 border-zinc-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table data-testid="admin-audit-table" className="w-full text-sm">
              <thead className="bg-zinc-900 text-zinc-400">
                <tr>
                  <th className="text-left p-3">When</th>
                  <th className="text-left p-3">User</th>
                  <th className="text-left p-3">Change</th>
                  <th className="text-left p-3">Type</th>
                  <th className="text-left p-3">Effective</th>
                  <th className="text-left p-3">Source</th>
                  <th className="text-left p-3">Stripe Event</th>
                  <th className="text-left p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr data-testid="admin-audit-empty"><td colSpan={8} className="p-6 text-center text-zinc-500">No tier changes recorded yet.</td></tr>
                )}
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-zinc-800 hover:bg-zinc-900/50">
                    <td className="p-3 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="p-3 max-w-[220px] truncate" title={r.email ?? r.user_id}>
                      {r.email ?? r.user_id.slice(0, 8)}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="text-zinc-400">{r.from_tier ?? "—"}</span>
                      <span className="mx-2">→</span>
                      <span className="font-medium">{r.to_tier}</span>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className={typeColor[r.change_type] ?? ""}>{r.change_type}</Badge>
                    </td>
                    <td className="p-3 whitespace-nowrap">{new Date(r.effective_at).toLocaleString()}</td>
                    <td className="p-3">{r.source}</td>
                    <td className="p-3 font-mono text-xs text-zinc-400">{r.stripe_event_id ?? "—"}</td>
                    <td className="p-3">
                      {RESENDABLE.has(r.change_type) && r.stripe_event_id ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={resending === r.id}
                          onClick={() => handleResend(r)}
                        >
                          {resending === r.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Mail className="h-3.5 w-3.5" />}
                          Resend
                        </Button>
                      ) : (
                        <span className="text-zinc-600 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
    </>
  );
}
