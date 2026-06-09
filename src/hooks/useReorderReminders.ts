import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ReorderReminderRow {
  id: string;
  product_id: string;
  interval_days: number;
  next_remind_at: string;
  last_reminded_at: string | null;
  enabled: boolean;
  notes: string | null;
  product: {
    id: string;
    title: string;
    slug: string | null;
    price: number;
    product_images: { url: string; is_primary: boolean | null }[];
  } | null;
}

export function useReorderReminders() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["reorder-reminders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reorder_reminders")
        .select(
          `id, product_id, interval_days, next_remind_at, last_reminded_at, enabled, notes,
           product:products!reorder_reminders_product_id_fkey(
             id, title, slug, price, product_images(url, is_primary)
           )`
        )
        .eq("user_id", user!.id)
        .order("next_remind_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ReorderReminderRow[];
    },
  });
}

export function useUpsertReorderReminder() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { product_id: string; interval_days: number; notes?: string }) => {
      if (!user) throw new Error("Sign in to set reminders");
      const { error } = await supabase
        .from("reorder_reminders")
        .upsert(
          {
            user_id: user.id,
            product_id: args.product_id,
            interval_days: args.interval_days,
            notes: args.notes ?? null,
            enabled: true,
          },
          { onConflict: "user_id,product_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reorder-reminders"] });
      toast.success("Reminder saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateReorderReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; interval_days?: number; enabled?: boolean; notes?: string }) => {
      const { id, ...patch } = args;
      const { error } = await supabase.from("reorder_reminders").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reorder-reminders"] }),
    onError: (e: Error) => toast.error(e.message.replace(/^.*?: /, "")),
  });
}

export function useDeleteReorderReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reorder_reminders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reorder-reminders"] });
      toast.success("Reminder removed");
    },
  });
}
