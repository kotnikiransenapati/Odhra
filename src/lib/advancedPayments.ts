/**
 * Batch K2 — Advanced Payments: UPI Intent + QR fallback, Net Banking, wallets
 * (Paytm / PhonePe / Amazon Pay), saved-card tokenization, retry-on-failure.
 *
 * This is a pure client-side helper layer over Razorpay Checkout. It does NOT
 * hold card numbers or any sensitive PCI data — tokenization is handled by
 * Razorpay (Network Tokenization, RBI-compliant) and we only persist the
 * `token` reference returned by their checkout.
 *
 * Pipeline:
 *   1. Edge function `create-razorpay-order` returns rzp_order_id (existing).
 *   2. openCheckout(...) is called with the desired method preference; Razorpay
 *      Checkout enforces the method via the `method` config.
 *   3. On success, `verify-razorpay-payment` (existing edge fn) verifies HMAC
 *      and marks the order paid.
 *   4. On failure, RetryController offers up to 2 retries with exponential
 *      jitter before falling back to COD nudge.
 */

import { loadRazorpayScript } from '@/utils/loadRazorpay';

export type PaymentMethod =
  | 'upi'         // collect VPA OR intent
  | 'upi-intent'  // app-to-app deep link (mobile only)
  | 'upi-qr'      // desktop QR fallback
  | 'netbanking'
  | 'wallet'      // paytm / phonepe / amazonpay / freecharge / mobikwik
  | 'card'        // first-time or saved
  | 'emi';

export type Wallet = 'paytm' | 'phonepe' | 'amazonpay' | 'freecharge' | 'mobikwik' | 'jiomoney';

export interface CheckoutContext {
  rzpKeyId: string;
  rzpOrderId: string;
  amountPaise: number;
  currency?: 'INR';
  name: string;
  description?: string;
  prefill: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  /** When `true`, opt in to RBI Network Tokenization so the card is saved. */
  saveCardAsToken?: boolean;
  /** Existing saved tokens to display as quick-pay tiles. */
  savedTokens?: SavedCardToken[];
}

export interface SavedCardToken {
  id: string;             // local id
  rzp_token_id: string;   // Razorpay token (`token_***`)
  last4: string;
  network: 'visa' | 'mastercard' | 'rupay' | 'amex' | 'diners';
  expiry: string;         // MM/YY
  nickname?: string;
}

export interface CheckoutResult {
  ok: boolean;
  rzp_payment_id?: string;
  rzp_order_id?: string;
  rzp_signature?: string;
  method?: PaymentMethod;
  error?: { code: string; description: string; reason?: string; step?: string };
}

interface RazorpayOptions {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  prefill?: Record<string, string | undefined>;
  notes?: Record<string, string>;
  theme?: { color?: string };
  method?: Record<string, boolean | string | object>;
  config?: { display?: { hide?: Array<{ method: string }>; preferences?: { show_default_blocks?: boolean } } };
  handler: (resp: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => void;
  modal?: { ondismiss?: () => void; escape?: boolean; backdropclose?: boolean };
}

interface RazorpayCheckout {
  open(): void;
  on(event: string, cb: (resp: { error: { code: string; description: string; reason?: string; step?: string } }) => void): void;
}

declare global {
  interface Window {
    Razorpay?: new (opts: RazorpayOptions) => RazorpayCheckout;
  }
}

/* -------------------------------------------------------------------------- */
/* Build a method-restricted Razorpay Checkout config                          */
/* -------------------------------------------------------------------------- */

function buildMethodConfig(method: PaymentMethod, wallet?: Wallet, token?: SavedCardToken): Pick<RazorpayOptions, 'method' | 'config'> {
  const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  switch (method) {
    case 'upi':
      return { method: { upi: true, netbanking: false, card: false, wallet: false, emi: false, paylater: false } };

    case 'upi-intent':
      return {
        method: {
          upi: { flow: 'intent' } as object,
          netbanking: false, card: false, wallet: false, emi: false, paylater: false,
        },
      };

    case 'upi-qr':
      return {
        method: {
          upi: { flow: isMobile ? 'collect' : 'qr' } as object,
          netbanking: false, card: false, wallet: false, emi: false, paylater: false,
        },
      };

    case 'netbanking':
      return { method: { netbanking: true, upi: false, card: false, wallet: false, emi: false, paylater: false } };

    case 'wallet':
      return {
        method: {
          wallet: wallet ? ({ [wallet]: true } as object) : true,
          upi: false, netbanking: false, card: false, emi: false, paylater: false,
        },
      };

    case 'card':
      return {
        method: {
          card: token ? ({ token: token.rzp_token_id } as object) : true,
          upi: false, netbanking: false, wallet: false, emi: false, paylater: false,
        },
      };

    case 'emi':
      return { method: { emi: true, card: false, upi: false, netbanking: false, wallet: false, paylater: false } };
  }
}

/* -------------------------------------------------------------------------- */
/* Public API: openCheckout                                                    */
/* -------------------------------------------------------------------------- */

export async function openCheckout(
  ctx: CheckoutContext,
  method: PaymentMethod,
  opts: { wallet?: Wallet; savedToken?: SavedCardToken } = {},
): Promise<CheckoutResult> {
  await loadRazorpayScript();
  if (!window.Razorpay) return { ok: false, error: { code: 'rzp_unavailable', description: 'Razorpay failed to load' } };

  const methodCfg = buildMethodConfig(method, opts.wallet, opts.savedToken);

  return await new Promise<CheckoutResult>((resolve) => {
    let resolved = false;
    const settle = (r: CheckoutResult) => { if (!resolved) { resolved = true; resolve(r); } };

    const options: RazorpayOptions = {
      key: ctx.rzpKeyId,
      order_id: ctx.rzpOrderId,
      amount: ctx.amountPaise,
      currency: ctx.currency ?? 'INR',
      name: ctx.name,
      description: ctx.description,
      prefill: ctx.prefill,
      notes: {
        ...(ctx.notes ?? {}),
        save_card_token: ctx.saveCardAsToken ? '1' : '0',
      },
      theme: ctx.theme,
      ...methodCfg,
      handler: (resp) => settle({
        ok: true, method,
        rzp_payment_id: resp.razorpay_payment_id,
        rzp_order_id: resp.razorpay_order_id,
        rzp_signature: resp.razorpay_signature,
      }),
      modal: { ondismiss: () => settle({ ok: false, error: { code: 'user_cancelled', description: 'Checkout closed' } }) },
    };

    const rzp = new window.Razorpay!(options);
    rzp.on('payment.failed', (resp) => settle({ ok: false, method, error: resp.error }));
    rzp.open();
  });
}

/* -------------------------------------------------------------------------- */
/* Retry controller                                                            */
/* -------------------------------------------------------------------------- */

export interface RetryDecision {
  shouldRetry: boolean;
  delayMs: number;
  attempt: number;
  fallbackToCod: boolean;
}

const NON_RETRYABLE = new Set([
  'BAD_REQUEST_ERROR', 'GATEWAY_ERROR_PAYMENT_FAILED_AT_BANK',
  'PAYMENT_CANCELLED_BY_USER', 'user_cancelled',
]);

export function decideRetry(result: CheckoutResult, attempt: number): RetryDecision {
  const code = result.error?.code ?? '';
  if (result.ok) return { shouldRetry: false, delayMs: 0, attempt, fallbackToCod: false };
  if (NON_RETRYABLE.has(code) || attempt >= 2) {
    return { shouldRetry: false, delayMs: 0, attempt, fallbackToCod: attempt >= 2 };
  }
  // exp backoff with jitter: 400ms, 1.2s
  const base = 400 * Math.pow(3, attempt);
  const jitter = Math.floor(Math.random() * 200);
  return { shouldRetry: true, delayMs: base + jitter, attempt: attempt + 1, fallbackToCod: false };
}

export async function withRetry(
  open: () => Promise<CheckoutResult>,
  onAttempt?: (attempt: number, prev?: CheckoutResult) => void,
): Promise<CheckoutResult & { attempts: number; codSuggested: boolean }> {
  let attempt = 0;
  let prev: CheckoutResult | undefined;
  while (true) {
    onAttempt?.(attempt + 1, prev);
    const r = await open();
    if (r.ok) return { ...r, attempts: attempt + 1, codSuggested: false };
    const decision = decideRetry(r, attempt);
    if (!decision.shouldRetry) return { ...r, attempts: attempt + 1, codSuggested: decision.fallbackToCod };
    await new Promise((res) => setTimeout(res, decision.delayMs));
    attempt = decision.attempt;
    prev = r;
  }
}

/* -------------------------------------------------------------------------- */
/* Catalogue of supported wallets (used to render method tiles)                */
/* -------------------------------------------------------------------------- */

export const SUPPORTED_WALLETS: Array<{ id: Wallet; label: string }> = [
  { id: 'paytm',      label: 'Paytm' },
  { id: 'phonepe',    label: 'PhonePe' },
  { id: 'amazonpay',  label: 'Amazon Pay' },
  { id: 'freecharge', label: 'Freecharge' },
  { id: 'mobikwik',   label: 'Mobikwik' },
  { id: 'jiomoney',   label: 'JioMoney' },
];
