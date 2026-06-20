import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PersonalizedRail {
  id: string;
  rail_key: string;
  title: string;
  product_ids: string[];
  score: number;
  algorithm: string;
  expires_at: string;
}

export function usePersonalizedRails(userId?: string | null) {
  return useQuery({
    queryKey: ["personalized-rails", userId],
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<PersonalizedRail[]> => {
      if (!userId) return [];
      const { data: cached } = await supabase
        .from("personalization_rails")
        .select("*")
        .eq("user_id", userId)
        .gt("expires_at", new Date().toISOString())
        .order("score", { ascending: false });

      if (cached && cached.length > 0) return cached as any;

      const { data } = await supabase.functions.invoke("compute-personalized-rails");
      return (data?.rails ?? []) as PersonalizedRail[];
    },
  });
}
