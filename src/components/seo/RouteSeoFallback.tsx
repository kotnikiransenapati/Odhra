import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { resolveRoutePreset } from "@/lib/seo/routePresets";

const MANAGED_ID = "route-seo-fallback-robots";
const SITE_NAME = "Odhra";

/**
 * Mounted once globally. Whenever the route changes, applies sane SEO
 * defaults: forces noindex on private/transactional routes, and supplies a
 * fallback document title. Runs BEFORE page-level <SEOHead /> effects (because
 * children effects run after parents on mount, but on route change React
 * unmounts the previous page first, so this runs synchronously with the new
 * route) — but page-level SEOHead components always overwrite via the same
 * meta keys, so this is a true fallback rather than an override.
 */
export function RouteSeoFallback() {
  const { pathname } = useLocation();

  useEffect(() => {
    const preset = resolveRoutePreset(pathname);

    // Clean any previously injected fallback robots tag
    const existing = document.getElementById(MANAGED_ID);
    if (existing) existing.remove();

    if (!preset) return;

    if (preset.noIndex) {
      // Use a managed tag so we can clean it up on route change
      const meta = document.createElement("meta");
      meta.id = MANAGED_ID;
      meta.setAttribute("name", "robots");
      meta.setAttribute("content", "noindex, nofollow");
      document.head.appendChild(meta);

      // Also clear any stale robots tag without our id that may say index
      document
        .querySelectorAll('meta[name="robots"]')
        .forEach((el) => { if (el.id !== MANAGED_ID) el.remove(); });
    }

    // Fallback title — only set if document title is empty or the generic shell
    const currentTitle = document.title?.trim() ?? "";
    if (preset.title && (!currentTitle || currentTitle === SITE_NAME)) {
      document.title = `${preset.title} | ${SITE_NAME}`;
    }
  }, [pathname]);

  return null;
}

export default RouteSeoFallback;
