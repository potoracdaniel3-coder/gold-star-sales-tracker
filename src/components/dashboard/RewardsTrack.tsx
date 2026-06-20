import { Check, Coins, Gift, Lock, Sparkles, Trophy } from "lucide-react";
import {
  approvedJobs,
  BONUS_METRIC_LABELS,
  BONUS_PERIOD_LABELS,
  weekStartISO,
  type Activity,
  type Bonus,
  type BonusMetric,
  type BonusPeriod,
  type Job,
  type RewardType,
} from "@/lib/db";
import { cn } from "@/lib/utils";

const REWARD_ICONS: Record<RewardType, React.ComponentType<{ className?: string }>> = {
  cash: Coins,
  prize: Gift,
  recognition: Trophy,
  time_off: Sparkles,
};

const REWARD_ACCENT: Record<RewardType, { ring: string; text: string; bg: string; chip: string }> = {
  cash:        { ring: "ring-gold/60",     text: "text-gold",          bg: "bg-gold/10",         chip: "bg-gold/20 text-gold" },
  prize:       { ring: "ring-cyan-400/60", text: "text-cyan-300",      bg: "bg-cyan-500/10",     chip: "bg-cyan-500/20 text-cyan-200" },
  recognition: { ring: "ring-purple-400/60", text: "text-purple-300",  bg: "bg-purple-500/10",   chip: "bg-purple-500/20 text-purple-200" },
  time_off:    { ring: "ring-emerald-400/60", text: "text-emerald-300", bg: "bg-emerald-500/10", chip: "bg-emerald-500/20 text-emerald-200" },
};

function monthStartISO(d = new Date()): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

function progressFor(b: Bonus, jobs: Job[], activity: Activity[], personId: string): number {
  const approved = approvedJobs(jobs).filter((j) => j.salesperson_id === personId);
  const mine = activity.filter((a) => a.salesperson_id === personId);
  const cutoff =
    b.period === "weekly" ? weekStartISO() :
    b.period === "monthly" ? monthStartISO() :
    "0000-00-00";
  const j = approved.filter((x) => x.closed_at >= cutoff);
  const a = mine.filter((x) => x.log_date >= cutoff);
  switch (b.metric) {
    case "revenue": return j.reduce((s, x) => s + x.revenue, 0);
    case "jobs": return j.length;
    case "doors": return a.reduce((s, x) => s + (x.doors_knocked || 0), 0);
    case "appts": return a.reduce((s, x) => s + (x.appointments_set || 0), 0);
  }
}

function fmtValue(metric: BonusMetric, n: number): string {
  if (metric === "revenue") return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  return n.toLocaleString();
}

function periodChip(period: BonusPeriod): string {
  return period === "weekly" ? "This week" : period === "monthly" ? "This month" : "All-time";
}

export function RewardsTrack({
  bonuses,
  personId,
  jobs,
  activity,
}: {
  bonuses: Bonus[];
  personId: string;
  jobs: Job[];
  activity: Activity[];
}) {
  const active = bonuses.filter((b) => b.active);

  if (active.length === 0) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card-gradient p-6 shadow-card">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Rewards path</div>
        <h3 className="font-display text-xl font-semibold">Rewards</h3>
        <p className="mt-3 text-sm text-muted-foreground">
          Your manager hasn't set any rewards yet. Once they do, you'll see what's up for grabs.
        </p>
      </div>
    );
  }

  // Group by period for nicer display
  const groups: { period: BonusPeriod; items: Bonus[] }[] = [
    { period: "weekly", items: [] },
    { period: "monthly", items: [] },
    { period: "lifetime", items: [] },
  ];
  for (const b of active) groups.find((g) => g.period === b.period)!.items.push(b);
  for (const g of groups) g.items.sort((a, b) => a.threshold - b.threshold);

  return (
    <div className="rounded-3xl border border-border/60 bg-card-gradient p-6 shadow-card">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Rewards path</div>
          <h3 className="font-display text-2xl font-semibold">What's up for grabs</h3>
        </div>
        <div className="text-[11px] text-muted-foreground">
          {active.length} live reward{active.length === 1 ? "" : "s"}
        </div>
      </div>

      <div className="space-y-6">
        {groups.filter((g) => g.items.length > 0).map((g) => (
          <div key={g.period}>
            <div className="mb-3 flex items-center gap-2">
              <div className="h-px flex-1 bg-border/40" />
              <span className="rounded-full border border-border/60 bg-background/40 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {periodChip(g.period)}
              </span>
              <div className="h-px flex-1 bg-border/40" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {g.items.map((b) => {
                const value = progressFor(b, jobs, activity, personId);
                const pct = Math.min(100, (value / b.threshold) * 100);
                const unlocked = value >= b.threshold;
                const accent = REWARD_ACCENT[b.reward_type];
                const Icon = REWARD_ICONS[b.reward_type];
                return (
                  <div
                    key={b.id}
                    className={cn(
                      "group relative overflow-hidden rounded-2xl border bg-background/40 p-4 transition-all",
                      unlocked ? "border-transparent ring-2 ring-offset-2 ring-offset-background " + accent.ring : "border-border/60",
                    )}
                  >
                    {unlocked && (
                      <div className={cn("absolute inset-0 -z-0 opacity-60", accent.bg)} />
                    )}
                    <div className="relative">
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "flex h-12 w-12 flex-none items-center justify-center rounded-xl border",
                            unlocked ? "border-transparent " + accent.chip : "border-border/60 bg-background/60 text-muted-foreground",
                          )}
                        >
                          {unlocked ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <div className="font-display text-base font-semibold leading-tight">{b.label}</div>
                            {!unlocked && <Lock className="h-3 w-3 text-muted-foreground" />}
                          </div>
                          <div className="mt-0.5 text-[11px] text-muted-foreground">
                            Goal: {fmtValue(b.metric, b.threshold)} {BONUS_METRIC_LABELS[b.metric].toLowerCase()}
                          </div>
                          <div className={cn("mt-1 font-display text-sm font-semibold", accent.text)}>
                            <Icon className="mr-1 inline h-3.5 w-3.5" />
                            {b.reward_value}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="h-2 overflow-hidden rounded-full bg-border/50">
                          <div
                            className={cn("h-full rounded-full transition-all", unlocked ? accent.chip : "bg-gold/70")}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                          <span>{fmtValue(b.metric, value)}</span>
                          <span>{fmtValue(b.metric, b.threshold)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
