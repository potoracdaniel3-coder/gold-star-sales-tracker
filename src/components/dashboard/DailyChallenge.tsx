import { CheckCircle2, Target } from "lucide-react";
import type { Activity, Job } from "@/lib/db";
import { challengeProgress, dailyChallengeFor } from "@/lib/gamification";
import { Progress } from "@/components/ui/progress";

function fmtValue(metric: string, n: number) {
  if (metric === "revenue") return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  return String(n);
}

export function DailyChallenge({
  personId,
  jobs,
  activity,
}: {
  personId: string;
  jobs: Job[];
  activity: Activity[];
}) {
  const c = dailyChallengeFor();
  const p = challengeProgress(c, jobs, activity, personId);
  return (
    <div className="rounded-2xl border border-border/60 bg-card-gradient p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${p.done ? "bg-gold/20 text-gold" : "bg-cyan-500/10 text-cyan-300"}`}>
            {p.done ? <CheckCircle2 className="h-5 w-5" /> : <Target className="h-5 w-5" />}
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Today's challenge</div>
            <div className="font-display text-lg font-semibold">{c.label}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-display text-xl font-semibold">
            {fmtValue(c.metric, p.value)}
            <span className="text-sm text-muted-foreground"> / {fmtValue(c.metric, c.target)}</span>
          </div>
          {p.done && <div className="text-[11px] font-semibold text-gold">Crushed it 🔥</div>}
        </div>
      </div>
      <Progress value={p.pct} className="mt-3 h-2" />
    </div>
  );
}
