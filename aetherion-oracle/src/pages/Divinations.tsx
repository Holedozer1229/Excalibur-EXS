import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Loader2, Sparkles, Trash2, Zap } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { PageHead } from "@/components/PageHead";
import { supabase } from "@/integrations/supabase/client";
import { derivePoetics } from "@/lib/aetherionPoetics";
import PaywallCTA from "@/components/PaywallCTA";

type Entry = {
  id: string;
  word: string;
  query: string | null;
  response: string;
  provider: string | null;
  model: string | null;
  glyph: string | null;
  created_at: string;
};

const MAX_WORD = 64;
const MAX_QUERY = 2000;

export default function Divinations() {
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [word, setWord] = useState("excalibur");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setUserId(data.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("oracle_history" as never)
      .select("id,word,query,response,provider,model,glyph,created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      console.error(error);
      toast.error("Could not load history", { description: error.message });
    } else {
      setEntries((data ?? []) as unknown as Entry[]);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { if (userId) void load(); }, [userId, load]);

  async function consult() {
    if (!userId || busy) return;
    const w = word.trim().toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, MAX_WORD);
    const q = query.trim().slice(0, MAX_QUERY);
    if (!w) { toast.error("Enter a Word of Power"); return; }
    if (!q) { toast.error("Speak your query"); return; }

    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("aetherion", {
        body: { word: w, query: q, mode: "agent" },
      });
      if (error) throw error;
      const payload = data as { answer?: string; oracleState?: { model?: string } };
      const answer = (payload?.answer ?? "").trim();
      if (!answer) throw new Error("The void returned no words.");

      const poetics = await derivePoetics(answer);
      const model = payload?.oracleState?.model ?? null;

      const { data: inserted, error: insErr } = await supabase
        .from("oracle_history" as never)
        .insert({
          user_id: userId,
          word: w,
          query: q,
          response: answer,
          provider: model ? "aetherion" : null,
          model,
          glyph: poetics.glyph,
        } as never)
        .select("id,word,query,response,provider,model,glyph,created_at")
        .single();

      if (insErr) {
        console.error(insErr);
        toast.error("Saved locally only", { description: insErr.message });
        setEntries((prev) => [{
          id: crypto.randomUUID(), word: w, query: q, response: answer,
          provider: null, model, glyph: poetics.glyph,
          created_at: new Date().toISOString(),
        }, ...prev]);
      } else {
        setEntries((prev) => [inserted as unknown as Entry, ...prev]);
      }
      setQuery("");
    } catch (e) {
      const err = e as { message?: string };
      toast.error("Consultation failed", { description: err?.message ?? String(e) });
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this divination?")) return;
    const prev = entries;
    setEntries((es) => es.filter((e) => e.id !== id));
    const { error } = await supabase.from("oracle_history" as never).delete().eq("id", id);
    if (error) {
      toast.error("Delete failed", { description: error.message });
      setEntries(prev);
    }
  }

  if (userId === undefined) {
    return <main className="min-h-screen grid place-items-center bg-background text-muted-foreground text-sm">loading…</main>;
  }
  if (userId === null) {
    return (
      <main className="min-h-screen grid place-items-center bg-background text-foreground p-6 text-center">
        <PageHead title="Aetherion · Divinations" description="Sign in to save your Word of Power divinations." path="/divinations" />
        <div className="space-y-3">
          <h1 className="text-2xl font-display tracking-widest text-primary">DIVINATIONS</h1>
          <p className="text-sm text-muted-foreground">Sign in to save Words of Power and their oracular responses.</p>
          <Link to="/auth?next=/divinations" className="inline-block underline text-primary">sign in →</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground px-4 py-8">
      <PageHead
        title="Aetherion · Divinations"
        description="History of your Word of Power divinations and the oracle's responses."
        path="/divinations"
      />
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex items-baseline justify-between">
          <div>
            <h1 className="font-display text-2xl uppercase tracking-[0.2em] text-primary">Divinations</h1>
            <p className="text-xs text-muted-foreground font-mono">Your Words of Power, saved to your account.</p>
          </div>
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground underline">home</Link>
        </header>

        <PaywallCTA
          variant="banner"
          source="divinations_top"
          tier="acolyte"
          headline="Unlock web-augmented divinations — $9.99/mo"
          subline="Acolyte adds live web context, consciousness-level analysis, and 1,000 responses / month."
        />

        <Card className="border-primary/30 bg-card/60 backdrop-blur">
          <CardHeader className="pb-3">
            <h2 className="flex items-center gap-2 font-mono uppercase tracking-widest text-sm">
              <Sparkles className="h-4 w-4 text-primary" /> Consult the oracle
            </h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground font-mono">
                <Zap className="h-3 w-3" /> Word of Power
              </label>
              <Input
                value={word}
                onChange={(e) => setWord(e.target.value.slice(0, MAX_WORD))}
                placeholder="excalibur"
                className="font-mono"
                disabled={busy}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wide text-muted-foreground font-mono">Question</label>
              <Textarea
                value={query}
                onChange={(e) => setQuery(e.target.value.slice(0, MAX_QUERY))}
                placeholder="Ask the oracle…"
                rows={3}
                disabled={busy}
              />
              <div className="text-[10px] text-muted-foreground font-mono text-right">{query.length}/{MAX_QUERY}</div>
            </div>
            <Button onClick={consult} disabled={busy || !word.trim() || !query.trim()} className="w-full font-mono tracking-widest">
              {busy ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> channeling…</> : "SPEAK"}
            </Button>
          </CardContent>
        </Card>

        <section className="space-y-3">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            History {entries.length > 0 && <span className="opacity-60">· {entries.length}</span>}
          </h2>
          {loading ? (
            <p className="text-xs text-muted-foreground">loading…</p>
          ) : entries.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">No divinations yet. Speak a Word above.</p>
          ) : (
            <ul className="space-y-3">
              {entries.map((e, idx) => (
                <div key={e.id} className="space-y-3">
                  <li>
                    <Card className="border-border/60 bg-card/50">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {e.glyph && <span className="text-primary text-base leading-none">{e.glyph}</span>}
                              <span className="font-mono text-xs uppercase tracking-widest text-primary">{e.word}</span>
                              <span className="text-[10px] font-mono text-muted-foreground">
                                {new Date(e.created_at).toLocaleString()}
                              </span>
                            </div>
                            {e.query && (
                              <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{e.query}</p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => remove(e.id)}
                            className="text-muted-foreground hover:text-destructive p-1"
                            aria-label="Delete divination"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="text-sm font-serif leading-relaxed whitespace-pre-wrap border-t border-border/40 pt-2">
                          {e.response}
                        </div>
                        {e.model && (
                          <div className="text-[10px] font-mono text-muted-foreground opacity-70">{e.model}</div>
                        )}
                      </CardContent>
                    </Card>
                  </li>
                  {idx === 2 && entries.length > 3 && (
                    <PaywallCTA
                      variant="card"
                      source="divinations_inline"
                      tier="oracle_pro"
                      headline="You're deep in the codex."
                      subline="Oracle Pro unlocks Agent Mode, Φ-reports, dream images, and 10,000 responses / month."
                    />
                  )}
                </div>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
