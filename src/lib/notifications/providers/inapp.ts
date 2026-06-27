import { supabase } from "@/integrations/supabase/client";
import type { DeliveryReceipt, NotificationEvent, NotificationProvider } from "../types";

/**
 * Writes directly to `public.notifications` so the in-app bell renders it via
 * the existing realtime subscription.
 */
export const inAppProvider: NotificationProvider = {
  id: "inapp-db",
  channel: "inapp",

  canHandle(event) {
    return Boolean(event.recipient.userId);
  },

  async send(event): Promise<DeliveryReceipt> {
    if (!event.recipient.userId) {
      return { channel: "inapp", status: "skipped", provider: this.id, error: "no userId" };
    }
    try {
      const { data, error } = await supabase
        .from("notifications")
        .insert([
          {
            user_id: event.recipient.userId,
            type: event.type,
            title: String(event.data.title ?? event.type),
            body: String(event.data.message ?? event.data.body ?? ""),
            data: event.data as any,
          },
        ])
        .select("id")
        .single();
      if (error) throw error;
      return {
        channel: "inapp",
        status: "sent",
        provider: this.id,
        providerMessageId: (data as any)?.id,
      };
    } catch (err: any) {
      return {
        channel: "inapp",
        status: "failed",
        provider: this.id,
        error: err?.message ?? String(err),
      };
    }
  },
};
