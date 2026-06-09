import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type ListType = "wishlist" | "registry" | "gift" | "project" | "custom";

export interface CustomList {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  list_type: ListType;
  is_public: boolean;
  share_slug: string | null;
  cover_image_url: string | null;
  event_date: string | null;
  created_at: string;
  updated_at: string;
  item_count?: number;
}

export interface CustomListItem {
  id: string;
  list_id: string;
  product_id: string;
  quantity: number;
  note: string | null;
  position: number;
  product: {
    id: string;
    title: string;
    slug: string | null;
    price: number;
    product_images: { url: string; is_primary: boolean | null }[];
  } | null;
}

export function useMyCustomLists() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["custom-lists", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_lists")
        .select("*, custom_list_items(count)")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((l: { custom_list_items?: { count: number }[] } & CustomList) => ({
        ...l,
        item_count: l.custom_list_items?.[0]?.count ?? 0,
      })) as CustomList[];
    },
  });
}

export function useCustomList(listId: string | undefined) {
  return useQuery({
    queryKey: ["custom-list", listId],
    enabled: !!listId,
    queryFn: async () => {
      const { data: list, error } = await supabase
        .from("custom_lists").select("*").eq("id", listId!).maybeSingle();
      if (error) throw error;
      const { data: items, error: ie } = await supabase
        .from("custom_list_items")
        .select(
          `id, list_id, product_id, quantity, note, position,
           product:products!custom_list_items_product_id_fkey(
             id, title, slug, price, product_images(url, is_primary)
           )`
        )
        .eq("list_id", listId!)
        .order("position", { ascending: true });
      if (ie) throw ie;
      return { list: list as CustomList | null, items: (items ?? []) as unknown as CustomListItem[] };
    },
  });
}

export function useCreateCustomList() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; list_type?: ListType; description?: string; is_public?: boolean }) => {
      if (!user) throw new Error("Sign in to create a list");
      const { data, error } = await supabase
        .from("custom_lists")
        .insert({
          user_id: user.id,
          name: input.name.trim(),
          list_type: input.list_type ?? "custom",
          description: input.description ?? null,
          is_public: input.is_public ?? false,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data!.id as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom-lists"] });
      toast.success("List created");
    },
    onError: (e: Error) => toast.error(e.message.replace(/^.*?: /, "")),
  });
}

export function useUpdateCustomList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; patch: Partial<Pick<CustomList, "name" | "description" | "is_public" | "list_type" | "event_date" | "cover_image_url">> }) => {
      const { error } = await supabase.from("custom_lists").update(args.patch).eq("id", args.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["custom-lists"] });
      qc.invalidateQueries({ queryKey: ["custom-list", vars.id] });
    },
    onError: (e: Error) => toast.error(e.message.replace(/^.*?: /, "")),
  });
}

export function useDeleteCustomList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("custom_lists").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom-lists"] });
      toast.success("List deleted");
    },
  });
}

export function useAddItemToList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { list_id: string; product_id: string; quantity?: number; note?: string }) => {
      const { error } = await supabase
        .from("custom_list_items")
        .upsert(
          {
            list_id: args.list_id,
            product_id: args.product_id,
            quantity: args.quantity ?? 1,
            note: args.note ?? null,
          },
          { onConflict: "list_id,product_id" }
        );
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["custom-list", vars.list_id] });
      qc.invalidateQueries({ queryKey: ["custom-lists"] });
      toast.success("Added to list");
    },
    onError: (e: Error) => toast.error(e.message.replace(/^.*?: /, "")),
  });
}

export function useRemoveItemFromList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; list_id: string }) => {
      const { error } = await supabase.from("custom_list_items").delete().eq("id", args.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["custom-list", vars.list_id] });
      qc.invalidateQueries({ queryKey: ["custom-lists"] });
    },
  });
}

/** Public lookup by share slug — readable for anon when list is public. */
export function usePublicCustomList(slug: string | undefined) {
  return useQuery({
    queryKey: ["public-custom-list", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data: list, error } = await supabase
        .from("custom_lists")
        .select("*")
        .eq("share_slug", slug!)
        .eq("is_public", true)
        .maybeSingle();
      if (error) throw error;
      if (!list) return { list: null, items: [] as CustomListItem[] };
      const { data: items, error: ie } = await supabase
        .from("custom_list_items")
        .select(
          `id, list_id, product_id, quantity, note, position,
           product:products!custom_list_items_product_id_fkey(
             id, title, slug, price, product_images(url, is_primary)
           )`
        )
        .eq("list_id", list.id)
        .order("position", { ascending: true });
      if (ie) throw ie;
      return { list: list as CustomList, items: (items ?? []) as unknown as CustomListItem[] };
    },
  });
}
