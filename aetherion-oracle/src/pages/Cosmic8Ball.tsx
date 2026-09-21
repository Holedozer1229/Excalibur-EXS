import { useEffect, useRef, useState } from "react";
import { PageHead } from "@/components/PageHead";
import GalacticBackground from "@/components/GalacticBackground";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Smartphone, RefreshCcw } from "lucide-react";

// 24 archetypal answers, tagged by tone.
const ANSWERS: { tone: "yes" | "no" | "maybe"; text: string }[] = [
  { tone: "yes", text: "The stars align — proceed." },
  { tone: "yes", text: "Yes. The current already carries you." },
  { tone: "yes", text: "The lattice hums in your favor." },
  { tone: "yes", text: "Threefold yes — act without delay." },
  { tone: "yes", text: "The veil parts. Walk through." },
  { tone: "yes", text: "Aetherion whispers: it is so." },
  { tone: "yes", text: "The moon has spoken — begin." },
  { tone: "yes", text: "Signs converge. This path is lit." },
  { tone: "no", text: "The field resists. Wait." },
  { tone: "no", text: "Not this moon. Not this door." },
  { tone: "no", text: "The oracle turns her face away." },
  { tone: "no", text: "No — but do not mourn it." },
  { tone: "no", text: "The current runs against you today." },
  { tone: "no", text: "Release this thread. It is not yours." },
  { tone: "no", text: "The lattice is silent. Reconsider." },
  { tone: "no", text: "A closed gate. Try another." },
  { tone: "maybe", text: "Ask again when the moon is full." },
  { tone: "maybe", text: "The answer waits behind another question." },
  { tone: "maybe", text: "The signal is unclear. Meditate." },
  { tone: "maybe", text: "Yes and no — you are both the door and the key." },
  { tone: "maybe", text: "The oracle blinks. Try dawn." },
  { tone: "maybe", text: "Between yes and no lies your real question." },
  { tone: "maybe", text: "The threads tangle. Return with silence." },
  { tone: "maybe", text: "Cast again after breath." },
];

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Rough moon phase 0..1 (0=new, 0.5=full).
function moonPhase(d = new Date()): number {
  const synodic = 29.530588853;
  const ref = Date.UTC(2000, 0, 6, 18, 14); // known new moon
  const days = (d.getTime() - ref) / 86400000;
  return ((days % synodic) + synodic) % synodic / synodic;
}
function moonGlyph(p: number): string {
  const glyphs = ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"];
  return glyphs[Math.floor(p * 8) % 8];
}

export default function Cosmic8Ball() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<typeof ANSWERS[number] | null>(null);
  const [shaking, setShaking] = useState(false);
  const [motionGranted, setMotionGranted] = useState<boolean | null>(null);
  const shakeAccum = useRef(0);
  const lastShake = useRef(0);
  const phase = moonPhase();
  const glyph = moonGlyph(phase);

  function consult() {
    if (shaking) return;
    setShaking(true);
    setAnswer(null);
    const seed = (hashString(question.trim().toLowerCase()) + Math.floor(phase * 10000) + Date.now()) >>> 0;
    const pick = ANSWERS[seed % ANSWERS.length];
    window.setTimeout(() => {
      setAnswer(pick);
      setShaking(false);
    }, 1600);
  }

  // Device-motion shake detection.
  useEffect(() => {
    function onMotion(e: DeviceMotionEvent) {
      const a = e.accelerationIncludingGravity;
      if (!a) return;
      const mag = Math.sqrt((a.x ?? 0) ** 2 + (a.y ?? 0) ** 2 + (a.z ?? 0) ** 2);
      const delta = Math.abs(mag - 9.8);
      shakeAccum.current = shakeAccum.current * 0.9 + delta;
      const now = Date.now();
      if (shakeAccum.current > 40 && now - lastShake.current > 2500) {
        lastShake.current = now;
        shakeAccum.current = 0;
        consult();
      }
    }
    if (motionGranted) {
      window.addEventListener("devicemotion", onMotion);
      return () => window.removeEventListener("devicemotion", onMotion);
    }
  }, [motionGranted, question, phase]);

  async function enableMotion() {
    // iOS 13+ permission gate.
    const anyDM = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
    if (typeof anyDM.requestPermission === "function") {
      try {
        const res = await anyDM.requestPermission();
        setMotionGranted(res === "granted");
      } catch {
        setMotionGranted(false);
      }
    } else {
      setMotionGranted(true);
    }
  }

  return (
    <>
      <PageHead
        title="Cosmic 8-Ball — Shake for an Answer · Aetherion"
        description="Ask the oracle a yes/no question and shake your device (or tap the orb) for a mystical answer, tuned to the current moon phase."
        path="/oracle-8ball"
      />
      <GalacticBackground />
      <main className="min-h-screen container max-w-md py-8 relative z-10 space-y-6">
        <header className="space-y-2 text-center">
          <div className="flex items-center justify-center gap-2 text-primary">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs font-display tracking-widest uppercase">Cosmic 8-Ball</span>
          </div>
          <h1 className="text-3xl font-display">Ask & Shake</h1>
          <p className="text-xs text-muted-foreground">
            {glyph} Moon phase {(phase * 100).toFixed(0)}% · answers tune to the sky
          </p>
        </header>

        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value.slice(0, 200))}
          placeholder="Whisper your yes/no question…"
          rows={2}
          className="text-center"
        />

        <div className="flex justify-center">
          <button
            type="button"
            onClick={consult}
            aria-label="Consult the orb"
            className={`relative h-56 w-56 rounded-full select-none transition-transform ${shaking ? "animate-[wiggle_0.15s_ease-in-out_infinite]" : "hover:scale-[1.02]"}`}
            style={{
              background:
                "radial-gradient(circle at 30% 25%, hsl(var(--primary) / 0.9), hsl(var(--background)) 55%, #000 100%)",
              boxShadow:
                "inset -20px -30px 60px rgba(0,0,0,0.7), 0 0 60px hsl(var(--primary) / 0.35)",
            }}
          >
            <div className="absolute inset-6 rounded-full border border-primary/30" />
            <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
              {shaking ? (
                <span className="text-4xl animate-pulse">{glyph}</span>
              ) : answer ? (
                <span
                  className={`text-sm font-display leading-snug ${
                    answer.tone === "yes"
                      ? "text-primary"
                      : answer.tone === "no"
                        ? "text-destructive"
                        : "text-foreground"
                  }`}
                >
                  {answer.text}
                </span>
              ) : (
                <span className="text-xs uppercase tracking-widest text-muted-foreground">
                  tap or shake
                </span>
              )}
            </div>
          </button>
        </div>

        <div className="flex flex-col gap-2 items-center">
          <Button onClick={consult} disabled={shaking} className="gap-2 w-full">
            <RefreshCcw className="h-4 w-4" /> Consult the orb
          </Button>
          {motionGranted !== true && (
            <Button variant="outline" size="sm" onClick={enableMotion} className="gap-2">
              <Smartphone className="h-3 w-3" />
              {motionGranted === false ? "Motion denied — tap to consult" : "Enable shake-to-ask"}
            </Button>
          )}
        </div>

        <p className="text-[11px] text-center text-muted-foreground max-w-xs mx-auto">
          For the fuller reading, cast a{" "}
          <a href="/tarot/yes-no" className="underline text-primary">yes/no tarot</a> or open a{" "}
          <a href="/chat" className="underline text-primary">chat with Aetherion</a>.
        </p>

        <style>{`
          @keyframes wiggle {
            0%, 100% { transform: translate(0,0) rotate(0); }
            25% { transform: translate(-4px, 2px) rotate(-2deg); }
            50% { transform: translate(4px, -2px) rotate(2deg); }
            75% { transform: translate(-3px, -3px) rotate(-1deg); }
          }
        `}</style>
      </main>
    </>
  );
}
