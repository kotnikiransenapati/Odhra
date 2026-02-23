import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const INACTIVITY_TIMEOUT = 15 * 24 * 60 * 60 * 1000; // 15 days
const WARNING_BEFORE = 60 * 60 * 1000; // Warn 1 hour before
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'] as const;
const THROTTLE_MS = 60_000; // Only update activity timestamp once per minute

/**
 * Monitors user inactivity and signs out after 15 days.
 * Shows a warning toast 1 hour before auto-logout.
 */
export function useSessionTimeout() {
  const { user, signOut } = useAuth();
  const lastActivityRef = useRef(Date.now());
  const warningShownRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const throttleRef = useRef(0);

  const resetActivity = useCallback(() => {
    const now = Date.now();
    if (now - throttleRef.current < THROTTLE_MS) return;
    throttleRef.current = now;
    lastActivityRef.current = now;
    warningShownRef.current = false;
  }, []);

  useEffect(() => {
    if (!user) return;

    // Listen for user activity
    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, resetActivity, { passive: true });
    });

    // Check inactivity periodically
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;

      if (elapsed >= INACTIVITY_TIMEOUT) {
        signOut();
        toast.info('You were signed out due to inactivity', {
          description: 'Please sign in again to continue.',
          duration: 8000,
        });
      } else if (elapsed >= INACTIVITY_TIMEOUT - WARNING_BEFORE && !warningShownRef.current) {
        warningShownRef.current = true;
        toast.warning('Session expiring soon', {
          description: 'You will be signed out in 1 hour due to inactivity.',
          duration: 10000,
        });
      }
    }, 30_000); // Check every 30 seconds

    return () => {
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, resetActivity);
      });
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [user, signOut, resetActivity]);
}
