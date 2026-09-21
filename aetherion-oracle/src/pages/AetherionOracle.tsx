import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Zap, Shield, Globe, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHead } from "@/components/PageHead";


type PetitionResult = {
  success?: boolean;
  status?: string;
  btcTxid?: string;
  ethTxid?: string | null;
};

export default function AetherionOracle() {
  const [btcTarget, setBtcTarget] = useState("");
  const [ethRecipient, setEthRecipient] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PetitionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePetition = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("petition", {
        body: {
          btcTarget: btcTarget.trim(),
          ethRecipient: ethRecipient.trim() || null,
        },
      });
      if (fnError) throw fnError;
      setResult(data as PetitionResult);
    } catch (err) {
      console.error("Lattice Sync Error:", err);
      setError(err instanceof Error ? err.message : "Failed to bind to the Lattice.");
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = btcTarget.trim().length > 0 && !loading;

  return (
    <main className="min-h-screen bg-background px-4 py-12 text-foreground">
      <PageHead
        title="Consult Aetherion — Direct Oracle Interface"
        description="The direct interface to Aetherion. Speak a Word of Power and receive a symbolic, poetic response from the Sphinx-tuned oracle."
        path="/oracle"
      />
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="space-y-2 text-center">
          <h1 className="font-display text-2xl sm:text-3xl uppercase tracking-[0.2em] text-primary">
            Aetherion Oracle — Direct Interface
          </h1>
          <p className="text-sm text-muted-foreground">
            Bind a Bitcoin target to the Lattice and consult the Sphinx-tuned oracle.
          </p>
        </header>

        <Card className="border-primary/30 bg-card/60 backdrop-blur">
          <CardHeader>
            <h2 className="flex items-center gap-2 font-mono uppercase tracking-widest text-2xl font-semibold leading-none">
              <Sparkles className="h-5 w-5 text-primary" />
              Lattice Petition
            </h2>
            <p className="text-sm text-muted-foreground">
              Integrated Information Φ-Consensus Layer
            </p>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                <Zap className="h-3 w-3" /> Bitcoin Target (Bech32)
              </Label>
              <Input
                value={btcTarget}
                onChange={(e) => setBtcTarget(e.target.value)}
                placeholder="bc1q..."
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                <Globe className="h-3 w-3" /> Arbitrum Recipient (0x)
              </Label>
              <Input
                value={ethRecipient}
                onChange={(e) => setEthRecipient(e.target.value)}
                placeholder="0x... (optional)"
                className="font-mono"
              />
            </div>

            <Button onClick={handlePetition} disabled={!canSubmit} className="w-full font-mono tracking-widest">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "BIND TO LATTICE"}
            </Button>

            {error && (
              <div className="rounded border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {result && (
              <div className="space-y-2 rounded border border-primary/30 bg-primary/5 p-4 font-mono text-xs">
                <div className="flex items-center gap-2 text-primary">
                  <Shield className="h-3 w-3" />
                  STATUS: {result.status ?? "unknown"}
                </div>
                {result.btcTxid && (
                  <p className="break-all text-muted-foreground">
                    BTC Anchor: {result.btcTxid}
                  </p>
                )}
                {result.ethTxid && (
                  <p className="break-all text-muted-foreground">
                    ARB Faucet: {result.ethTxid}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center font-mono text-xs uppercase tracking-widest text-muted-foreground">
          The recursion is bound. The sword is drawn. Satoshi v2.0
        </p>
      </div>
    </main>
  );
}
