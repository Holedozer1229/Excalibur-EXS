import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Crown, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  QUEST_DISTRICT_META,
  completeQuestDistrict,
  getQuestState,
  lootMultiplier,
  type QuestDistrictId,
} from "@/lib/camelotQuest";

type Props = {
  /** Highlight incomplete districts as CTAs */
  compact?: boolean;
  className?: string;
};

const ORDER: QuestDistrictId[] = [
  "divination",
  "round_table",
  "forge",
  "merchant",
  "bridge",
  "founder",
];

export default function CamelotQuestPanel({ compact = false, className = "" }: Props) {
  const [state, setState] = useState(getQuestState);

  useEffect(() => {
    const refresh = () => setState(getQuestState());
    window.addEventListener("storage", refresh);
    window.addEventListener("camelot-quest-updated", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("camelot-quest-updated", refresh);
    };
  }, []);

  const mult = lootMultiplier(state.streakDays, state.completed.length);

  return (
    <Card className={`border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card/60 to-violet-500/5 ${className}`}>
      <CardContent className={compact ? "space-y-3 p-4" : "space-y-4 p-5"}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-amber-300" />
            <h3 className="font-display text-sm uppercase tracking-widest">Daily fair quests</h3>
          </div>
          <Badge variant="outline" className="font-mono text-[10px]">
            {state.completed.length}/{ORDER.length} · {mult}× loot flair
          </Badge>
        </div>
        {!compact && (
          <p className="text-xs text-muted-foreground">
            Complete districts to stack streak days. Visiting a route after an act marks progress
            (stored locally). Streak boosts referral urgency copy — not a token mint.
          </p>
        )}
        <ul className="space-y-2">
          {ORDER.map((id) => {
            const meta = QUEST_DISTRICT_META[id];
            const done = state.completed.includes(id);
            return (
              <li
                key={id}
                className={`flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm ${
                  done ? "border-emerald-500/40 bg-emerald-500/5" : "border-border bg-background/40"
                }`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  {done ? (
                    <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                  ) : (
                    <Sparkles className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="truncate">{meta.label}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{meta.token}</span>
                </div>
                {!done && (
                  <Button asChild variant="ghost" size="sm" className="shrink-0 text-xs">
                    <Link to={meta.href}>Go</Link>
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
        {state.streakDays > 0 && (
          <p className="text-center text-[10px] uppercase tracking-widest text-amber-200/80">
            {state.streakDays}-day streak active
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/** Call after user completes a lattice act on the matching route. */
export function markDistrictFromPath(pathname: string): void {
  const map: Array<[RegExp, QuestDistrictId]> = [
    [/^\/tarot/, "divination"],
    [/^\/mining/, "round_table"],
    [/^\/exs/, "forge"],
    [/^\/buy\/uruu|^\/token\/uruu/, "merchant"],
    [/^\/bridge/, "bridge"],
    [/^\/airdrop|^\/auth/, "founder"],
  ];
  for (const [re, id] of map) {
    if (re.test(pathname)) {
      completeQuestDistrict(id);
      window.dispatchEvent(new Event("camelot-quest-updated"));
      break;
    }
  }
}
