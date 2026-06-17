import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, Sparkles } from "lucide-react";

import {
  fetchActivity,
  fetchJobs,
  fetchSalespeople,
  qk,
  weekStartISO,
} from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Leaderboard } from "@/components/dashboard/Leaderboard";
import { PersonProgress, RevenueTrend } from "@/components/dashboard/Progress";
import { AddJobDialog } from "@/components/dashboard/AddJobDialog";
import { AddActivityDialog } from "@/components/dashboard/AddActivityDialog";
import { ManageSalespeopleDialog } from "@/components/dashboard/ManageSalespeopleDialog";
import { RecentJobs } from "@/components/dashboard/RecentJobs";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Sales Leaderboard" },
      { name: "description", content: "Live sales dashboard, leaderboard, and progress tracking." },
    ],
  }),
  component: Index,
});

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function Index() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const salespeople = useQuery({ queryKey: qk.salespeople, queryFn: fetchSalespeople });
  const jobs = useQuery({ queryKey: qk.jobs, queryFn: fetchJobs });
  const activity = useQuery({ queryKey: qk.activity, queryFn: fetchActivity });

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const people = salespeople.data ?? [];
  const allJobs = jobs.data ?? [];
  const allActivity = activity.data ?? [];

  const weekStart = weekStartISO();
  const weekRevenue = allJobs.filter((j) => j.closed_at >= weekStart).reduce((s, j) => s + j.revenue, 0);
  const totalRevenue = allJobs.reduce((s, j) => s + j.revenue, 0);
  const totalJobs = allJobs.length;

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* Header */}
        <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-gold/80">
              <Sparkles size={14} /> Live dashboard
            </div>
            <h1 className="mt-2 font-display text-5xl font-semibold tracking-tight">
              Sales <span className="text-gold">Leaderboard</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Track revenue, knocks, and closes — see who's on top this week.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ManageSalespeopleDialog salespeople={people} />
            <AddActivityDialog salespeople={people} />
            <AddJobDialog salespeople={people} />
            <Button variant="outline" size="sm" onClick={handleSignOut} aria-label="Sign out">
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </Button>
          </div>
        </header>

        {/* Top stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <StatCard label="Revenue this week" value={fmt(weekRevenue)} accent />
          <StatCard label="All-time revenue" value={fmt(totalRevenue)} />
          <StatCard label="Jobs closed" value={String(totalJobs)} />
        </div>

        <Tabs defaultValue="leaderboard" className="w-full">
          <TabsList className="bg-card/60 border border-border/60 backdrop-blur">
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="leaderboard" className="mt-6 space-y-6">
            <Leaderboard salespeople={people} jobs={allJobs} />
            <RevenueTrend salespeople={people} jobs={allJobs} days={30} />
          </TabsContent>

          <TabsContent value="progress" className="mt-6 space-y-4">
            {people.length === 0 ? (
              <EmptyHint />
            ) : (
              people.map((p) => (
                <PersonProgress key={p.id} person={p} jobs={allJobs} activity={allActivity} />
              ))
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <RecentJobs jobs={allJobs} salespeople={people} limit={50} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card-gradient p-5 shadow-card">
      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className={`mt-1 font-display text-3xl font-semibold ${accent ? "text-gold" : ""}`}>{value}</div>
    </div>
  );
}

function EmptyHint() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card-gradient p-10 text-center text-muted-foreground">
      Add a salesperson from the Team button to start tracking progress.
    </div>
  );
}
