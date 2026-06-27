import { supabase } from "@/integrations/supabase/client";
import type { DeliveryReceipt, NotificationEvent, NotificationProvider } from "../types";

/**
 * Email channel — delegates to the `send-email` Edge Function, which already
 * handles Resend, templating, and delivery ledger writes.
 */
export const emailProvider: NotificationProvider = {
  id: "resend",
  channel: "email",

  canHandle(event) {
    return Boolean(event.recipient.email);
  },

  async send(event): Promise<DeliveryReceipt> {
    if (!event.recipient.email) {
      return { channel: "email", status: "skipped", provider: this.id, error: "no email" };
    }
    try {
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: {
          to: event.recipient.email,
          type: event.type,
          data: event.data,
          idempotency_key: event.idempotencyKey,
          locale: event.recipient.locale,
        },
      });
      if (error) throw error;
      return {
        channel: "email",
        status: "sent",
        provider: this.id,
        providerMessageId: (data as any)?.id,
      };
    } catch (err: any) {
      return {
        channel: "email",
        status: "failed",
        provider: this.id,
        error: err?.message ?? String(err),
      };
    }
  },
};
