import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Salesperson } from "@/lib/db";

/** The currently signed-in salesperson row (linked by user_id), if any. */
export function useMe() {
  return useQuery({
    queryKey: ["me-salesperson"],
    queryFn: async (): Promise<Salesperson | null> => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) return null;
      const { data, error } = await supabase
        .from("salespeople")
        .select("*")
        .eq("user_id", uid)
        .maybeSingle();
      if (error) return null;
      return (data as unknown as Salesperson) ?? null;
    },
    staleTime: 60 * 1000,
  });
}
