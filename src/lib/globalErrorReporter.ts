import { supabase } from '@/integrations/supabase/client';

/**
 * Global error reporter — captures uncaught errors and unhandled promise rejections
 * and logs them to the error_logs table for admin monitoring.
 * 
 * Call `initGlobalErrorReporter()` once at app startup.
 */
export function initGlobalErrorReporter() {
  if (typeof window === 'undefined') return;

  // Prevent double-init
  if ((window as any).__errorReporterInit) return;
  (window as any).__errorReporterInit = true;

  // Uncaught errors
  window.addEventListener('error', (event) => {
    logError({
      message: event.message || 'Unknown error',
      stack_trace: event.error?.stack?.slice(0, 2000),
      source: 'window.onerror',
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });

  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message = reason instanceof Error ? reason.message : String(reason);
    const stack = reason instanceof Error ? reason.stack?.slice(0, 2000) : undefined;

    logError({
      message,
      stack_trace: stack,
      source: 'unhandledrejection',
      metadata: { type: typeof reason },
    });
  });
}

interface ErrorLogPayload {
  message: string;
  stack_trace?: string;
  source: string;
  metadata?: Record<string, any>;
}

// Debounce to avoid spamming — max 5 errors per minute
let errorCount = 0;
let resetTimer: ReturnType<typeof setTimeout> | null = null;

function logError(payload: ErrorLogPayload) {
  if (errorCount >= 5) return;
  errorCount++;

  if (!resetTimer) {
    resetTimer = setTimeout(() => {
      errorCount = 0;
      resetTimer = null;
    }, 60_000);
  }

  try {
    supabase
      .from('error_logs')
      .insert({
        error_level: 'error',
        message: payload.message.slice(0, 1000),
        stack_trace: payload.stack_trace || null,
        source: payload.source,
        metadata: payload.metadata || null,
        function_name: null,
      })
      .then(() => {});
  } catch {
    // Silently fail — error reporting must never break the app
  }
}
