/**
 * Route-level SEO presets. Used by <RouteSeoFallback /> to ensure every route
 * has sane defaults — most importantly that private/transactional routes are
 * marked noindex so they never leak into search engines, and that public
 * routes without a page-level <SEOHead /> still get a reasonable title.
 */

export interface RoutePreset {
  /** Robots directive — defaults to "index, follow" when unset */
  noIndex?: boolean;
  /** Optional fallback title (page-level SEOHead always wins) */
  title?: string;
  /** Optional fallback description */
  description?: string;
}

interface RouteRule {
  test: (pathname: string) => boolean;
  preset: RoutePreset;
}

// Order matters: first matching rule wins.
const RULES: RouteRule[] = [
  // Private / transactional surfaces must never be indexed
  { test: (p) => p.startsWith("/admin"), preset: { noIndex: true, title: "Admin" } },
  { test: (p) => p.startsWith("/vendor"), preset: { noIndex: true, title: "Vendor" } },
  { test: (p) => p.startsWith("/cce"), preset: { noIndex: true, title: "Customer Care" } },
  { test: (p) => p.startsWith("/account"), preset: { noIndex: true, title: "My Account" } },
  { test: (p) => p.startsWith("/orders"), preset: { noIndex: true, title: "My Orders" } },
  { test: (p) => p.startsWith("/wallet"), preset: { noIndex: true, title: "Wallet" } },
  { test: (p) => p.startsWith("/wishlist"), preset: { noIndex: true } },
  { test: (p) => p.startsWith("/cart"), preset: { noIndex: true } },
  { test: (p) => p.startsWith("/checkout"), preset: { noIndex: true } },
  { test: (p) => p.startsWith("/order-success"), preset: { noIndex: true } },
  { test: (p) => p.startsWith("/track-order"), preset: { noIndex: true } },
  { test: (p) => p.startsWith("/support"), preset: { noIndex: true } },
  { test: (p) => p.startsWith("/settings"), preset: { noIndex: true } },
  { test: (p) => p.startsWith("/addresses"), preset: { noIndex: true } },
  { test: (p) => p.startsWith("/analytics"), preset: { noIndex: true } },
  { test: (p) => p.startsWith("/email-preferences"), preset: { noIndex: true } },
  { test: (p) => p.startsWith("/reset-password"), preset: { noIndex: true } },
  { test: (p) => p.startsWith("/admin-invite"), preset: { noIndex: true } },
  { test: (p) => p.startsWith("/healthz"), preset: { noIndex: true } },
  { test: (p) => p.startsWith("/offline"), preset: { noIndex: true } },

  // Public utility pages — keep indexable but provide a fallback title
  { test: (p) => p === "/install", preset: { title: "Install the App" } },
  { test: (p) => p === "/status", preset: { title: "System Status" } },
  { test: (p) => p === "/spin-to-win", preset: { title: "Spin & Win" } },
];

export function resolveRoutePreset(pathname: string): RoutePreset | null {
  for (const rule of RULES) {
    if (rule.test(pathname)) return rule.preset;
  }
  return null;
}
