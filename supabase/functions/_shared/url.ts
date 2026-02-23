const DEFAULT_PUBLIC_SITE_URL = Deno.env.get("SITE_URL") || "https://odhra1.lovable.app";

const PREVIEW_HOST_PATTERNS = ["lovableproject.com", "id-preview--", "preview--"];

const normalizeBaseUrl = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
};

export const isPreviewHostname = (hostname: string): boolean => {
  const normalized = hostname.toLowerCase();
  return PREVIEW_HOST_PATTERNS.some((pattern) => normalized.includes(pattern));
};

export const resolveAppBaseUrl = (options?: { siteUrl?: string }): string => {
  const fromInput = normalizeBaseUrl(options?.siteUrl);
  if (fromInput) return fromInput;

  const fromEnv = normalizeBaseUrl(Deno.env.get("SITE_URL"));
  if (fromEnv) return fromEnv;

  return normalizeBaseUrl(DEFAULT_PUBLIC_SITE_URL) ?? "https://odhra1.lovable.app";
};

export const buildAppUrl = (
  baseUrl: string,
  path: string,
  params?: Record<string, string | number | boolean | null | undefined>
): string => {
  const normalizedBase = resolveAppBaseUrl({ siteUrl: baseUrl });
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(normalizedPath, normalizedBase);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
};

export const normalizeIncomingUrl = (
  value: unknown,
  baseUrl: string
): string | null => {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const parsed = new URL(value, baseUrl);

    if (isPreviewHostname(parsed.hostname)) {
      return buildAppUrl(baseUrl, `${parsed.pathname}${parsed.search}${parsed.hash}`);
    }

    return parsed.toString();
  } catch {
    return null;
  }
};
