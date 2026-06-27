/**
 * Payment provider adapter contracts.
 *
 * Goal: any future provider (Razorpay, Stripe, Cashfree, PayU, COD, gift-card-only)
 * implements `PaymentProvider` and the rest of the app stays unchanged.
 *
 * The adapter is checkout-flow agnostic — it does not own cart math, address
 * validation, or order persistence. It only knows how to:
 *   1. Create a payment intent on the backend.
 *   2. Render/launch the provider UI in the browser.
 *   3. Confirm the result with the backend so the order can flip to `paid`.
 */

export type PaymentMethodId =
  | "razorpay"
  | "cod"
  | "stripe"
  | "gift_card";

export interface PaymentCustomer {
  name: string;
  email: string;
  phone: string;
  userId?: string | null;
}

export interface PaymentIntentInput {
  orderId: string;
  /** Amount in the smallest currency unit (paise for INR, cents for USD). */
  amountMinor: number;
  currency: string;
  customer: PaymentCustomer;
  /** Metadata persisted on the provider side; safe for non-PII keys only. */
  metadata?: Record<string, string | number | boolean>;
  idempotencyKey: string;
}

export interface PaymentIntent {
  /** Provider-side intent/order identifier. */
  intentId: string;
  /** Provider key/publishable token, when the browser needs it (e.g. Razorpay). */
  publicKey?: string;
  /** Raw provider payload — opaque to callers. */
  raw?: Record<string, unknown>;
}

export type PaymentResult =
  | { status: "paid"; providerPaymentId: string; signature?: string; raw?: unknown }
  | { status: "pending"; reason: string }
  | { status: "failed"; code: string; message: string; raw?: unknown }
  | { status: "cancelled" };

export interface PaymentProvider {
  readonly id: PaymentMethodId;
  readonly label: string;
  /**
   * True when the provider can be selected for this cart context.
   * E.g. COD blocked above ₹50k, gift-card only when covers full amount.
   */
  isAvailable(ctx: { amountMinor: number; currency: string }): boolean;
  /** Create the server-side intent (calls an edge function). */
  createIntent(input: PaymentIntentInput): Promise<PaymentIntent>;
  /** Launch the provider UI and resolve once the user has finished. */
  collect(intent: PaymentIntent, input: PaymentIntentInput): Promise<PaymentResult>;
}
