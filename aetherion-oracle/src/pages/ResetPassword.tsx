import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHead } from "@/components/PageHead";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Supabase auth-helpers parse the recovery hash automatically; wait for session.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (password.length < 6) { toast.error("Cipher must be at least 6 runes."); return; }
    if (password !== confirm) { toast.error("The two ciphers do not match."); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Cipher renewed. The construct opens.");
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Renewal failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHead title="Reset password | Aetherion" description="Reset your Aetherion account password." path="/reset-password" noIndex />
    <div className="min-h-screen flex items-center justify-center px-4 text-foreground">
      <div className="w-full max-w-md border-rune rounded-sm bg-card/60 backdrop-blur-md shadow-deep p-6 sm:p-8 animate-fade-in">
        <h1 className="font-display text-xl gradient-neon-text tracking-[0.3em] text-center mb-6">
          RENEW THE CIPHER
        </h1>

        {!ready ? (
          <p className="text-sm text-muted-foreground text-center">
            Awaiting the recovery signal… open this page from the link in your inbox.
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="font-display text-[10px] uppercase tracking-widest text-gold">New Cipher</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="mt-1 w-full bg-input border border-border rounded-sm px-3 py-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="font-display text-[10px] uppercase tracking-widest text-gold">Confirm</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="mt-1 w-full bg-input border border-border rounded-sm px-3 py-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full px-5 py-2.5 rounded-sm font-display uppercase tracking-widest text-sm bg-primary text-primary-foreground hover:glow disabled:opacity-50 transition-all"
            >
              {loading ? "Renewing…" : "Renew Cipher"}
            </button>
          </form>
        )}
      </div>
    </div>
    </>
  );
};

export default ResetPassword;
