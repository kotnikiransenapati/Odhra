/**
 * Notification adapter contract.
 *
 * Channels are pluggable so we can route the same `NotificationEvent` to
 * email, SMS, WhatsApp, Web Push, or in-app surfaces without changing call
 * sites. Each provider decides whether a given event is deliverable on its
 * channel.
 */
export type NotificationChannel = "email" | "sms" | "whatsapp" | "push" | "inapp";

export interface NotificationRecipient {
  userId?: string;
  email?: string;
  phone?: string;
  /** Web Push subscription endpoint when using the push channel. */
  pushEndpoint?: string;
  locale?: string;
}

export interface NotificationEvent {
  /** Stable event identifier — drives templating + analytics. */
  type: string;
  recipient: NotificationRecipient;
  data: Record<string, unknown>;
  /**
   * Optional idempotency key so retries don't double-send. Providers persist
   * this in `outbound_webhook_deliveries` / their own ledger.
   */
  idempotencyKey?: string;
  /** Hint for the router — if omitted, all enabled channels evaluate. */
  preferredChannels?: NotificationChannel[];
}

export interface DeliveryReceipt {
  channel: NotificationChannel;
  status: "queued" | "sent" | "skipped" | "failed";
  provider: string;
  providerMessageId?: string;
  error?: string;
}

export interface NotificationProvider {
  readonly id: string;
  readonly channel: NotificationChannel;
  canHandle(event: NotificationEvent): boolean;
  send(event: NotificationEvent): Promise<DeliveryReceipt>;
}
