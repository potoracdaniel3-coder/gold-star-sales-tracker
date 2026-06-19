import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import {
  GOAL_TYPE_LABELS,
  qk,
  weekStartISO,
  type Activity,
  type Goal,
  type GoalType,
  type Job,
  type Salesperson,
} from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function fmt(n: number, type: GoalType) {
  if (type === "weekly_revenue" || type === "lifetime_revenue")
    return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  return Math.floor(n).toLocaleString();
}

function progressFor(goal: Goal, jobs: Job[], activity: Activity[]): number {
  const wk = weekStartISO();
  const personJobs = jobs.filter((j) => j.salesperson_id === goal.salesperson_id && j.status === "approved");
  const personActivity = activity.filter((a) => a.salesperson_id === goal.salesperson_id);
  switch (goal.goal_type) {
    case "weekly_revenue":
      return personJobs.filter((j) => j.closed_at >= wk).reduce((s, j) => s + j.revenue, 0);
    case "weekly_jobs":
      return personJobs.filter((j) => j.closed_at >= wk).length;
    case "weekly_doors":
      return personActivity.filter((a) => a.log_date >= wk).reduce((s, a) => s + a.doors_knocked, 0);
    case "weekly_appts":
      return personActivity.filter((a) => a.log_date >= wk).reduce((s, a) => s + a.appointments_set, 0);
    case "lifetime_revenue":
      return personJobs.reduce((s, j) => s + j.revenue, 0);
  }
}

export function MyGoals({
  me,
  goals,
  jobs,
  activity,
}: {
  me: Salesperson;
  goals: Goal[];
  jobs: Job[];
  activity: Activity[];
}) {
  const my = goals.filter((g) => g.salesperson_id === me.id);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<GoalType>("weekly_revenue");
  const [target, setTarget] = useState("");

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("goals").insert({
        salesperson_id: me.id,
        goal_type: type,
        target: Number(target),
        period_start: type.startsWith("weekly_") ? weekStartISO() : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.goals });
      setTarget("");
      setOpen(false);
      toast.success("Goal set");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("goals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.goals }),
  });

  return (
    <div className="rounded-2xl border border-border/60 bg-card-gradient p-6 shadow-card">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-gold" />
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Personal targets</div>
            <h3 className="font-display text-xl font-semibold">My goals</h3>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm"><Plus className="h-4 w-4" /> Add goal</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>Set a new goal</DialogTitle></DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-1.5">
                <Label>Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as GoalType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(GOAL_TYPE_LABELS) as GoalType[]).map((t) => (
                      <SelectItem key={t} value={t}>{GOAL_TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Target</Label>
                <Input type="number" min="1" value={target} onChange={(e) => setTarget(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button variant="gold" disabled={!target || add.isPending} onClick={() => add.mutate()}>
                {add.isPending ? "Saving…" : "Save goal"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {my.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No goals yet. Set one to track your weekly hustle.
        </p>
      ) : (
        <div className="space-y-3">
          {my.map((g) => {
            const cur = progressFor(g, jobs, activity);
            const pct = Math.min(100, (cur / g.target) * 100);
            return (
              <div key={g.id} className="rounded-xl border border-border/60 bg-background/40 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium">{GOAL_TYPE_LABELS[g.goal_type]}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {fmt(cur, g.goal_type)} / <span className="text-foreground">{fmt(g.target, g.goal_type)}</span>
                    </span>
                    <Button variant="ghost" size="icon" onClick={() => del.mutate(g.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
                <Progress value={pct} className="mt-2 h-2" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
