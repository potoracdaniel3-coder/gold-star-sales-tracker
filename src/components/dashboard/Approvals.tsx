import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { qk, type Job, type Salesperson } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function Approvals({ jobs, salespeople }: { jobs: Job[]; salespeople: Salesperson[] }) {
  const map = useMemo(() => new Map(salespeople.map((p) => [p.id, p])), [salespeople]);
  const pending = jobs.filter((j) => j.status === "pending");
  const qc = useQueryClient();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const approve = useMutation({
    mutationFn: async (id: string) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("jobs")
        .update({ status: "approved", reviewer_id: u.user?.id, reviewed_at: new Date().toISOString(), reject_reason: null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.jobs });
      toast.success("Approved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reject = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("jobs")
        .update({ status: "rejected", reviewer_id: u.user?.id, reviewed_at: new Date().toISOString(), reject_reason: reason || null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.jobs });
      setRejectingId(null);
      setReason("");
      toast.success("Rejected");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="rounded-2xl border border-border/60 bg-card-gradient p-6 shadow-card">
      <div className="mb-4">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Pending receipts</div>
        <h3 className="font-display text-xl font-semibold">
          Approvals <span className="text-muted-foreground">({pending.length})</span>
        </h3>
      </div>
      {pending.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No pending submissions.</p>
      ) : (
        <div className="space-y-3">
          {pending.map((j) => {
            const p = map.get(j.salesperson_id);
            return (
              <div key={j.id} className="rounded-xl border border-border/60 bg-background/40 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-md font-semibold"
                    style={{ backgroundColor: (p?.color ?? "#888") + "33", color: p?.color ?? "#888" }}
                  >
                    {p?.name.charAt(0).toUpperCase() ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">
                      {p?.name ?? "Unknown"} · <span className="capitalize text-muted-foreground">{j.job_type}</span>
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{j.description}</div>
                    <div className="text-xs text-muted-foreground">closed {j.closed_at} · {j.hours}h</div>
                  </div>
                  <div className="font-display text-xl font-semibold text-gold">{fmt(j.revenue)}</div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="gold" onClick={() => approve.mutate(j.id)} disabled={approve.isPending}>
                      <Check className="h-4 w-4" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setRejectingId(j.id); setReason(""); }}>
                      <X className="h-4 w-4" /> Reject
                    </Button>
                  </div>
                </div>
                {rejectingId === j.id && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Input
                      placeholder="Reason (optional)"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      maxLength={200}
                      className="flex-1 min-w-[200px]"
                    />
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => reject.mutate({ id: j.id, reason })}
                      disabled={reject.isPending}
                    >
                      Confirm reject
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setRejectingId(null)}>Cancel</Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
