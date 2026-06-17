import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { qk, type Job, type Salesperson } from "@/lib/db";
import { Button } from "@/components/ui/button";

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function RecentJobs({
  jobs,
  salespeople,
  limit = 12,
}: {
  jobs: Job[];
  salespeople: Salesperson[];
  limit?: number;
}) {
  const map = useMemo(() => new Map(salespeople.map((p) => [p.id, p])), [salespeople]);
  const qc = useQueryClient();

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("jobs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.jobs });
      toast.success("Job removed");
    },
  });

  const rows = jobs.slice(0, limit);

  return (
    <div className="rounded-2xl border border-border/60 bg-card-gradient p-6 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Activity feed</div>
          <h3 className="font-display text-xl font-semibold">Recent jobs</h3>
        </div>
        <span className="text-xs text-muted-foreground">{jobs.length} total</span>
      </div>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No jobs yet — hit “Add job” to record the first one.
        </p>
      ) : (
        <div className="divide-y divide-border/40">
          {rows.map((j) => {
            const p = map.get(j.salesperson_id);
            return (
              <div key={j.id} className="group flex items-center gap-4 py-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-sm font-semibold"
                  style={{ backgroundColor: (p?.color ?? "#888") + "33", color: p?.color ?? "#888" }}
                >
                  {p?.name.charAt(0).toUpperCase() ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">
                    {p?.name ?? "Unknown"} · <span className="capitalize text-muted-foreground">{j.job_type}</span>
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{j.description}</div>
                </div>
                <div className="hidden text-right sm:block">
                  <div className="text-xs text-muted-foreground">{j.closed_at}</div>
                  <div className="text-xs text-muted-foreground">{j.hours}h</div>
                </div>
                <div className="text-right">
                  <div className="font-display text-lg font-semibold text-gold">{fmt(j.revenue)}</div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100"
                  onClick={() => {
                    if (confirm("Delete this job?")) del.mutate(j.id);
                  }}
                >
                  <Trash2 className="text-destructive" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
