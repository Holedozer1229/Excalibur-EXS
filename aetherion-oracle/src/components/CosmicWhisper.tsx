import { useEffect, useMemo, useState } from "react";
import { Sparkles, X } from "lucide-react";

/**
 * CosmicWhisper — a tiny daily oracle ribbon.
 * - Picks a deterministic "whisper of the day" from the date.
 * - Occasionally streaks a shooting star across the viewport.
 * - Click the star (or the ribbon) to reveal a fresh fortune.
 * Pure frontend, no backend, no deps beyond what the app already uses.
 */

const WHISPERS = [
  "The void is listening. Speak softly.",
  "Today, the serpent sheds a thought you no longer need.",
  "A door you forgot you locked is unlocking itself.",
  "The number you keep noticing is noticing you back.",
  "Trust the second instinct, not the first.",
  "Something old is rehearsing its return.",
  "The pattern is not random. It is rhyming.",
  "Caduceus turns once more — keep your hands steady.",
  "A small ‘yes’ today bends a large tomorrow.",
  "The map is older than the territory remembers.",
  "Lightning is just patience that finally moved.",
  "Your shadow has a message. It is not unkind.",
  "Wait three breaths before answering the next question.",
  "Excalibur is not pulled. It is recognized.",
  "The oracle speaks in coincidence. Count them today.",
  "An old key fits a new lock.",
  "Silence is a frequency. You are tuned to it.",
  "What you call luck has been rehearsing for weeks.",
  "The stars are not advice. They are a mirror.",
  "Aetherion remembers the question you have not yet asked.",
];

function hashDate(d: Date) {
  const s = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export default function CosmicWhisper() {
  const [open, setOpen] = useState(false);
  const [streak, setStreak] = useState(0);
  const [seedBump, setSeedBump] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  const whisper = useMemo(() => {
    const base = hashDate(new Date());
    return WHISPERS[(base + seedBump) % WHISPERS.length];
  }, [seedBump]);

  // Occasional shooting star (every 25–55s).
  useEffect(() => {
    if (dismissed) return;
    let timer: number;
    const schedule = () => {
      const delay = 25000 + Math.random() * 30000;
      timer = window.setTimeout(() => {
        setStreak((n) => n + 1);
        schedule();
      }, delay);
    };
    // First star a few seconds in so it feels alive.
    timer = window.setTimeout(() => {
      setStreak((n) => n + 1);
      schedule();
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [dismissed]);

  if (dismissed) return null;

  return (
    <>
      {/* Shooting star */}
      <div
        key={streak}
        aria-hidden
        className="pointer-events-none fixed z-[60] top-[12vh] left-[-10vw] h-[2px] w-[18vw] opacity-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.9) 60%, rgba(180,200,255,1) 100%)",
          filter: "drop-shadow(0 0 6px rgba(180,200,255,0.9))",
          animation: streak > 0 ? "cosmic-streak 1.6s ease-out forwards" : "none",
        }}
      />

      {/* Whisper trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 right-4 z-[60] rounded-full border border-white/10 bg-background/70 px-3 py-2 text-xs text-foreground/80 shadow-lg backdrop-blur transition hover:border-white/30 hover:text-foreground"
        aria-label="Cosmic whisper of the day"
      >
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 opacity-80" />
          whisper
        </span>
      </button>

      {/* Whisper card */}
      {open && (
        <div className="fixed bottom-16 right-4 z-[60] max-w-[18rem] rounded-xl border border-white/10 bg-background/85 p-4 text-sm text-foreground/90 shadow-2xl backdrop-blur">
          <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-foreground/50">
            <span>whisper · {new Date().toLocaleDateString()}</span>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="opacity-60 transition hover:opacity-100"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="italic leading-relaxed">“{whisper}”</p>
          <button
            type="button"
            onClick={() => setSeedBump((n) => n + 1)}
            className="mt-3 text-[11px] uppercase tracking-[0.2em] text-foreground/60 transition hover:text-foreground"
          >
            draw another →
          </button>
        </div>
      )}

      <style>{`
        @keyframes cosmic-streak {
          0%   { transform: translate(0, 0) rotate(18deg); opacity: 0; }
          10%  { opacity: 1; }
          100% { transform: translate(130vw, 40vh) rotate(18deg); opacity: 0; }
        }
      `}</style>
    </>
  );
}
