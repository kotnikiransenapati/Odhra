/**
 * iOS-like Haptic Feedback System
 * Provides tactile feedback for various interaction types
 */

export type HapticStyle = 
  | 'light'      // Subtle tap - navigation, toggles
  | 'medium'     // Standard tap - buttons, selections
  | 'heavy'      // Strong tap - confirmations, success
  | 'success'    // Double pulse - successful actions
  | 'warning'    // Triple pulse - warnings
  | 'error'      // Long vibration - errors
  | 'selection'  // Micro tap - list selections
  | 'impact'     // Sharp tap - impacts, collisions
  | 'notification'; // Alert pattern

// Vibration patterns in milliseconds
const HAPTIC_PATTERNS: Record<HapticStyle, number[]> = {
  light: [8],
  medium: [15],
  heavy: [25],
  success: [10, 50, 15, 50, 10],
  warning: [15, 30, 15, 30, 15],
  error: [50, 30, 50],
  selection: [5],
  impact: [20],
  notification: [10, 100, 10],
};

// Check if haptics are supported
export const supportsHaptics = (): boolean => {
  return 'vibrate' in navigator;
};

// Check if user prefers reduced motion
const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Trigger haptic feedback
 * @param style - The type of haptic feedback
 * @param force - Force haptic even if reduced motion is preferred
 */
export const haptic = (style: HapticStyle = 'light', force = false): void => {
  // Skip if reduced motion is preferred (unless forced)
  if (!force && prefersReducedMotion()) return;
  
  // Skip if haptics not supported
  if (!supportsHaptics()) return;
  
  try {
    navigator.vibrate(HAPTIC_PATTERNS[style] || HAPTIC_PATTERNS.light);
  } catch (e) {
    // Silently fail - haptics are enhancement only
  }
};

/**
 * Higher-order function for click handlers with haptic feedback
 */
export const withHaptic = <T extends (...args: unknown[]) => unknown>(
  handler: T,
  style: HapticStyle = 'light'
): T => {
  return ((...args: Parameters<T>) => {
    haptic(style);
    return handler(...args);
  }) as T;
};

/**
 * React hook-friendly haptic trigger
 * Returns memoizable haptic functions
 */
export const hapticActions = {
  tap: () => haptic('light'),
  press: () => haptic('medium'),
  confirm: () => haptic('success'),
  select: () => haptic('selection'),
  error: () => haptic('error'),
  warn: () => haptic('warning'),
  notify: () => haptic('notification'),
  impact: () => haptic('impact'),
} as const;

export default haptic;
