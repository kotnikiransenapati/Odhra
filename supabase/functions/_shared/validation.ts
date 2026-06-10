// Shared Zod schema registry for edge function payload validation.
// Pair with `_shared/errorEnvelope.ts` for uniform 400 responses on bad input.
//
// Usage:
//   import { z } from 'npm:zod@3.23.8';
//   import { validate, schemas } from '../_shared/validation.ts';
//   const body = await validate(schemas.uuidParam, await req.json(), ctx.requestId);
//
// On failure, throws EnvelopeError(VALIDATION) which `withEnvelope` turns into the standard 400 response.

import { z } from 'npm:zod@3.23.8';
import { EnvelopeError, ErrorCode } from './errorEnvelope.ts';

export { z };

// ---------- Reusable atoms ----------
export const uuid = z.string().uuid('must be a UUID');
export const positiveInt = z.number().int().positive();
export const nonEmpty = z.string().trim().min(1, 'required');
export const email = z.string().trim().toLowerCase().email();
export const isoDate = z.string().datetime({ offset: true });
export const url = z.string().url();
export const inrPaise = z.number().int().min(0); // amounts always in paise

// Strip HTML tags + cap length — defense-in-depth against XSS in stored fields
export const safeText = (max = 2000) =>
  z.string().trim().max(max).transform((s) => s.replace(/<[^>]*>/g, ''));

// Indian phone (10 digits, optional +91)
export const indianPhone = z
  .string()
  .trim()
  .regex(/^(?:\+?91)?[6-9]\d{9}$/, 'invalid Indian mobile number');

export const pincode = z.string().regex(/^[1-9]\d{5}$/, 'invalid 6-digit PIN code');

// ---------- Commonly-shared payload schemas ----------
export const schemas = {
  uuidParam: z.object({ id: uuid }),

  paginate: z.object({
    limit: z.coerce.number().int().min(1).max(200).default(50),
    offset: z.coerce.number().int().min(0).default(0),
  }),

  orderCreate: z.object({
    items: z.array(z.object({
      product_id: uuid,
      quantity: positiveInt.max(999),
      variant_id: uuid.optional(),
    })).min(1).max(100),
    shipping_address_id: uuid,
    payment_method: z.enum(['razorpay', 'cod', 'wallet']),
    promo_code: z.string().trim().max(50).optional(),
    notes: safeText(500).optional(),
  }),

  razorpayVerify: z.object({
    razorpay_order_id: nonEmpty,
    razorpay_payment_id: nonEmpty,
    razorpay_signature: nonEmpty,
    order_id: uuid,
  }),

  emailSend: z.object({
    to: z.union([email, z.array(email).min(1).max(50)]),
    subject: nonEmpty.max(200),
    html: nonEmpty.max(200_000),
    reply_to: email.optional(),
  }),

  shipmentTrack: z.object({
    awb: nonEmpty.max(60),
    carrier: z.enum(['indiapost', 'delhivery']),
  }),

  webhookGeneric: z.object({
    event_id: z.string().optional(),
    event_type: z.string().optional(),
  }).passthrough(),

  pincodeQuery: z.object({ pincode }),

  contactSubmit: z.object({
    name: nonEmpty.max(120),
    email,
    phone: indianPhone.optional(),
    subject: nonEmpty.max(200),
    message: safeText(5000),
  }),
} as const;

// ---------- Validator ----------
export async function validate<T extends z.ZodTypeAny>(
  schema: T,
  input: unknown,
  requestId?: string,
): Promise<z.infer<T>> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const flat = result.error.flatten();
    throw new EnvelopeError(ErrorCode.VALIDATION, 'Invalid request payload', {
      status: 400,
      details: {
        fieldErrors: flat.fieldErrors,
        formErrors: flat.formErrors,
        request_id: requestId,
      },
    });
  }
  return result.data;
}

export async function validateBody<T extends z.ZodTypeAny>(
  schema: T,
  req: Request,
  requestId?: string,
): Promise<z.infer<T>> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new EnvelopeError(ErrorCode.BAD_REQUEST, 'Body must be valid JSON', { status: 400 });
  }
  return validate(schema, json, requestId);
}

export function validateQuery<T extends z.ZodTypeAny>(
  schema: T,
  url: URL,
  requestId?: string,
): Promise<z.infer<T>> {
  return validate(schema, Object.fromEntries(url.searchParams), requestId);
}
