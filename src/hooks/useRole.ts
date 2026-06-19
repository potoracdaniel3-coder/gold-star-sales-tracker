import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "manager" | "viewer";

export function useRole() {
  return useQuery({
    queryKey: ["my-role"],
    queryFn: async (): Promise<AppRole> => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return "viewer";
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid);
      if (error) return "viewer";
      const roles = (data ?? []).map((r) => r.role as AppRole);
      return roles.includes("manager") ? "manager" : "viewer";
    },
    staleTime: 5 * 60 * 1000,
  });
}
