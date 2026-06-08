/**
 * Route Preloader - Prefetch likely navigation targets
 * Uses IntersectionObserver and mouse/touch hints for smart preloading.
 *
 * Supports two kinds of matchers:
 *  - Exact paths ("/shop")           → preload when matched
 *  - Prefix patterns ("/product/")   → any href starting with the prefix preloads the same chunk
 */

type Loader = () => Promise<unknown>;

// Exact-path routes (preload triggers on hover/visibility of this exact URL)
const exactRoutes: Record<string, Loader> = {
  '/shop': () => import('@/pages/Shop'),
  '/cart': () => import('@/pages/Cart'),
  '/checkout': () => import('@/pages/Checkout'),
  '/account': () => import('@/pages/customer/CustomerAccount'),
  '/orders': () => import('@/pages/customer/Orders'),
  '/wishlist': () => import('@/pages/Wishlist'),
  '/account/rewards': () => import('@/pages/customer/Rewards'),
  '/spin-to-win': () => import('@/pages/SpinToWin'),
  '/flash-sales': () => import('@/pages/FlashSales'),
  '/auth': () => import('@/pages/Auth'),
};

// Prefix-pattern routes (any href starting with the prefix preloads the chunk once)
const prefixRoutes: Array<{ prefix: string; loader: Loader; key: string }> = [
  { prefix: '/product/', key: 'product-detail', loader: () => import('@/pages/ProductDetail') },
  { prefix: '/store/',   key: 'vendor-store',  loader: () => import('@/pages/VendorStorefront') },
  { prefix: '/orders/',  key: 'order-detail',  loader: () => import('@/pages/customer/OrderDetail') },
];

const preloadedKeys = new Set<string>();

function schedule(loader: Loader) {
  if ('requestIdleCallback' in window) {
    (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(() => {
      void loader();
    });
  } else {
    setTimeout(() => void loader(), 100);
  }
}

/** Preload the chunk that owns the given path. */
export function preloadRoute(path: string): void {
  if (typeof window === 'undefined' || !path) return;
  const normalizedPath = path.split('?')[0].split('#')[0];

  const exactLoader = exactRoutes[normalizedPath];
  if (exactLoader && !preloadedKeys.has(normalizedPath)) {
    preloadedKeys.add(normalizedPath);
    schedule(exactLoader);
    return;
  }

  for (const { prefix, loader, key } of prefixRoutes) {
    if (normalizedPath.startsWith(prefix) && !preloadedKeys.has(key)) {
      preloadedKeys.add(key);
      schedule(loader);
      return;
    }
  }
}

/** Preload chunks for any internal `<a>` the user is about to engage with. */
export function setupLinkPreloading(): void {
  if (typeof window === 'undefined') return;

  const handleInteraction = (e: Event) => {
    const target = e.target as HTMLElement | null;
    const link = target?.closest('a[href^="/"]') as HTMLAnchorElement | null;
    if (!link) return;
    const href = link.getAttribute('href');
    if (href) preloadRoute(href);
  };

  document.addEventListener('mouseover', handleInteraction, { passive: true });
  document.addEventListener('touchstart', handleInteraction, { passive: true });
  document.addEventListener('focus', handleInteraction, { passive: true, capture: true });

  // Visibility-based preloading: when an internal link scrolls into view, preload its chunk.
  // Crucial for grids of product cards on Shop/Home — by the time a user taps a card,
  // the ProductDetail chunk is already cached.
  if ('IntersectionObserver' in window) {
    const seenLinks = new WeakSet<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const href = (entry.target as HTMLAnchorElement).getAttribute('href');
          if (href) preloadRoute(href);
          io.unobserve(entry.target);
        }
      },
      { rootMargin: '300px 0px', threshold: 0 }
    );

    const observeNewLinks = () => {
      const links = document.querySelectorAll<HTMLAnchorElement>('a[href^="/"]');
      links.forEach((link) => {
        if (seenLinks.has(link)) return;
        seenLinks.add(link);
        io.observe(link);
      });
    };

    // Initial pass + observe DOM mutations so newly-rendered cards get tracked
    observeNewLinks();
    const mo = new MutationObserver(() => {
      if ('requestIdleCallback' in window) {
        (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(observeNewLinks);
      } else {
        setTimeout(observeNewLinks, 200);
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }
}

/** Preload the most commonly-navigated routes after first paint. */
export function preloadCriticalRoutes(): void {
  if (typeof window === 'undefined') return;
  const run = () => {
    preloadRoute('/shop');
    preloadRoute('/cart');
    preloadRoute('/product/_'); // primes ProductDetail chunk via prefix match
  };
  if ('requestIdleCallback' in window) {
    (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(run);
  } else {
    setTimeout(run, 2000);
  }
}
