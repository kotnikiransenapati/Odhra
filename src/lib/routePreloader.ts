/**
 * Route Preloader - Prefetch likely navigation targets
 * Uses IntersectionObserver and mouse/touch hints for smart preloading
 */

// Map of routes to their lazy import functions
const routeModules: Record<string, () => Promise<unknown>> = {
  '/shop': () => import('@/pages/Shop'),
  '/cart': () => import('@/pages/Cart'),
  '/checkout': () => import('@/pages/Checkout'),
  '/account': () => import('@/pages/customer/CustomerAccount'),
  '/orders': () => import('@/pages/customer/Orders'),
  '/wishlist': () => import('@/pages/Wishlist'),
  '/account/rewards': () => import('@/pages/customer/Rewards'),
  '/spin-to-win': () => import('@/pages/SpinToWin'),
  '/flash-sales': () => import('@/pages/FlashSales'),
};

const preloadedRoutes = new Set<string>();

/**
 * Preload a route module
 */
export function preloadRoute(path: string): void {
  // Normalize path
  const normalizedPath = path.split('?')[0];
  
  if (preloadedRoutes.has(normalizedPath)) return;
  
  const loader = routeModules[normalizedPath];
  if (loader) {
    preloadedRoutes.add(normalizedPath);
    // Use requestIdleCallback for non-blocking preload
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => loader());
    } else {
      setTimeout(() => loader(), 100);
    }
  }
}

/**
 * Preload routes on link hover/focus
 */
export function setupLinkPreloading(): void {
  if (typeof window === 'undefined') return;

  const handleInteraction = (e: Event) => {
    const target = e.target as HTMLElement;
    const link = target.closest('a[href^="/"]');
    if (link) {
      const href = link.getAttribute('href');
      if (href) preloadRoute(href);
    }
  };

  // Preload on hover (desktop) or touchstart (mobile)
  document.addEventListener('mouseover', handleInteraction, { passive: true });
  document.addEventListener('touchstart', handleInteraction, { passive: true });
  document.addEventListener('focus', handleInteraction, { passive: true, capture: true });
}

/**
 * Preload critical routes after initial page load
 */
export function preloadCriticalRoutes(): void {
  if (typeof window === 'undefined') return;

  // Wait for idle time
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => {
      preloadRoute('/shop');
      preloadRoute('/cart');
    });
  } else {
    setTimeout(() => {
      preloadRoute('/shop');
      preloadRoute('/cart');
    }, 2000);
  }
}
