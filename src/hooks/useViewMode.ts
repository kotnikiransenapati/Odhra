import { useState, useEffect, useCallback } from 'react';

export type ViewMode = 'grid' | 'compact' | 'list';

const STORAGE_KEY = 'odhra_view_mode';

export function useViewMode(defaultMode: ViewMode = 'grid') {
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && ['grid', 'compact', 'list'].includes(stored)) {
        return stored as ViewMode;
      }
    }
    return defaultMode;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, viewMode);
  }, [viewMode]);

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
