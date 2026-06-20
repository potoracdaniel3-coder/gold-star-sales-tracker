import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Flame, LogOut, Sparkles, Trophy, Zap } from "lucide-react";

import {
  approvedJobs,
  computeStreak,
  fetchActivity,
  fetchBonuses,
  fetchGoals,
  fetchJobs,
  fetchSalespeople,
  levelFromXp,
  qk,
  weekStartISO,
  xpFromRevenue,
} from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useMe } from "@/hooks/useMe";
import { useRole } from "@/hooks/useRole";
import { Leaderboard } from "@/components/dashboard/Leaderboard";
import { SubmitJobDialog } from "@/components/dashboard/SubmitJobDialog";
import { MyGoals } from "@/components/dashboard/MyGoals";
import { MySubmissions } from "@/components/dashboard/MySubmissions";
import { RewardsTrack } from "@/components/dashboard/RewardsTrack";
import { TierBadge } from "@/components/dashboard/TierBadge";
import { AchievementsGrid } from "@/components/dashboard/AchievementsGrid";
import { DailyChallenge } from "@/components/dashboard/DailyChallenge";
import { computeBadges, computeDailyStreak, hasActivityToday, tierFromRevenue } from "@/lib/gamification";

export const Route = createFileRoute("/_authenticated/me")({
  head: () => ({
    meta: [
      { title: "My Dashboard — Sales Leaderboard" },
      { name: "description", content: "Track your XP, streak, goals and weekly bonuses." },
    ],
  }),
  component: SalesmanDashboard,
});

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function SalesmanDashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const meQ = useMe();
  const roleQ = useRole();
  const isManager = roleQ.data === "manager";

  const salespeopleQ = useQuery({ queryKey: qk.salespeople, queryFn: fetchSalespeople });
  const jobsQ = useQuery({ queryKey: qk.jobs, queryFn: fetchJobs });
  const activityQ = useQuery({ queryKey: qk.activity, queryFn: fetchActivity });
  const goalsQ = useQuery({ queryKey: qk.goals, queryFn: fetchGoals });
  const bonusesQ = useQuery({ queryKey: qk.bonuses, queryFn: fetchBonuses });

  const me = meQ.data;
  const people = salespeopleQ.data ?? [];
  const allJobs = jobsQ.data ?? [];
  const approved = approvedJobs(allJobs);
  const allActivity = activityQ.data ?? [];
  const goals = goalsQ.data ?? [];
  const bonuses = bonusesQ.data ?? [];

  const myJobs = useMemo(() => allJobs.filter((j) => me && j.salesperson_id === me.id), [allJobs, me]);
  const myApproved = useMemo(() => approved.filter((j) => me && j.salesperson_id === me.id), [approved, me]);

  const stats = useMemo(() => {
    if (!me) return null;
    const wk = weekStartISO();
    const weekRevenue = myApproved.filter((j) => j.closed_at >= wk).reduce((s, j) => s + j.revenue, 0);
    const totalRevenue = myApproved.reduce((s, j) => s + j.revenue, 0);
    const xp = xpFromRevenue(totalRevenue);
    const lvl = levelFromXp(xp);
    const streak = computeStreak(myApproved);
    const rejected = myJobs.filter((j) => j.status === "rejected").length;
    const closeRate = myApproved.length + rejected > 0 ? (myApproved.length / (myApproved.length + rejected)) * 100 : 0;
    const avgRevenue = myApproved.length > 0 ? totalRevenue / myApproved.length : 0;
    const distinctWeeks = new Set(myApproved.map((j) => weekStartISO(new Date(j.closed_at + "T00:00:00Z")))).size;

    // Rank by all-time approved revenue
    const totals = people.map((p) => ({
      id: p.id,
      total: approved.filter((j) => j.salesperson_id === p.id).reduce((s, j) => s + j.revenue, 0),
    })).sort((a, b) => b.total - a.total);
    const rank = totals.findIndex((t) => t.id === me.id) + 1;
    const isTopDog = totals.length > 0 && totals[0].id === me.id && totals[0].total > 0;

    const tier = tierFromRevenue(totalRevenue);
    const dailyStreak = computeDailyStreak(myApproved, allActivity.filter((a) => a.salesperson_id === me.id));
    const loggedToday = hasActivityToday(allJobs, allActivity, me.id);
    const badges = computeBadges({ personId: me.id, jobs: allJobs, activity: allActivity, weekStreak: streak, isTopDog });

    return { weekRevenue, totalRevenue, xp, lvl, streak, dailyStreak, loggedToday, closeRate, avgRevenue, distinctWeeks, rank, of: people.length, tier, badges, isTopDog };
  }, [me, myApproved, myJobs, approved, people, allJobs, allActivity]);

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (meQ.isLoading || roleQ.isLoading) {
    return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;
  }

  if (!me) {
    return (
      <div className="grid min-h-screen place-items-center px-6">
        <div className="max-w-md rounded-2xl border border-border/60 bg-card-gradient p-8 text-center">
          <h1 className="font-display text-2xl font-semibold">No profile linked</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account isn't linked to a salesperson record yet. Ask your manager to add you to the team.
          </p>
          <Button variant="outline" className="mt-6" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Header */}
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-gold/80">
              <Sparkles size={14} /> My dashboard
            </div>
            <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Hey, {me.name.split(" ")[0]}</h1>
          </div>
          <div className="flex items-center gap-2">
            {isManager && (
              <Button variant="outline" size="sm" onClick={() => navigate({ to: "/" })}>
                Manager view
              </Button>
            )}
            <SubmitJobDialog me={me} />
            <AllTimeLeaderboard people={people} jobs={approved} />
            <Button variant="outline" size="sm" onClick={handleSignOut} aria-label="Sign out">
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </Button>
          </div>
        </header>

        {/* Profile card */}
        <div className="mb-6 overflow-hidden rounded-3xl border border-gold/30 bg-leader-gradient p-6 shadow-gold">
          <div className="flex flex-wrap items-center gap-5">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-gold/40 font-display text-3xl font-bold shadow-gold"
              style={{ backgroundColor: me.color + "33", color: me.color }}
            >
              {me.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-[200px]">
              <div className="flex flex-wrap items-center gap-2">
                <div className="font-display text-3xl font-semibold">{me.name}</div>
                <TierBadge tier={stats.tier.current} size="md" />
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                <Trophy className="h-4 w-4 text-gold" />
                <span className="text-gold font-semibold">Rank {stats.rank || "—"}</span>
                <span className="text-muted-foreground">of {stats.of}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">Level {stats.lvl.level} · {stats.lvl.toNext.toLocaleString()} XP to next</span>
              </div>
              <div className="mt-3">
                <Progress value={stats.lvl.pct} className="h-2" />
              </div>
              {stats.tier.next && (
                <div className="mt-2 text-[11px] text-muted-foreground">
                  {fmt(stats.tier.toNext)} more all-time revenue to reach{" "}
                  <span className="font-semibold" style={{ color: stats.tier.next.color }}>{stats.tier.next.label}</span>
                </div>
              )}
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Tile
              icon={<Flame className={`h-5 w-5 ${stats.loggedToday ? "text-orange-400" : "text-muted-foreground"}`} />}
              value={String(stats.dailyStreak)}
              label={stats.loggedToday ? "Day streak" : "Day streak (log to keep)"}
            />
            <Tile icon={<Flame className="h-5 w-5 text-orange-400" />} value={String(stats.streak)} label="Week streak" />
            <Tile icon={<Zap className="h-5 w-5 text-cyan-300" />} value={stats.xp.toLocaleString()} label="XP points" />
            <Tile icon={<Trophy className="h-5 w-5 text-gold" />} value={String(stats.lvl.level)} label="Level" />
          </div>
        </div>

        {/* Tier track */}
        <div className="mb-6">
          <TierTrack totalRevenue={stats.totalRevenue} />
        </div>

        {/* Daily challenge */}
        <div className="mb-6">
          <DailyChallenge personId={me.id} jobs={allJobs} activity={allActivity} />
        </div>

        {/* Analytics row */}
        <div className="mb-6 grid gap-4 sm:grid-cols-4">
          <Mini label="This week" value={fmt(stats.weekRevenue)} accent />
          <Mini label="Close rate" value={`${stats.closeRate.toFixed(0)}%`} />
          <Mini label="Avg / job" value={fmt(stats.avgRevenue)} />
          <Mini label="Weeks worked" value={String(stats.distinctWeeks)} />
        </div>

        {/* Rewards */}
        <div className="mb-6">
          <RewardsTrack bonuses={bonuses} personId={me.id} jobs={allJobs} activity={allActivity} />
        </div>

        {/* Achievements */}
        <div className="mb-6">
          <AchievementsGrid earned={stats.badges} />
        </div>

        {/* Goals + Submissions */}
        <div className="grid gap-6 lg:grid-cols-2">
          <MyGoals me={me} goals={goals} jobs={allJobs} activity={allActivity} />
          <MySubmissions jobs={myJobs} />
        </div>
      </div>
    </div>
  );
}

function Tile({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-border/40 bg-background/40 p-4 text-center backdrop-blur">
      <div className="flex justify-center">{icon}</div>
      <div className="mt-2 font-display text-2xl font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function Mini({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card-gradient p-4 shadow-card">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className={`mt-1 font-display text-xl font-semibold ${accent ? "text-gold" : ""}`}>{value}</div>
    </div>
  );
}

function AllTimeLeaderboard({ people, jobs }: { people: import("@/lib/db").Salesperson[]; jobs: import("@/lib/db").Job[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Eye className="mr-1 h-4 w-4" /> Leaderboard</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl bg-card border-border">
        <DialogHeader><DialogTitle className="font-display text-2xl">All-time leaderboard</DialogTitle></DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto">
          <Leaderboard salespeople={people} jobs={jobs} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
