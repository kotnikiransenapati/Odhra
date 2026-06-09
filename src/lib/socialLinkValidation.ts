// Social link normalization & validation utilities.
// Accepts either a full URL or a bare handle (e.g. "@mybrand") and returns
// a canonical absolute URL plus a structured validity verdict.

export type SocialPlatform = 'website' | 'instagram' | 'facebook' | 'twitter';

export interface ValidationResult {
  ok: boolean;
  value: string; // normalized canonical URL (empty if input empty)
  error?: string;
}

const HANDLE_RE = /^[A-Za-z0-9._-]{1,30}$/;
const URL_RE = /^https?:\/\/[^\s]+$/i;

const BASES: Record<Exclude<SocialPlatform, 'website'>, string> = {
  instagram: 'https://instagram.com/',
  facebook: 'https://facebook.com/',
  twitter: 'https://x.com/',
};

const HOSTS: Record<Exclude<SocialPlatform, 'website'>, RegExp> = {
  instagram: /(^|\.)instagram\.com$/i,
  facebook: /(^|\.)(facebook|fb)\.com$/i,
  twitter: /(^|\.)(twitter|x)\.com$/i,
};

export function normalizeSocialLink(
  platform: SocialPlatform,
  raw: string
): ValidationResult {
  const input = (raw ?? '').trim();
  if (!input) return { ok: true, value: '' };

  if (platform === 'website') {
    const candidate = URL_RE.test(input) ? input : `https://${input}`;
    try {
      const u = new URL(candidate);
      if (!/^https?:$/.test(u.protocol)) {
        return { ok: false, value: input, error: 'Must be http(s) URL' };
      }
      if (!u.hostname.includes('.')) {
        return { ok: false, value: input, error: 'Enter a valid domain' };
      }
      return { ok: true, value: u.toString().replace(/\/$/, '') };
    } catch {
      return { ok: false, value: input, error: 'Invalid URL' };
    }
  }

  // bare handle (optionally prefixed with @)
  const handle = input.replace(/^@/, '');
  if (HANDLE_RE.test(handle) && !handle.includes('/') && !handle.includes('.')) {
    return { ok: true, value: BASES[platform] + handle };
  }

  // full URL
  const candidate = URL_RE.test(input) ? input : `https://${input}`;
  try {
    const u = new URL(candidate);
    if (!HOSTS[platform].test(u.hostname)) {
      return {
        ok: false,
        value: input,
        error: `Must be a ${platform} link or @handle`,
      };
    }
    return { ok: true, value: u.toString().replace(/\/$/, '') };
  } catch {
    return { ok: false, value: input, error: 'Invalid link or handle' };
  }
}

export function validateSocialLinks(links: Record<SocialPlatform, string>) {
  const errors: Partial<Record<SocialPlatform, string>> = {};
  const normalized: Record<SocialPlatform, string> = {
    website: '',
    instagram: '',
    facebook: '',
    twitter: '',
  };
  (Object.keys(links) as SocialPlatform[]).forEach((k) => {
    const r = normalizeSocialLink(k, links[k] || '');
    normalized[k] = r.value;
    if (!r.ok && r.error) errors[k] = r.error;
  });
  return { errors, normalized, isValid: Object.keys(errors).length === 0 };
}
