import { supabase } from "@/integrations/supabase/client";
import type { PaymentIntent, PaymentIntentInput, PaymentProvider, PaymentResult } from "../types";

/**
 * Loads the Razorpay Checkout script once. Resolves true when window.Razorpay exists.
 */
function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if ((window as any).Razorpay) return resolve(true);
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(true), { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
}

export const razorpayProvider: PaymentProvider = {
  id: "razorpay",
  label: "Razorpay (Cards / UPI / Netbanking)",

  isAvailable({ currency }) {
    return currency.toUpperCase() === "INR";
  },

  async createIntent(input: PaymentIntentInput): Promise<PaymentIntent> {
    const { data, error } = await supabase.functions.invoke("create-razorpay-order", {
      body: {
        order_id: input.orderId,
        amount: input.amountMinor,
        currency: input.currency,
        idempotency_key: input.idempotencyKey,
        metadata: input.metadata ?? {},
      },
    });
    if (error) throw new Error(error.message || "Failed to create Razorpay order");
    const payload = data as { razorpay_order_id: string; key_id: string; amount: number };
    if (!payload?.razorpay_order_id) throw new Error("Razorpay order id missing in response");
    return { intentId: payload.razorpay_order_id, publicKey: payload.key_id, raw: payload };
  },

  collect(intent, input) {
    return new Promise<PaymentResult>(async (resolve) => {
      const ok = await loadRazorpayScript();
      if (!ok) {
        return resolve({
          status: "failed",
          code: "script_load_failed",
          message: "Could not load Razorpay Checkout.",
        });
      }
      const rzp = new (window as any).Razorpay({
        key: intent.publicKey,
        amount: input.amountMinor,
        currency: input.currency,
        name: "Odhra",
        description: `Order ${input.orderId}`,
        order_id: intent.intentId,
        prefill: {
          name: input.customer.name,
          email: input.customer.email,
          contact: input.customer.phone,
        },
        theme: { color: "#0F172A" },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const { error } = await supabase.functions.invoke("verify-razorpay-payment", {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                order_id: input.orderId,
              },
            });
            if (error) {
              return resolve({
                status: "failed",
                code: "verification_failed",
                message: error.message,
              });
            }
            resolve({
              status: "paid",
              providerPaymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              raw: response,
            });
          } catch (e: any) {
            resolve({
              status: "failed",
              code: "verification_exception",
              message: e?.message ?? "Verification failed",
            });
          }
        },
        modal: { ondismiss: () => resolve({ status: "cancelled" }) },
      });
      rzp.open();
    });
  },
};
