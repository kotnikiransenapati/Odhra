/**
 * Global popup queue — guarantees only one full-screen / center-stage popup
 * is visible at a time, and shows them in priority order (highest first).
 *
 * Usage from a popup component:
 *
 *   const canShow = usePopupSlot('welcome', 50, wantToShow);
 *   // render the popup only when `canShow` is true
 *
 * - `wantToShow` is whatever local condition the popup already computes
 *   (delay elapsed, not previously dismissed, feature flag on, etc.).
 * - When the popup closes, simply flip `wantToShow` back to false — the
 *   slot is released automatically and the next-highest-priority waiter
 *   becomes active.
 */
import { useEffect, useState } from 'react';

type Waiter = { id: string; priority: number; notify: (active: boolean) => void };

let activeId: string | null = null;
const waiters: Waiter[] = [];

function promote() {
  if (activeId) return;
  if (waiters.length === 0) return;
  // Highest priority first; FIFO for ties.
  waiters.sort((a, b) => b.priority - a.priority);
  const next = waiters.shift()!;
  activeId = next.id;
  next.notify(true);
}

function request(id: string, priority: number, notify: (active: boolean) => void) {
  if (activeId === id) {
    notify(true);
    return;
  }
  // De-dupe if already waiting
  if (waiters.some((w) => w.id === id)) return;
  waiters.push({ id, priority, notify });
  promote();
}

function release(id: string) {
  const idx = waiters.findIndex((w) => w.id === id);
  if (idx >= 0) waiters.splice(idx, 1);
  if (activeId === id) {
    activeId = null;
    // Small delay so dismiss animation can finish before next popup pops in
    setTimeout(promote, 350);
  }
}

export function usePopupSlot(id: string, priority: number, wantToShow: boolean): boolean {
  const [canShow, setCanShow] = useState(false);

  useEffect(() => {
    if (!wantToShow) {
      release(id);
      setCanShow(false);
      return;
    }
    request(id, priority, (active) => setCanShow(active));
    return () => release(id);
  }, [id, priority, wantToShow]);

  return canShow;
}

// Priority constants — higher wins.
export const POPUP_PRIORITY = {
  COOKIE_CONSENT: 100,
  WELCOME: 50,
  INSTALL_PROMPT: 30,
  NOTIFICATION_PERMISSION: 20,
  DAILY_CHECKIN: 10,
} as const;
