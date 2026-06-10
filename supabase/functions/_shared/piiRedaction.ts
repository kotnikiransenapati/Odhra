// PII redaction utility — scrub sensitive data before logging or persisting error payloads.
// Shared between edge functions and the browser via re-export from src/lib/piiRedaction.ts
//
// Patterns covered:
//  - Email addresses
//  - Indian mobile numbers (+91 / 10-digit, 6-9 start)
//  - Credit card-like 13–19 digit sequences
//  - JWT tokens (eyJ...header.payload.signature)
//  - Bearer / api-key style headers
//  - Razorpay key/order/payment ids (rzp_*, order_*, pay_*)
//  - Long hex secrets (>=32 chars)
//  - Generic 6-digit OTP / Aadhaar (12-digit) numbers

const EMAIL_RE = /([A-Za-z0-9._%+-]+)@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
const INDIAN_PHONE_RE = /(?:\+?91[-\s]?)?[6-9]\d{9}\b/g;
const CARD_RE = /\b(?:\d[ -]*?){13,19}\b/g;
const JWT_RE = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
const BEARER_RE = /(authorization|api[_-]?key|x-api-key|cookie|set-cookie)\s*[:=]\s*("?)([^"\s,}]+)\2/gi;
const RAZORPAY_RE = /\b(rzp_(?:live|test)_[A-Za-z0-9]+|(?:order|pay|rfnd|qr|plink)_[A-Za-z0-9]{10,})\b/g;
const HEX_SECRET_RE = /\b[a-f0-9]{32,}\b/gi;
const AADHAAR_RE = /\b\d{4}\s?\d{4}\s?\d{4}\b/g;
const OTP_RE = /\b(?:otp|code)[:\s=]+(\d{4,8})\b/gi;
const IP_RE = /\b(\d{1,3}\.){3}\d{1,3}\b/g;

function maskEmail(_m: string, user: string, domain: string): string {
  const visible = user.slice(0, Math.min(2, user.length));
  return `${visible}***@${domain}`;
}

function maskPhone(m: string): string {
  const digits = m.replace(/\D/g, '');
  if (digits.length < 4) return '[phone]';
  return `***${digits.slice(-4)}`;
}

function maskCard(m: string): string {
  const digits = m.replace(/\D/g, '');
  if (digits.length < 12) return m; // not a card
  return `****${digits.slice(-4)}`;
}

/** Redact PII from a single string. */
export function redactString(input: string): string {
  if (!input) return input;
  return input
    .replace(BEARER_RE, (_m, k) => `${k}=[REDACTED]`)
    .replace(JWT_RE, '[JWT_REDACTED]')
    .replace(RAZORPAY_RE, '[RZP_ID]')
    .replace(AADHAAR_RE, '[AADHAAR]')
    .replace(OTP_RE, (_m, _o) => 'otp=[REDACTED]')
    .replace(CARD_RE, maskCard)
    .replace(EMAIL_RE, maskEmail)
    .replace(INDIAN_PHONE_RE, maskPhone)
    .replace(IP_RE, '[IP]')
    .replace(HEX_SECRET_RE, '[SECRET]');
}

const SENSITIVE_KEYS = new Set([
  'password', 'pwd', 'pass', 'secret', 'token', 'access_token', 'refresh_token',
  'api_key', 'apikey', 'authorization', 'auth', 'cookie', 'set-cookie',
  'razorpay_key_secret', 'webhook_secret', 'private_key', 'client_secret',
  'card', 'card_number', 'cvv', 'cvc', 'pin', 'otp', 'aadhaar', 'pan',
  'ssn', 'bank_account', 'account_number', 'ifsc',
]);

/** Recursively redact PII inside an object/array. Drops sensitive keys entirely (set to [REDACTED]). */
export function redactObject<T>(value: T, depth = 0): T {
  if (depth > 8 || value == null) return value;
  if (typeof value === 'string') return redactString(value) as unknown as T;
  if (typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    return value.map((v) => redactObject(v, depth + 1)) as unknown as T;
  }

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) {
      out[k] = '[REDACTED]';
    } else {
      out[k] = redactObject(v, depth + 1);
    }
  }
  return out as unknown as T;
}

/** Convenience: redact arbitrary value (string | object | unknown). */
export function redact<T>(value: T): T {
  if (typeof value === 'string') return redactString(value) as unknown as T;
  return redactObject(value);
}
