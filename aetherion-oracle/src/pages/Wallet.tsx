import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AetherionWalletPanel from "@/components/AetherionWalletPanel";
import { Loader2 } from "lucide-react";
import { PageHead } from "@/components/PageHead";

export default function Wallet() {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSignedIn(!!session);
      setReady(true);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSignedIn(!!s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!ready) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="container mx-auto max-w-xl space-y-4 p-6">
      <PageHead
        title="Your Aetherion Wallet — Non-custodial BTC & ETH"
        description="A non-custodial BTC and ETH wallet generated in your browser. Aetherion only stores the public addresses; your keys never leave your device."
        path="/wallet"
      />
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Your Aetherion Wallet</h1>
        <p className="mt-1 text-sm text-muted-foreground">Non-custodial BTC + ETH. Generated in your browser. We only store the public addresses.</p>
      </header>
      {signedIn ? (
        <AetherionWalletPanel />
      ) : (
        <div className="rounded-md border border-border/60 bg-muted/20 p-6 text-sm space-y-3">
          <p>Browse free. Sign in to sync public addresses to your Seeker profile — keys still never leave this device.</p>
          <Link to="/auth?next=/wallet" className="inline-block underline text-primary">sign in →</Link>
        </div>
      )}
    </div>
  );
}
