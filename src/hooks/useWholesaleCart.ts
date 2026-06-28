import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface WholesaleCartItem {
  id: string;
  cart_id: string;
  product_id: string;
  variant_id: string | null;
  qty: number;
  unit_price: number;
  gst_rate: number;
  line_total: number;
  product?: { name: string; image_url?: string | null } | null;
}

export interface WholesaleCart {
  id: string;
  user_id: string;
  account_id: string | null;
  po_number: string | null;
  requested_delivery_date: string | null;
  notes: string | null;
  status: string;
  subtotal: number;
  tax_total: number;
  grand_total: number;
}

const sb = supabase as any;

export function useWholesaleCart() {
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<WholesaleCart | null>(null);
  const [items, setItems] = useState<WholesaleCartItem[]>([]);

  const ensureCart = useCallback(async (): Promise<WholesaleCart | null> => {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return null;
    const { data: acc } = await sb
      .from("wholesaler_accounts")
      .select("id")
      .eq("user_id", uid)
      .maybeSingle();
    const accountId = acc?.id ?? null;

    const { data: existing } = await sb
      .from("wholesale_carts")
      .select("*")
      .eq("user_id", uid)
      .eq("status", "active")
      .maybeSingle();
    if (existing) return existing as WholesaleCart;

    const { data: created, error } = await sb
      .from("wholesale_carts")
      .insert({ user_id: uid, account_id: accountId })
      .select("*")
      .single();
    if (error) {
      toast.error("Could not create cart");
      return null;
    }
    return created as WholesaleCart;
  }, []);

  const recalcAndSave = useCallback(async (cartId: string) => {
    const { data: rows } = await sb
      .from("wholesale_cart_items")
      .select("qty, unit_price, gst_rate")
      .eq("cart_id", cartId);
    const list = (rows ?? []) as any[];
    const subtotal = list.reduce((s, r) => s + r.qty * Number(r.unit_price), 0);
    const tax = list.reduce(
      (s, r) => s + r.qty * Number(r.unit_price) * (Number(r.gst_rate) / 100),
      0,
    );
    const grand = subtotal + tax;
    await sb
      .from("wholesale_carts")
      .update({ subtotal, tax_total: tax, grand_total: grand })
      .eq("id", cartId);
    return { subtotal, tax_total: tax, grand_total: grand };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const c = await ensureCart();
      if (!c) {
        setCart(null);
        setItems([]);
        return;
      }
      const { data: rows } = await sb
        .from("wholesale_cart_items")
        .select("*, product:products(name,image_url)")
        .eq("cart_id", c.id)
        .order("created_at", { ascending: true });
      setItems((rows ?? []) as WholesaleCartItem[]);
      const totals = await recalcAndSave(c.id);
      setCart({ ...c, ...totals });
    } finally {
      setLoading(false);
    }
  }, [ensureCart, recalcAndSave]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addItem = useCallback(
    async (productId: string, qty: number, tier = "standard") => {
      const c = await ensureCart();
      if (!c) return;
      const { data: priceRow } = await sb.rpc("get_wholesale_unit_price", {
        _product_id: productId,
        _tier: tier,
        _qty: qty,
      });
      const unit_price = Number(priceRow ?? 0);
      if (!unit_price) {
        toast.error("No wholesale price set for this product/qty");
        return;
      }
      const { data: settings } = await sb
        .from("wholesale_product_settings")
        .select("gst_rate")
        .eq("product_id", productId)
        .maybeSingle();
      const gst_rate = Number(settings?.gst_rate ?? 0);
      const line_total = unit_price * qty * (1 + gst_rate / 100);

      const { data: existing } = await sb
        .from("wholesale_cart_items")
        .select("id, qty")
        .eq("cart_id", c.id)
        .eq("product_id", productId)
        .is("variant_id", null)
        .maybeSingle();

      if (existing) {
        const newQty = existing.qty + qty;
        const { data: newPrice } = await sb.rpc("get_wholesale_unit_price", {
          _product_id: productId,
          _tier: tier,
          _qty: newQty,
        });
        const up = Number(newPrice ?? unit_price);
        await sb
          .from("wholesale_cart_items")
          .update({
            qty: newQty,
            unit_price: up,
            line_total: up * newQty * (1 + gst_rate / 100),
          })
          .eq("id", existing.id);
      } else {
        await sb.from("wholesale_cart_items").insert({
          cart_id: c.id,
          product_id: productId,
          qty,
          unit_price,
          gst_rate,
          line_total,
        });
      }
      toast.success("Added to bulk cart");
      await refresh();
    },
    [ensureCart, refresh],
  );

  const updateQty = useCallback(
    async (itemId: string, qty: number) => {
      if (qty <= 0) {
        await sb.from("wholesale_cart_items").delete().eq("id", itemId);
      } else {
        const { data: row } = await sb
          .from("wholesale_cart_items")
          .select("product_id, gst_rate, cart_id")
          .eq("id", itemId)
          .single();
        if (row) {
          const { data: newPrice } = await sb.rpc("get_wholesale_unit_price", {
            _product_id: row.product_id,
            _tier: "standard",
            _qty: qty,
          });
          const up = Number(newPrice ?? 0);
          await sb
            .from("wholesale_cart_items")
            .update({
              qty,
              unit_price: up,
              line_total: up * qty * (1 + Number(row.gst_rate) / 100),
            })
            .eq("id", itemId);
        }
      }
      await refresh();
    },
    [refresh],
  );

  const updateMeta = useCallback(
    async (patch: Partial<Pick<WholesaleCart, "po_number" | "requested_delivery_date" | "notes">>) => {
      if (!cart) return;
      await sb.from("wholesale_carts").update(patch).eq("id", cart.id);
      setCart({ ...cart, ...patch });
    },
    [cart],
  );

  const submitForApproval = useCallback(async () => {
    if (!cart) return null;
    const { data: acc } = await sb
      .from("wholesaler_accounts")
      .select("id, credit_limit, credit_used")
      .eq("user_id", cart.user_id)
      .maybeSingle();
    if (!acc) {
      toast.error("Wholesaler account not found");
      return null;
    }
    const { error: cErr } = await sb
      .from("wholesale_carts")
      .update({ status: "submitted" })
      .eq("id", cart.id);
    if (cErr) {
      toast.error("Could not submit cart");
      return null;
    }
    const { data: approval, error } = await sb
      .from("wholesale_order_approvals")
      .insert({
        cart_id: cart.id,
        account_id: acc.id,
        requested_amount: cart.grand_total,
        credit_limit: acc.credit_limit ?? 0,
        outstanding_balance: acc.credit_used ?? 0,
      })
      .select("*")
      .single();
    if (error) {
      toast.error("Approval request failed");
      return null;
    }
    toast.success("Submitted for approval");
    await refresh();
    return approval;
  }, [cart, refresh]);

  return { loading, cart, items, addItem, updateQty, updateMeta, submitForApproval, refresh };
}
