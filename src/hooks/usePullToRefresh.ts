import { useEffect, useRef, useState, useCallback } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  disabled?: boolean;
}

export function usePullToRefresh({ onRefresh, threshold = 80, disabled = false }: UsePullToRefreshOptions) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing) return;
    if (window.scrollY <= 0) {
      startY.current = e.touches[0].clientY;
    }
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (startY.current === null || disabled || isRefreshing) return;
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0 && window.scrollY <= 0) {
      setPullDistance(Math.min(diff * 0.5, threshold * 1.5));
    }
  }, [disabled, isRefreshing, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (startY.current === null) return;
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    setPullDistance(0);
    startY.current = null;
  }, [pullDistance, threshold, isRefreshing, onRefresh]);

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { isRefreshing, pullDistance };
}
