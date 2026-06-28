/**
 * useNetworkQuality — exposes live network telemetry from the Network Information API,
 * combined with the user's opt-in "Data Saver" preference. Components can subscribe to
 * downgrade behavior (skip autoplay, lower image quality, defer prefetch) on slow links.
 */
import { useEffect, useState } from 'react';

export type EffectiveType = 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';

export interface NetworkQuality {
  isOnline: boolean;
  effectiveType: EffectiveType;
  saveData: boolean;
  downlinkMbps: number | null;
  rttMs: number | null;
  /** True when the user (or browser) signals to conserve data: slow link OR saveData OR manual toggle. */
  shouldConserveData: boolean;
}

const DATA_SAVER_KEY = 'odhra_data_saver';

type NetInfo = {
  effectiveType?: EffectiveType;
  saveData?: boolean;
  downlink?: number;
  rtt?: number;
  addEventListener?: (type: 'change', cb: () => void) => void;
  removeEventListener?: (type: 'change', cb: () => void) => void;
};

function getConnection(): NetInfo | null {
  if (typeof navigator === 'undefined') return null;
  const nav = navigator as unknown as {
    connection?: NetInfo;
    mozConnection?: NetInfo;
    webkitConnection?: NetInfo;
  };
  return nav.connection || nav.mozConnection || nav.webkitConnection || null;
}

function readManualSaver(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(DATA_SAVER_KEY) === '1';
}

export function setManualDataSaver(enabled: boolean) {
  if (typeof localStorage === 'undefined') return;
  if (enabled) localStorage.setItem(DATA_SAVER_KEY, '1');
  else localStorage.removeItem(DATA_SAVER_KEY);
  window.dispatchEvent(new Event('odhra:data-saver-change'));
}

function snapshot(): NetworkQuality {
  const conn = getConnection();
  const effectiveType: EffectiveType = (conn?.effectiveType as EffectiveType) || 'unknown';
  const saveData = conn?.saveData ?? false;
  const manual = readManualSaver();
  const slow = effectiveType === '2g' || effectiveType === 'slow-2g' || effectiveType === '3g';
  return {
    isOnline: typeof navigator === 'undefined' ? true : navigator.onLine,
    effectiveType,
    saveData,
    downlinkMbps: conn?.downlink ?? null,
    rttMs: conn?.rtt ?? null,
    shouldConserveData: manual || saveData || slow,
  };
}

export function useNetworkQuality(): NetworkQuality {
  const [state, setState] = useState<NetworkQuality>(() => snapshot());

  useEffect(() => {
    const update = () => setState(snapshot());
    const conn = getConnection();
    conn?.addEventListener?.('change', update);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    window.addEventListener('odhra:data-saver-change', update);
    return () => {
      conn?.removeEventListener?.('change', update);
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
      window.removeEventListener('odhra:data-saver-change', update);
    };
  }, []);

  return state;
}

export function isDataSaverActive(): boolean {
  return snapshot().shouldConserveData;
}
