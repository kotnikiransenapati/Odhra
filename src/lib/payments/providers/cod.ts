import { supabase } from "@/integrations/supabase/client";
import type { PaymentProvider } from "../types";

/** Cash on Delivery — server creates a pending COD record; no browser UI. */
export const codProvider: PaymentProvider = {
  id: "cod",
  label: "Cash on Delivery",

  isAvailable({ amountMinor, currency }) {
    if (currency.toUpperCase() !== "INR") return false;
    // Project rule: COD cap ₹50,000 (5,000,000 paise).
    return amountMinor <= 50_00_000;
  },

  async createIntent(input) {
    const { data, error } = await supabase.functions.invoke("create-cod-order", {
      body: {
        order_id: input.orderId,
        amount: input.amountMinor,
        currency: input.currency,
        idempotency_key: input.idempotencyKey,
      },
    });
    if (error) throw new Error(error.message || "Failed to register COD order");
    return { intentId: input.orderId, raw: data as Record<string, unknown> };
  },

  async collect(intent) {
    // COD has no interactive collection step.
    return { status: "pending", reason: "cod_awaiting_delivery" };
  },
};
