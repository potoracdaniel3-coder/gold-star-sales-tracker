import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Activity as ActivityIcon } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { qk, todayISO, type Salesperson } from "@/lib/db";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AddActivityDialog({ salespeople }: { salespeople: Salesperson[] }) {
  const [open, setOpen] = useState(false);
  const [salespersonId, setSalespersonId] = useState(salespeople[0]?.id ?? "");
  const [logDate, setLogDate] = useState(todayISO());
  const [doors, setDoors] = useState("");
  const [appts, setAppts] = useState("");

  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: async () => {
      // Upsert by (salesperson_id, log_date)
      const { error } = await supabase
        .from("activity_log")
        .upsert(
          {
            salesperson_id: salespersonId,
            log_date: logDate,
            doors_knocked: Number(doors || 0),
            appointments_set: Number(appts || 0),
          },
          { onConflict: "salesperson_id,log_date" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.activity });
      toast.success("Activity logged");
      setDoors("");
      setAppts("");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const disabled = !salespersonId || (!doors && !appts);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg" disabled={salespeople.length === 0}>
          <ActivityIcon /> Log activity
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Daily activity</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Salesperson">
            <Select value={salespersonId} onValueChange={setSalespersonId}>
              <SelectTrigger><SelectValue placeholder="Pick one" /></SelectTrigger>
              <SelectContent>
                {salespeople.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Date">
            <Input type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Doors knocked">
              <Input type="number" min="0" value={doors} onChange={(e) => setDoors(e.target.value)} />
            </Field>
            <Field label="Appointments set">
              <Input type="number" min="0" value={appts} onChange={(e) => setAppts(e.target.value)} />
            </Field>
          </div>
          <p className="text-xs text-muted-foreground">
            Re-logging the same day overwrites the previous values.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="gold" disabled={disabled || m.isPending} onClick={() => m.mutate()}>
            {m.isPending ? "Saving…" : "Save activity"}
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
