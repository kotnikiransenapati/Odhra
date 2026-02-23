const DEFAULT_PUBLIC_SITE_URL = "https://odhra1.lovable.app";

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

export function getSiteBaseUrl(options?: { preferPublishedInPreview?: boolean }): string {
  const fallback = normalizeBaseUrl(DEFAULT_PUBLIC_SITE_URL) ?? DEFAULT_PUBLIC_SITE_URL;

  if (typeof window === "undefined") {
    return fallback;
  }

  const currentBase = normalizeBaseUrl(window.location.origin) ?? fallback;
  const preferPublishedInPreview = options?.preferPublishedInPreview ?? false;

  if (preferPublishedInPreview && isPreviewHostname(window.location.hostname)) {
    return fallback;
  }

  return currentBase;
}

export function toAbsoluteUrl(
  pathOrUrl: string,
  options?: { preferPublishedInPreview?: boolean }
): string {
  const baseUrl = getSiteBaseUrl(options);

  try {
    const resolved = new URL(pathOrUrl, baseUrl);
    if (isPreviewHostname(resolved.hostname)) {
      return new URL(`${resolved.pathname}${resolved.search}${resolved.hash}`, baseUrl).toString();
    }
    return resolved.toString();
  } catch {
    return new URL("/", baseUrl).toString();
  }
}
