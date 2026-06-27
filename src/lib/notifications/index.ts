/**
 * Notification router.
 *
 * Fans out a single `NotificationEvent` to every channel that:
 *   1. The event explicitly prefers (or all channels if not specified), AND
 *   2. The provider says it can handle, AND
 *   3. The recipient is reachable on.
 *
 * Providers are intentionally additive — adding WhatsApp / SMS is a 1-file
 * change and a registry entry.
 */
import { emailProvider } from "./providers/email";
import { inAppProvider } from "./providers/inapp";
import { pushProvider } from "./providers/push";
import type {
  DeliveryReceipt,
  NotificationChannel,
  NotificationEvent,
  NotificationProvider,
} from "./types";

const REGISTRY: NotificationProvider[] = [inAppProvider, emailProvider, pushProvider];

export function getProvider(channel: NotificationChannel): NotificationProvider | undefined {
  return REGISTRY.find((p) => p.channel === channel);
}

export async function notify(event: NotificationEvent): Promise<DeliveryReceipt[]> {
  const wanted = new Set<NotificationChannel>(
    event.preferredChannels ?? (REGISTRY.map((p) => p.channel) as NotificationChannel[]),
  );
  const eligible = REGISTRY.filter((p) => wanted.has(p.channel) && p.canHandle(event));
  if (eligible.length === 0) return [];
  return Promise.all(eligible.map((p) => p.send(event)));
}

export type {
  DeliveryReceipt,
  NotificationChannel,
  NotificationEvent,
  NotificationProvider,
} from "./types";
