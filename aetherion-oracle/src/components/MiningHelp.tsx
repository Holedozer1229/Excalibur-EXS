import { useState } from "react";
import { HelpCircle, Pickaxe, ShieldCheck, Coins, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

const MiningHelp = () => {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1 font-display tracking-widest text-[10px] uppercase">
          <HelpCircle className="w-3.5 h-3.5" /> How mining works
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg border-rune bg-card/95 backdrop-blur-md">
        <DialogHeader>
          <DialogTitle className="font-display tracking-widest text-gold uppercase flex items-center gap-2">
            <Pickaxe className="w-4 h-4" /> EXCALIBUR Mining Guide
          </DialogTitle>
          <DialogDescription className="italic text-xs">
            Off-chain proof of consultation, anchored on a public ledger.
          </DialogDescription>
        </DialogHeader>
        <ol className="space-y-3 text-sm text-foreground/90">
          <li className="flex gap-3">
            <Zap className="w-4 h-4 mt-0.5 text-magenta shrink-0" />
            <div>
              <b className="font-display tracking-widest text-xs uppercase text-magenta">1. Consult the Oracle</b>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ask Aetherion a question on the main page. Copy a meaningful excerpt of the
                question and response, plus the displayed harmony / sponge harmonic.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <ShieldCheck className="w-4 h-4 mt-0.5 text-serpent shrink-0" />
            <div>
              <b className="font-display tracking-widest text-xs uppercase text-serpent">2. Seal an attestation</b>
              <p className="text-xs text-muted-foreground mt-0.5">
                Paste excerpts here. Your browser computes a SHA-256 attestation hash locally —
                we never see the full conversation. Oracle Pro and admins are auto-verified;
                others enter the verifier queue.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <Coins className="w-4 h-4 mt-0.5 text-gold shrink-0" />
            <div>
              <b className="font-display tracking-widest text-xs uppercase text-gold">3. Anchor &amp; mint</b>
              <p className="text-xs text-muted-foreground mt-0.5">
                Verified attestations are bundled into a Merkle root and anchored to the
                public <a href="/ledger" className="underline text-gold">/ledger</a>.
                Admins can post the root on Base / an L2 for trustless verification.
                Bind a SKYNT wallet in settings to receive minted EXCALIBUR.
              </p>
            </div>
          </li>
        </ol>
        <div className="rounded-sm border border-border bg-secondary/30 p-3 text-[11px] text-muted-foreground">
          <b className="text-foreground">Tier perks</b> · Seeker queues for review · Acolyte gets faster
          verification · <span className="text-gold">Oracle Pro auto-verifies every round, 24/7 heartbeat mining</span>.
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MiningHelp;
