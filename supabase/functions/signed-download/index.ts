// Edge function: signed-download
// Mints short-lived signed URLs for private storage buckets after
// authenticating the caller and verifying ownership rules per bucket.
//
// Request body: { bucket: string, path: string, expiresIn?: number (60..3600) }
// Response: { ok, data: { signed_url, expires_at } }

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { withEnvelope, ok, EnvelopeError, ErrorCode } from '../_shared/errorEnvelope.ts';
import { validateBody, schemas, z, nonEmpty } from '../_shared/validation.ts';
import { redactObject } from '../_shared/piiRedaction.ts';

const SignedDownloadSchema = z.object({
  bucket: z.enum(['vendor-documents', 'avatars', 'review-images', 'product-images', 'vendor-assets']),
  path: nonEmpty.max(1024),
  expiresIn: z.number().int().min(60).max(3600).default(300),
});

// Per-bucket ownership rule. Returns boolean (caller allowed).
async function authorize(
  admin: ReturnType<typeof createClient>,
  bucket: string,
  path: string,
  userId: string,
  isAdmin: boolean,
): Promise<boolean> {
  if (isAdmin) return true;

  switch (bucket) {
    case 'avatars':
      // Path convention: <user_id>/...
      return path.startsWith(`${userId}/`);

    case 'vendor-documents': {
      // Vendor's own docs only
      const { data } = await admin
        .from('vendors')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      if (!data?.id) return false;
      return path.startsWith(`${data.id}/`) || path.startsWith(`vendor-${data.id}/`);
    }

    case 'review-images': {
      // Reviewer can re-download their own review images: path convention <user_id>/...
      return path.startsWith(`${userId}/`);
    }

    case 'product-images':
    case 'vendor-assets':
      // Public buckets — only generate signed URL if caller wants a forced-download token
      return true;

    default:
      return false;
  }
}

serve(withEnvelope(async (req, ctx) => {
  if (req.method !== 'POST') {
    throw new EnvelopeError(ErrorCode.BAD_REQUEST, 'POST required');
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new EnvelopeError(ErrorCode.UNAUTHORIZED, 'Missing bearer token');
  }

  const body = await validateBody(SignedDownloadSchema, req, ctx.requestId);

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const token = authHeader.replace('Bearer ', '');
  const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claims?.claims?.sub) {
    throw new EnvelopeError(ErrorCode.UNAUTHORIZED, 'Invalid session');
  }
  const userId = claims.claims.sub as string;

  // Admin client for ownership lookups + URL signing
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  const { data: adminRow } = await admin
    .from('admin_users')
    .select('is_active')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();
  const isAdmin = !!adminRow;

  const allowed = await authorize(admin, body.bucket, body.path, userId, isAdmin);
  if (!allowed) {
    console.warn(`[${ctx.requestId}] download denied`, redactObject({ userId, bucket: body.bucket, path: body.path }));
    throw new EnvelopeError(ErrorCode.FORBIDDEN, 'You do not have access to this file');
  }

  const { data: signed, error: signErr } = await admin
    .storage
    .from(body.bucket)
    .createSignedUrl(body.path, body.expiresIn, { download: true });

  if (signErr || !signed?.signedUrl) {
    throw new EnvelopeError(ErrorCode.UPSTREAM, signErr?.message ?? 'Failed to sign URL');
  }

  // Audit
  await admin.from('audit_logs').insert({
    admin_id: isAdmin ? userId : null,
    action: 'storage.signed_download',
    entity_type: 'storage.object',
    entity_id: `${body.bucket}:${body.path}`,
    new_values: { expires_in: body.expiresIn, request_id: ctx.requestId },
  });

  return ok({
    signed_url: signed.signedUrl,
    expires_at: new Date(Date.now() + body.expiresIn * 1000).toISOString(),
  }, { requestId: ctx.requestId });
}));
