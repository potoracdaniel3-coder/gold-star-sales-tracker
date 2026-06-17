import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { qk, type Salesperson } from "@/lib/db";
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

const PALETTE = ["#d4af37", "#9b8cff", "#5ce1e6", "#f97373", "#7ee29c", "#f7b955", "#c084fc"];

export function ManageSalespeopleDialog({ salespeople }: { salespeople: Salesperson[] }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(PALETTE[0]);
  const qc = useQueryClient();

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("salespeople").insert({ name: name.trim(), color });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.salespeople });
      setName("");
      toast.success("Added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("salespeople").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.salespeople });
      qc.invalidateQueries({ queryKey: qk.jobs });
      qc.invalidateQueries({ queryKey: qk.activity });
      toast.success("Removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg"><UserPlus /> Team</Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Team</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          {salespeople.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/40 p-3">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-md font-semibold"
                style={{ backgroundColor: p.color + "33", color: p.color }}
              >
                {p.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 font-medium">{p.name}</div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (confirm(`Remove ${p.name}? This deletes their jobs and activity.`)) del.mutate(p.id);
                }}
              >
                <Trash2 className="text-destructive" />
              </Button>
            </div>
          ))}
          {salespeople.length === 0 && (
            <div className="text-sm text-muted-foreground">No team members yet.</div>
          )}
        </div>

        <div className="mt-2 grid gap-3 border-t border-border/60 pt-4">
          <Label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Add new</Label>
          <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          <div className="flex gap-2">
            {PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`h-8 w-8 rounded-full transition-transform ${color === c ? "ring-2 ring-offset-2 ring-offset-card ring-gold scale-110" : ""}`}
                style={{ backgroundColor: c }}
                aria-label={`color ${c}`}
              />
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Close</Button>
          <Button variant="gold" disabled={!name.trim() || add.isPending} onClick={() => add.mutate()}>
            {add.isPending ? "Adding…" : "Add salesperson"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
