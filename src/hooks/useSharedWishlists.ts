import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface SharedWishlist {
  id: string;
  share_code: string;
  title: string;
  description: string | null;
  is_public: boolean;
  view_count: number;
  created_at: string;
}

const KEY = (uid?: string) => ["shared-wishlists", uid];

function genCode(len = 10) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => chars[b % chars.length]).join("");
}

export function useSharedWishlists() {
  const { user } = useAuth();
  return useQuery({
    queryKey: KEY(user?.id),
    enabled: !!user,
    queryFn: async (): Promise<SharedWishlist[]> => {
      const { data, error } = await supabase
        .from("shared_wishlists")
        .select("id, share_code, title, description, is_public, view_count, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SharedWishlist[];
    },
  });
}

export function useCreateSharedWishlist() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; description?: string; is_public?: boolean }) => {
      if (!user) throw new Error("Sign in required");
      const payload = {
        user_id: user.id,
        share_code: genCode(),
        title: input.title.trim().slice(0, 80) || "My Wishlist",
        description: input.description?.trim().slice(0, 280) || null,
        is_public: input.is_public ?? true,
      };
      const { data, error } = await supabase
        .from("shared_wishlists")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as SharedWishlist;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY(user?.id) });
      toast.success("Share link created");
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not create share"),
  });
}

export function useUpdateSharedWishlist() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; is_public?: boolean; title?: string; description?: string | null }) => {
      const { id, ...patch } = input;
      const { error } = await supabase.from("shared_wishlists").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(user?.id) }),
  });
}

export function useDeleteSharedWishlist() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("shared_wishlists").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY(user?.id) });
      toast.success("Share link removed");
    },
  });
}

export interface PublicSharedWishlist {
  id: string;
  share_code: string;
  title: string;
  description: string | null;
  view_count: number;
  created_at: string;
  owner: { display_name?: string | null; avatar_url?: string | null };
  items: Array<{
    id: string;
    product_id: string;
    created_at: string;
    product: {
      id: string;
      title: string;
      slug: string | null;
      price: number;
      compare_at_price: number | null;
      stock: number;
      is_active: boolean;
      images: { url: string; is_primary: boolean | null }[];
    };
  }>;
}

export function usePublicSharedWishlist(shareCode?: string) {
  return useQuery({
    queryKey: ["public-shared-wishlist", shareCode],
    enabled: !!shareCode,
    queryFn: async (): Promise<PublicSharedWishlist | null> => {
      const { data, error } = await supabase.rpc("get_public_shared_wishlist", {
        _share_code: shareCode!,
      });
      if (error) throw error;
      if (data) {
        supabase.rpc("increment_shared_wishlist_view", { _share_code: shareCode! }).then(() => {});
      }
      return (data as unknown as PublicSharedWishlist | null) ?? null;
    },
  });
}
