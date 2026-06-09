import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface StyleProfile {
  user_id: string;
  top_size: string | null;
  bottom_size: string | null;
  dress_size: string | null;
  shoe_size: string | null;
  preferred_fit: "slim" | "regular" | "loose" | null;
  favorite_colors: string[];
  avoid_materials: string[];
  gifting_for_others: boolean;
  created_at: string;
  updated_at: string;
}

export type StyleProfileInput = Partial<
  Omit<StyleProfile, "user_id" | "created_at" | "updated_at">
>;

const KEY = ["style_profile"] as const;

export function useStyleProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...KEY, user?.id],
    enabled: !!user,
    queryFn: async (): Promise<StyleProfile | null> => {
      const { data, error } = await supabase
        .from("style_profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as StyleProfile) ?? null;
    },
  });
}

export function useSaveStyleProfile() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: StyleProfileInput) => {
      if (!user) throw new Error("Sign in required");
      const payload = {
        user_id: user.id,
        ...input,
        favorite_colors: input.favorite_colors ?? [],
        avoid_materials: input.avoid_materials ?? [],
      };
      const { data, error } = await supabase
        .from("style_profiles")
        .upsert(payload, { onConflict: "user_id" })
        .select()
        .single();
      if (error) throw error;
      return data as StyleProfile;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Style profile saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
