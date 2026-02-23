/**
 * Image optimization utilities
 * Provides responsive image sizing, WebP/AVIF format optimization, and srcSet generation
 */

// Size presets with responsive widths
const SIZE_PRESETS = {
  thumbnail: { width: 100, quality: 70, sizes: '80px' },
  card: { width: 400, quality: 80, sizes: '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw' },
  medium: { width: 600, quality: 85, sizes: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw' },
  large: { width: 1200, quality: 90, sizes: '(max-width: 640px) 100vw, 80vw' },
  hero: { width: 1920, quality: 85, sizes: '100vw' },
} as const;

export type ImageSize = keyof typeof SIZE_PRESETS;

// Responsive breakpoint widths for srcSet
const SRCSET_WIDTHS = [200, 400, 600, 800, 1200] as const;

// Unsplash image optimization with WebP
export function optimizeUnsplashUrl(url: string, width: number = 400, quality: number = 80): string {
  if (!url?.includes('unsplash.com')) return url;
  const baseUrl = url.split('?')[0];
  return `${baseUrl}?w=${width}&q=${quality}&fm=webp&fit=crop&auto=format`;
}

// Supabase storage image optimization
export function optimizeSupabaseUrl(url: string, width: number = 400, quality: number = 80): string {
  if (!url?.includes('supabase.co/storage')) return url;
  const transformUrl = url.replace(
    '/storage/v1/object/public/',
    `/storage/v1/render/image/public/`
  );
  const separator = transformUrl.includes('?') ? '&' : '?';
  return `${transformUrl}${separator}width=${width}&quality=${quality}&format=webp`;
}

// Generic image optimizer
export function optimizeImageUrl(url: string, size: ImageSize = 'card'): string {
  if (!url) return '/placeholder.svg';
  const { width, quality } = SIZE_PRESETS[size];
  if (url.includes('unsplash.com')) return optimizeUnsplashUrl(url, width, quality);
  if (url.includes('supabase.co')) return optimizeSupabaseUrl(url, width, quality);
  return url;
}

// Generate srcSet for responsive images (supports Unsplash AND Supabase)
export function generateSrcSet(url: string): string {
  if (!url || url === '/placeholder.svg') return '';

  if (url.includes('unsplash.com')) {
    return SRCSET_WIDTHS.map(w => `${optimizeUnsplashUrl(url, w)} ${w}w`).join(', ');
  }

  if (url.includes('supabase.co/storage')) {
    return SRCSET_WIDTHS.map(w => `${optimizeSupabaseUrl(url, w)} ${w}w`).join(', ');
  }

  return '';
}

// Get proper sizes attribute for a given image size preset
export function getImageSizes(size: ImageSize = 'card'): string {
  return SIZE_PRESETS[size].sizes;
}

// Lazy loading placeholder (tiny base64 blur)
export const BLUR_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PC9zdmc+';

// Preload critical images with fetchpriority
export function preloadCriticalImages(urls: string[]): void {
  if (typeof window === 'undefined') return;
  urls.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = optimizeImageUrl(url, 'card');
    link.setAttribute('fetchpriority', 'high');
    document.head.appendChild(link);
  });
}

// Check if browser supports modern image formats
export function supportsWebP(): boolean {
  if (typeof document === 'undefined') return false;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
}
