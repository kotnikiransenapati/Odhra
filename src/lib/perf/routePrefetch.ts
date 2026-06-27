/**
 * Route-level prefetching for likely-next navigations.
 * Uses requestIdleCallback to warm chunks without competing with paint.
 *
 * Strategy:
 *  - On home: prefetch shop + product + cart.
 *  - On shop: prefetch product + cart.
 *  - On product: prefetch cart + checkout.
 *  - On cart: prefetch checkout + order-success.
 *
 * Honors the user's Save-Data / 2G preference and skips prefetching when
 * the connection is metered or slow.
 */

type Importer = () => Promise<unknown>;

const PREFETCH_MAP: Record<string, Importer[]> = {
  "/": [
    () => import("@/pages/Shop"),
    () => import("@/pages/ProductDetail"),
    () => import("@/pages/Cart"),
  ],
  "/shop": [
    () => import("@/pages/ProductDetail"),
    () => import("@/pages/Cart"),
  ],
  "/product": [
    () => import("@/pages/Cart"),
    () => import("@/pages/Checkout"),
  ],
  "/cart": [
    () => import("@/pages/Checkout"),
    () => import("@/pages/OrderSuccess"),
  ],
  "/checkout": [() => import("@/pages/OrderSuccess")],
};

function shouldSkipPrefetch(): boolean {
  if (typeof navigator === "undefined") return true;
  const conn = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (!conn) return false;
  if (conn.saveData) return true;
  if (conn.effectiveType && /(^|-)(2g|slow-2g)$/.test(conn.effectiveType)) return true;
  return false;
}

function whenIdle(cb: () => void) {
  const w = window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };
  if (typeof w.requestIdleCallback === "function") {
    w.requestIdleCallback(cb, { timeout: 2500 });
  } else {
    setTimeout(cb, 1500);
  }
}

const prefetched = new Set<Importer>();

export function prefetchForRoute(pathname: string) {
  if (shouldSkipPrefetch()) return;
  // Match by first segment for dynamic routes like /product/:slug
  const key =
    pathname === "/"
      ? "/"
      : "/" + pathname.split("/").filter(Boolean)[0];
  const importers = PREFETCH_MAP[key];
  if (!importers || importers.length === 0) return;
  whenIdle(() => {
    importers.forEach((imp) => {
      if (prefetched.has(imp)) return;
      prefetched.add(imp);
      imp().catch(() => prefetched.delete(imp));
    });
  });
}
