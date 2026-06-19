import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { JOB_TYPES, qk, todayISO, type Salesperson } from "@/lib/db";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Salesman-facing submit. Always inserts as `pending` for their own salesperson row. */
export function SubmitJobDialog({ me }: { me: Salesperson }) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [jobType, setJobType] = useState<string>("driveway");
  const [revenue, setRevenue] = useState("");
  const [hours, setHours] = useState("");
  const [closedAt, setClosedAt] = useState(todayISO());

  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) throw new Error("Not signed in");
      const { error } = await supabase.from("jobs").insert({
        salesperson_id: me.id,
        submitted_by: uid,
        status: "pending",
        description: description.trim(),
        job_type: jobType,
        revenue: Number(revenue),
        hours: Number(hours),
        closed_at: closedAt,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.jobs });
      toast.success("Request sent to your manager for approval");

      setDescription("");
      setRevenue("");
      setHours("");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const disabled = !description.trim() || !revenue || !hours;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="gold" size="lg">
          <Plus /> Request job approval
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Request job approval</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Fill in the details below. Your manager will review the receipt and approve it before
            it counts on the leaderboard.
          </p>
        </DialogHeader>

        <div className="grid gap-4">
          <Field label="Job type">
            <Select value={jobType} onValueChange={setJobType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {JOB_TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Description">
            <Textarea
              placeholder="e.g. 2-story house wash + back deck"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={300}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Revenue ($)">
              <Input type="number" min="0" step="0.01" value={revenue} onChange={(e) => setRevenue(e.target.value)} />
            </Field>
            <Field label="Hours">
              <Input type="number" min="0" step="0.25" value={hours} onChange={(e) => setHours(e.target.value)} />
            </Field>
          </div>
          <Field label="Date closed">
            <Input type="date" value={closedAt} onChange={(e) => setClosedAt(e.target.value)} />
          </Field>
          <p className="text-xs text-muted-foreground">
            Submitted as <span className="text-foreground font-medium">{me.name}</span>. A manager
            will review and approve before it counts on the leaderboard.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="gold" disabled={disabled || m.isPending} onClick={() => m.mutate()}>
            {m.isPending ? "Sending request…" : "Send request"}
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
