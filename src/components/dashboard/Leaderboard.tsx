import { useMemo, useState } from "react";
import { Crown, TrendingUp, Trophy } from "lucide-react";
import type { Job, Salesperson } from "@/lib/db";
import { approvedJobs, weekStartISO } from "@/lib/db";
import { tierFromRevenue } from "@/lib/gamification";
import { TierBadge } from "@/components/dashboard/TierBadge";
import { cn } from "@/lib/utils";

type Row = {
  person: Salesperson;
  weekRevenue: number;
  totalRevenue: number;
  jobsThisWeek: number;
};

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function Leaderboard({
  salespeople,
  jobs,
}: {
  salespeople: Salesperson[];
  jobs: Job[];
}) {
  const [mode, setMode] = useState<"week" | "all">("week");
  const approved = useMemo(() => approvedJobs(jobs), [jobs]);

  const rows = useMemo<Row[]>(() => {
    const weekStart = weekStartISO();
    const base = salespeople.map((p) => {
      const all = approved.filter((j) => j.salesperson_id === p.id);
      const wk = all.filter((j) => j.closed_at >= weekStart);
      return {
        person: p,
        weekRevenue: wk.reduce((s, j) => s + j.revenue, 0),
        totalRevenue: all.reduce((s, j) => s + j.revenue, 0),
        jobsThisWeek: wk.length,
      };
    });
    return base.sort((a, b) =>
      mode === "week" ? b.weekRevenue - a.weekRevenue : b.totalRevenue - a.totalRevenue,
    );
  }, [salespeople, approved, mode]);

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card-gradient p-10 text-center text-muted-foreground">
        Add a salesperson to get started.
      </div>
    );
  }

  const leader = rows[0];
  const rest = rows.slice(1);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <div className="inline-flex rounded-full border border-border/60 bg-background/40 p-1 text-xs">
          <button
            onClick={() => setMode("week")}
            className={cn(
              "rounded-full px-3 py-1 font-semibold uppercase tracking-wider transition",
              mode === "week" ? "bg-gold text-black" : "text-muted-foreground hover:text-foreground",
            )}
          >
            This week
          </button>
          <button
            onClick={() => setMode("all")}
            className={cn(
              "rounded-full px-3 py-1 font-semibold uppercase tracking-wider transition",
              mode === "all" ? "bg-gold text-black" : "text-muted-foreground hover:text-foreground",
            )}
          >
            All time
          </button>
        </div>
      </div>
      <LeaderPedestal row={leader} mode={mode} />
      {rest.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {rest.map((r, i) => (
            <RankRow key={r.person.id} row={r} rank={i + 2} mode={mode} />
          ))}
        </div>
      )}
    </div>
  );
}

function LeaderPedestal({ row, mode }: { row: Row; mode: "week" | "all" }) {
  const tier = tierFromRevenue(row.totalRevenue).current;
  const value = mode === "week" ? row.weekRevenue : row.totalRevenue;
  return (
    <div className="relative overflow-hidden rounded-3xl border border-[oklch(0.78_0.14_85_/_30%)] bg-leader-gradient p-8 shadow-gold">
      <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-[radial-gradient(circle,oklch(0.82_0.16_88_/_30%),transparent_70%)]" />
      <div className="flex flex-wrap items-center gap-6">
        <div className="relative">
          <div
            className="flex h-24 w-24 items-center justify-center rounded-2xl border border-[oklch(0.82_0.16_88_/_40%)] bg-gold-gradient text-3xl font-bold shadow-gold"
            style={{ color: "#000" }}
          >
            {row.person.name.charAt(0).toUpperCase()}
          </div>
          <Crown className="absolute -top-4 left-1/2 -translate-x-1/2 rotate-[-8deg] text-gold drop-shadow-[0_4px_12px_oklch(0.82_0.16_88_/_60%)]" size={28} />
        </div>
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold/80">
            <Trophy size={14} /> {mode === "week" ? "Week leader" : "All-time leader"}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <div className="font-display text-4xl font-semibold tracking-tight">{row.person.name}</div>
            <TierBadge tier={tier} />
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {row.jobsThisWeek} {row.jobsThisWeek === 1 ? "job" : "jobs"} closed this week
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{mode === "week" ? "This week" : "All time"}</div>
          <div className="font-display text-5xl font-semibold text-gold">{fmt(value)}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {mode === "week" ? `All-time ${fmt(row.totalRevenue)}` : `Week ${fmt(row.weekRevenue)}`}
          </div>
        </div>
      </div>
    </div>
  );
}

function rankColor(rank: number) {
  if (rank === 2) return "#c0c0c0";
  if (rank === 3) return "#cd7f32";
  return null;
}

function RankRow({ row, rank, mode }: { row: Row; rank: number; mode: "week" | "all" }) {
  const tier = tierFromRevenue(row.totalRevenue).current;
  const value = mode === "week" ? row.weekRevenue : row.totalRevenue;
  const medal = rankColor(rank);
  return (
    <div className="group flex items-center gap-4 rounded-2xl border border-border/60 bg-card-gradient p-5 shadow-card transition-colors hover:border-border">
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-xl font-display text-lg font-semibold",
          !medal && "bg-secondary text-muted-foreground",
        )}
        style={medal ? { backgroundColor: medal + "33", color: medal, border: `1px solid ${medal}66` } : undefined}
      >
        {rank}
      </div>
      <div
        className="flex h-12 w-12 items-center justify-center rounded-xl font-semibold"
        style={{ backgroundColor: row.person.color + "33", color: row.person.color }}
      >
        {row.person.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="font-display text-lg font-medium">{row.person.name}</div>
          <TierBadge tier={tier} size="sm" />
        </div>
        <div className="text-xs text-muted-foreground">
          {row.jobsThisWeek} jobs · {mode === "week" ? `all-time ${fmt(row.totalRevenue)}` : `week ${fmt(row.weekRevenue)}`}
        </div>
      </div>
      <div className="text-right">
        <div className="font-display text-2xl font-semibold">{fmt(value)}</div>
        <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
          <TrendingUp size={12} /> {mode === "week" ? "this week" : "all time"}
        </div>
      </div>
    </div>
  );
}
