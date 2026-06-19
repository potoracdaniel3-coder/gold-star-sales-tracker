import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { LogOut, Sparkles, Shield } from "lucide-react";

import {
  approvedJobs,
  fetchActivity,
  fetchBonuses,
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
import { ChatWidget } from "@/components/dashboard/ChatWidget";
import { Approvals } from "@/components/dashboard/Approvals";
import { BonusesManager } from "@/components/dashboard/BonusesManager";
import { useRole } from "@/hooks/useRole";

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
  const roleQ = useRole();
  const isManager = roleQ.data === "manager";

  // Salesmen don't see the manager dashboard — bounce them to their own.
  useEffect(() => {
    if (roleQ.data && roleQ.data !== "manager") {
      navigate({ to: "/me", replace: true });
    }
  }, [roleQ.data, navigate]);

  const salespeople = useQuery({ queryKey: qk.salespeople, queryFn: fetchSalespeople });
  const jobs = useQuery({ queryKey: qk.jobs, queryFn: fetchJobs });
  const activity = useQuery({ queryKey: qk.activity, queryFn: fetchActivity });
  const bonuses = useQuery({ queryKey: qk.bonuses, queryFn: fetchBonuses });

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const people = salespeople.data ?? [];
  const allJobs = jobs.data ?? [];
  const approved = approvedJobs(allJobs);
  const allActivity = activity.data ?? [];
  const pendingCount = allJobs.filter((j) => j.status === "pending").length;

  const weekStart = weekStartISO();
  const weekRevenue = approved.filter((j) => j.closed_at >= weekStart).reduce((s, j) => s + j.revenue, 0);
  const totalRevenue = approved.reduce((s, j) => s + j.revenue, 0);
  const totalJobs = approved.length;

  if (!isManager) {
    return null; // redirecting
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-gold/80">
              <Sparkles size={14} /> Manager dashboard
            </div>
            <h1 className="mt-2 font-display text-5xl font-semibold tracking-tight">
              Sales <span className="text-gold">Leaderboard</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Approve receipts, set bonuses, and track the whole team.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-xs text-gold">
              <Shield className="h-3 w-3" /> Manager
            </span>
            <ManageSalespeopleDialog salespeople={people} />
            <AddActivityDialog salespeople={people} />
            <AddJobDialog salespeople={people} />
            <Button variant="outline" size="sm" onClick={handleSignOut} aria-label="Sign out">
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </Button>
          </div>
        </header>

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <StatCard label="Revenue this week" value={fmt(weekRevenue)} accent />
          <StatCard label="All-time revenue" value={fmt(totalRevenue)} />
          <StatCard label="Jobs approved" value={String(totalJobs)} />
        </div>

        <Tabs defaultValue={pendingCount > 0 ? "approvals" : "leaderboard"} className="w-full">
          <TabsList className="bg-card/60 border border-border/60 backdrop-blur">
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            <TabsTrigger value="approvals" className="relative">
              Approvals
              {pendingCount > 0 && (
                <span className="ml-2 rounded-full bg-gold px-1.5 py-0.5 text-[10px] font-bold text-black">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="bonuses">Bonuses</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="leaderboard" className="mt-6 space-y-6">
            <Leaderboard salespeople={people} jobs={approved} />
            <RevenueTrend salespeople={people} jobs={approved} days={30} />
          </TabsContent>

          <TabsContent value="approvals" className="mt-6">
            <Approvals jobs={allJobs} salespeople={people} />
          </TabsContent>

          <TabsContent value="bonuses" className="mt-6">
            <BonusesManager bonuses={bonuses.data ?? []} />
          </TabsContent>

          <TabsContent value="progress" className="mt-6 space-y-4">
            {people.length === 0 ? (
              <EmptyHint />
            ) : (
              people.map((p) => (
                <PersonProgress key={p.id} person={p} jobs={approved} activity={allActivity} />
              ))
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <RecentJobs jobs={approved} salespeople={people} limit={50} />
          </TabsContent>
        </Tabs>
      </div>
      <ChatWidget />
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
