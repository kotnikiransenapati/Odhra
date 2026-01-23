/**
 * Image optimization utilities
 * Provides responsive image sizing and format optimization
 */

// Unsplash image optimization
export function optimizeUnsplashUrl(url: string, width: number = 400, quality: number = 80): string {
  if (!url || !url.includes('unsplash.com')) {
    return url;
  }
  
  // Remove existing size params and add optimized ones
  const baseUrl = url.split('?')[0];
  return `${baseUrl}?w=${width}&q=${quality}&fm=webp&fit=crop&auto=format`;
}

// Supabase storage image optimization
export function optimizeSupabaseUrl(url: string, width: number = 400, quality: number = 80): string {
  if (!url || !url.includes('supabase.co/storage')) {
    return url;
  }
  
  // Supabase supports transform via render API
  // Format: /render/image/public/{bucket}/{path}?width=X&quality=X
  const transformUrl = url.replace(
    '/storage/v1/object/public/',
    `/storage/v1/render/image/public/`
  );
  
  const separator = transformUrl.includes('?') ? '&' : '?';
  return `${transformUrl}${separator}width=${width}&quality=${quality}`;
}

// Generic image optimizer
export function optimizeImageUrl(url: string, size: 'thumbnail' | 'card' | 'medium' | 'large' = 'card'): string {
  if (!url) return '/placeholder.svg';
  
  const sizeMap = {
    thumbnail: { width: 100, quality: 70 },
    card: { width: 400, quality: 80 },
    medium: { width: 600, quality: 85 },
    large: { width: 1200, quality: 90 },
  };
  
  const { width, quality } = sizeMap[size];
  
  if (url.includes('unsplash.com')) {
    return optimizeUnsplashUrl(url, width, quality);
  }
  
  if (url.includes('supabase.co')) {
    return optimizeSupabaseUrl(url, width, quality);
  }
  
  return url;
}

// Generate srcSet for responsive images
export function generateSrcSet(url: string): string {
  if (!url || url === '/placeholder.svg') return '';
  
  const widths = [200, 400, 600, 800];
  
  if (url.includes('unsplash.com')) {
    return widths
      .map(w => `${optimizeUnsplashUrl(url, w)} ${w}w`)
      .join(', ');
  }
  
  return '';
}

// Lazy loading placeholder (tiny base64 blur)
export const BLUR_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PC9zdmc+';

// Preload critical images
export function preloadCriticalImages(urls: string[]): void {
  if (typeof window === 'undefined') return;
  
  urls.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = optimizeImageUrl(url, 'card');
    document.head.appendChild(link);
  });
}
