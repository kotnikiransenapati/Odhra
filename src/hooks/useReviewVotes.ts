import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type VoteValue = "up" | "down";

const KEY = (productId: string) => ["review_votes", productId] as const;

/** Fetch the current user's votes for a set of review ids. Returns a map review_id -> vote. */
export function useMyReviewVotes(reviewIds: string[], productId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...KEY(productId), user?.id, reviewIds.slice().sort().join(",")],
    enabled: !!user && reviewIds.length > 0,
    queryFn: async (): Promise<Record<string, VoteValue>> => {
      const { data, error } = await supabase
        .from("review_votes")
        .select("review_id, vote")
        .in("review_id", reviewIds);
      if (error) throw error;
      const map: Record<string, VoteValue> = {};
      (data ?? []).forEach((r: { review_id: string; vote: string }) => {
        map[r.review_id] = r.vote as VoteValue;
      });
      return map;
    },
  });
}

/** Toggle a vote: same value clears, different value updates, none inserts. */
export function useVoteReview(productId: string) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { review_id: string; vote: VoteValue; current?: VoteValue }) => {
      if (!user) throw new Error("Sign in to vote");
      const { review_id, vote, current } = input;

      if (current === vote) {
        const { error } = await supabase
          .from("review_votes")
          .delete()
          .eq("review_id", review_id)
          .eq("user_id", user.id);
        if (error) throw error;
        return { cleared: true };
      }

      const { error } = await supabase
        .from("review_votes")
        .upsert(
          { review_id, user_id: user.id, vote },
          { onConflict: "review_id,user_id" }
        );
      if (error) throw error;
      return { cleared: false };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY(productId) });
      qc.invalidateQueries({ queryKey: ["reviews", productId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
