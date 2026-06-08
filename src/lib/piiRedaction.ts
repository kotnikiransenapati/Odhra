/**
 * PII redaction utilities for safe logging.
 * Strips emails, phone numbers, card numbers, JWT/Bearer tokens, OTPs,
 * Razorpay IDs, and common secrets before they hit error_logs / audit_logs / analytics.
 *
 * Keep this fast — it runs on every error log path.
 */

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
// Indian phone (with/without +91) and generic 10-15 digit phone runs
const PHONE_RE = /(?:\+?\d[\s-]?){10,15}/g;
// Naive PAN/credit-card-like 13-19 digit runs
const CARD_RE = /\b(?:\d[ -]?){13,19}\b/g;
// JWT-like xxx.yyy.zzz
const JWT_RE = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g;
// Bearer / api key headers
const BEARER_RE = /Bearer\s+[A-Za-z0-9._-]+/gi;
// Razorpay ids
const RZP_RE = /\b(?:order|pay|rfnd|sub|plan|qr)_[A-Za-z0-9]{10,}\b/g;
// Aadhaar (12 digits in groups)
const AADHAAR_RE = /\b\d{4}\s?\d{4}\s?\d{4}\b/g;
// IPv4
const IPV4_RE = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;

const SENSITIVE_KEYS = new Set([
  'password', 'passwd', 'pwd', 'token', 'access_token', 'refresh_token',
  'authorization', 'auth', 'apikey', 'api_key', 'secret', 'client_secret',
  'cookie', 'set-cookie', 'session', 'otp', 'pin', 'cvv', 'card_number',
  'card', 'pan', 'aadhaar', 'gstin', 'email', 'phone', 'mobile',
  'razorpay_signature', 'razorpay_payment_id', 'razorpay_order_id',
]);

export function redactString(input: string): string {
  if (!input) return input;
  return input
    .replace(JWT_RE, '[REDACTED_JWT]')
    .replace(BEARER_RE, 'Bearer [REDACTED]')
    .replace(EMAIL_RE, '[REDACTED_EMAIL]')
    .replace(AADHAAR_RE, '[REDACTED_AADHAAR]')
    .replace(CARD_RE, '[REDACTED_CARD]')
    .replace(PHONE_RE, (m) => (m.replace(/\D/g, '').length >= 10 ? '[REDACTED_PHONE]' : m))
    .replace(RZP_RE, '[REDACTED_RZP_ID]')
    .replace(IPV4_RE, '[REDACTED_IP]');
}

export function redactObject<T>(value: T, depth = 0): T {
  if (value == null || depth > 6) return value;
  if (typeof value === 'string') return redactString(value) as unknown as T;
  if (Array.isArray(value)) {
    return value.map((v) => redactObject(v, depth + 1)) as unknown as T;
  }
  if (typeof value === 'object') {
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
  return value;
}
