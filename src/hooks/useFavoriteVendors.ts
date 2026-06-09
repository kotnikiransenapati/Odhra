import { useCallback, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface FavoriteVendorRow {
  id: string;
  vendor_id: string;
  notify_new_products: boolean;
  notify_sales: boolean;
  created_at: string;
  vendor: {
    id: string;
    brand_name: string | null;
    slug: string | null;
    logo_url: string | null;
    is_verified: boolean | null;
  } | null;
}

export function useFavoriteVendors() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["favorite-vendors", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorite_vendors")
        .select(
          `id, vendor_id, notify_new_products, notify_sales, created_at,
           vendor:vendors_public!favorite_vendors_vendor_id_fkey(id, brand_name, slug, logo_url, is_verified)`
        )
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as FavoriteVendorRow[];
    },
  });
}

/** Lightweight check used by the Follow button on storefronts. */
export function useIsVendorFavorited(vendorId: string | undefined) {
  const { user } = useAuth();
  const [isFav, setIsFav] = useState(false);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user || !vendorId) {
      setIsFav(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("favorite_vendors")
      .select("id")
      .eq("user_id", user.id)
      .eq("vendor_id", vendorId)
      .maybeSingle();
    setIsFav(!!data);
    setLoading(false);
  }, [user, vendorId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { isFav, loading, refresh, setIsFav };
}

export function useToggleFavoriteVendor() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vendorId: string) => {
      if (!user) throw new Error("Sign in to follow sellers");
      const { data: existing } = await supabase
        .from("favorite_vendors")
        .select("id")
        .eq("user_id", user.id)
        .eq("vendor_id", vendorId)
        .maybeSingle();
      if (existing) {
        const { error } = await supabase.from("favorite_vendors").delete().eq("id", existing.id);
        if (error) throw error;
        return { followed: false };
      }
      const { error } = await supabase.from("favorite_vendors").insert({
        user_id: user.id,
        vendor_id: vendorId,
      });
      if (error) throw error;
      return { followed: true };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["favorite-vendors"] });
      toast.success(res.followed ? "Following seller" : "Unfollowed seller");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUnfollowVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("favorite_vendors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["favorite-vendors"] }),
  });
}

export function useUpdateFavoriteVendorPrefs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; notify_new_products?: boolean; notify_sales?: boolean }) => {
      const { id, ...patch } = args;
      const { error } = await supabase.from("favorite_vendors").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["favorite-vendors"] }),
  });
}
