/**
 * Payment provider registry.
 *
 * Single entry point for the rest of the app:
 *   import { getPaymentProvider, listAvailableProviders } from "@/lib/payments";
 *
 * Adding a new provider is a one-line registration here plus a file under
 * ./providers — no consumer changes needed.
 */

import { codProvider } from "./providers/cod";
import { razorpayProvider } from "./providers/razorpay";
import type { PaymentMethodId, PaymentProvider } from "./types";

export * from "./types";

const REGISTRY: Record<PaymentMethodId, PaymentProvider | undefined> = {
  razorpay: razorpayProvider,
  cod: codProvider,
  stripe: undefined, // reserved — enable via payments--enable_stripe_payments
  gift_card: undefined,
};

export function getPaymentProvider(id: PaymentMethodId): PaymentProvider {
  const provider = REGISTRY[id];
  if (!provider) throw new Error(`Payment provider "${id}" is not registered`);
  return provider;
}

export function listAvailableProviders(ctx: {
  amountMinor: number;
  currency: string;
}): PaymentProvider[] {
  return Object.values(REGISTRY)
    .filter((p): p is PaymentProvider => Boolean(p))
    .filter((p) => p.isAvailable(ctx));
}

/** Generate a stable idempotency key for a given order + method pair. */
export function paymentIdempotencyKey(orderId: string, method: PaymentMethodId): string {
  return `pay_${method}_${orderId}`;
}
