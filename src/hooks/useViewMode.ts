import { useState, useEffect, useCallback } from 'react';

export type ViewMode = 'grid' | 'compact' | 'list';

const STORAGE_KEY = 'odhra_view_mode';
const SHOP_STORAGE_KEY = 'odhra_shop_view_mode';

// Page-specific default view modes
const PAGE_DEFAULTS: Record<string, ViewMode> = {
  '/shop': 'list', // List view default for shop - better for comparison shopping
};

interface UseViewModeOptions {
  pageKey?: string; // Optional page identifier for separate storage
}

export function useViewMode(defaultMode: ViewMode = 'grid', options: UseViewModeOptions = {}) {
  const { pageKey } = options;
  
  // Determine if we're on the shop page based on URL
  const [isShopPage] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname === '/shop' || window.location.pathname.startsWith('/shop');
    }
    return false;
  });
  
  // Determine which storage key and default to use
  const storageKey = pageKey === 'shop' || isShopPage ? SHOP_STORAGE_KEY : STORAGE_KEY;
  const pageDefault = (pageKey === 'shop' || isShopPage) ? PAGE_DEFAULTS['/shop'] : defaultMode;

  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey);
      if (stored && ['grid', 'compact', 'list'].includes(stored)) {
        return stored as ViewMode;
      }
    }
    return pageDefault;
  });

  useEffect(() => {
    localStorage.setItem(storageKey, viewMode);
  }, [viewMode, storageKey]);

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
  }, []);

  const cycleViewMode = useCallback(() => {
    setViewModeState(prev => {
      const modes: ViewMode[] = ['grid', 'compact', 'list'];
      const currentIndex = modes.indexOf(prev);
      return modes[(currentIndex + 1) % modes.length];
    });
  }, []);

  return { viewMode, setViewMode, cycleViewMode };
}

// Grid classes for different view modes
export const getGridClasses = (viewMode: ViewMode): string => {
  switch (viewMode) {
    case 'grid':
      return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
    case 'compact':
      return 'grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6';
    case 'list':
      return 'grid-cols-1';
    default:
      return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
  }
};
