import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ProductNote {
  id: string;
  user_id: string;
  product_id: string;
  note: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductNoteWithProduct extends ProductNote {
  product: {
    id: string;
    title: string;
    slug: string | null;
    images: string[] | null;
    price: number;
  } | null;
}

const KEY = ["product_notes"] as const;

/** All notes for the current user (with product join). */
export function useProductNotes() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...KEY, user?.id],
    enabled: !!user,
    queryFn: async (): Promise<ProductNoteWithProduct[]> => {
      const { data, error } = await supabase
        .from("product_notes")
        .select(
          `id, user_id, product_id, note, pinned, created_at, updated_at,
           product:products!product_notes_product_id_fkey(id, title, slug, images, price)`
        )
        .order("pinned", { ascending: false })
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ProductNoteWithProduct[];
    },
  });
}

/** Single note lookup for a product (for PDP). */
export function useProductNote(productId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...KEY, "single", user?.id, productId],
    enabled: !!user && !!productId,
    queryFn: async (): Promise<ProductNote | null> => {
      const { data, error } = await supabase
        .from("product_notes")
        .select("*")
        .eq("product_id", productId!)
        .maybeSingle();
      if (error) throw error;
      return (data as ProductNote) ?? null;
    },
  });
}

/** Create / update note (upsert by user+product). */
export function useUpsertProductNote() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { product_id: string; note: string; pinned?: boolean }) => {
      if (!user) throw new Error("Sign in required");
      const trimmed = input.note.trim();
      if (!trimmed) throw new Error("Note cannot be empty");
      if (trimmed.length > 2000) throw new Error("Note too long (max 2000)");
      const { data, error } = await supabase
        .from("product_notes")
        .upsert(
          {
            user_id: user.id,
            product_id: input.product_id,
            note: trimmed,
            pinned: input.pinned ?? false,
          },
          { onConflict: "user_id,product_id" }
        )
        .select()
        .single();
      if (error) throw error;
      return data as ProductNote;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Note saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useTogglePinProductNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (note: ProductNote) => {
      const { error } = await supabase
        .from("product_notes")
        .update({ pinned: !note.pinned })
        .eq("id", note.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteProductNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Note removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
