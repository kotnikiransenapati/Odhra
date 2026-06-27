import { supabase } from "@/integrations/supabase/client";
import type { DeliveryReceipt, NotificationEvent, NotificationProvider } from "../types";

export const pushProvider: NotificationProvider = {
  id: "webpush",
  channel: "push",

  canHandle(event) {
    return Boolean(event.recipient.userId || event.recipient.pushEndpoint);
  },

  async send(event): Promise<DeliveryReceipt> {
    try {
      const { data, error } = await supabase.functions.invoke("send-push-notification", {
        body: {
          user_id: event.recipient.userId,
          endpoint: event.recipient.pushEndpoint,
          type: event.type,
          payload: event.data,
          idempotency_key: event.idempotencyKey,
        },
      });
      if (error) throw error;
      return {
        channel: "push",
        status: "sent",
        provider: this.id,
        providerMessageId: (data as any)?.id,
      };
    } catch (err: any) {
      return {
        channel: "push",
        status: "failed",
        provider: this.id,
        error: err?.message ?? String(err),
      };
    }
  },
};
