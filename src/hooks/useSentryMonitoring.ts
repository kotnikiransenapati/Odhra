import { useEffect, useRef, useCallback } from 'react';
import { useIntegration } from './useIntegrationSettings';

// Lightweight Sentry-compatible error reporter
// Uses Sentry's envelope API directly — no SDK needed for basic error capture

interface SentryEvent {
  event_id: string;
  timestamp: number;
  platform: string;
  level: string;
  logger: string;
  environment?: string;
  release?: string;
  exception?: {
    values: Array<{
      type: string;
      value: string;
      stacktrace?: { frames: Array<{ filename: string; lineno: number; colno: number; function: string }> };
    }>;
  };
  tags?: Record<string, string>;
  extra?: Record<string, any>;
  user?: { id?: string; email?: string };
  request?: { url: string; headers: Record<string, string> };
  breadcrumbs?: Array<{ timestamp: number; message: string; category: string; level: string }>;
}

function generateEventId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function parseDSN(dsn: string) {
  try {
    const url = new URL(dsn);
    const projectId = url.pathname.replace('/', '');
    const publicKey = url.username;
    const host = url.hostname;
    return { projectId, publicKey, host, ingestUrl: `https://${host}/api/${projectId}/envelope/` };
  } catch {
    return null;
  }
}

function parseStack(stack: string) {
  const frames: Array<{ filename: string; lineno: number; colno: number; function: string }> = [];
  const lines = stack.split('\n').slice(1);
  for (const line of lines) {
    const match = line.match(/at\s+(.+?)\s+\((.+):(\d+):(\d+)\)/) || line.match(/at\s+(.+):(\d+):(\d+)/);
    if (match) {
      frames.push({
        function: match[1] || '<anonymous>',
        filename: match[2] || match[1],
        lineno: parseInt(match[3] || match[2], 10),
        colno: parseInt(match[4] || match[3], 10),
      });
    }
  }
  return frames.reverse(); // Sentry expects innermost frame last
}

async function sendToSentry(dsn: string, event: SentryEvent) {
  const parsed = parseDSN(dsn);
  if (!parsed) return;

  const envelope = [
    JSON.stringify({ event_id: event.event_id, dsn, sent_at: new Date().toISOString() }),
    JSON.stringify({ type: 'event' }),
    JSON.stringify(event),
  ].join('\n');

  try {
    await fetch(parsed.ingestUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-sentry-envelope' },
      body: envelope,
    });
  } catch {
    // Silent fail — don't cause errors in the error reporter
  }
}

export function useSentryMonitoring() {
  const { isEnabled, config } = useIntegration('sentry');
  const initialized = useRef(false);

  useEffect(() => {
    if (!isEnabled || !config.dsn || initialized.current) return;
    initialized.current = true;

    // Global unhandled error handler
    const handleError = (event: ErrorEvent) => {
      const sentryEvent: SentryEvent = {
        event_id: generateEventId(),
        timestamp: Date.now() / 1000,
        platform: 'javascript',
        level: 'error',
        logger: 'window.onerror',
        environment: config.environment || 'production',
        exception: {
          values: [
            {
              type: event.error?.name || 'Error',
              value: event.message,
              stacktrace: event.error?.stack ? { frames: parseStack(event.error.stack) } : undefined,
            },
          ],
        },
        request: { url: window.location.href, headers: { 'User-Agent': navigator.userAgent } },
      };
      sendToSentry(config.dsn, sentryEvent);
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const sentryEvent: SentryEvent = {
        event_id: generateEventId(),
        timestamp: Date.now() / 1000,
        platform: 'javascript',
        level: 'error',
        logger: 'unhandledrejection',
        environment: config.environment || 'production',
        exception: {
          values: [
            {
              type: reason?.name || 'UnhandledRejection',
              value: reason?.message || String(reason),
              stacktrace: reason?.stack ? { frames: parseStack(reason.stack) } : undefined,
            },
          ],
        },
        request: { url: window.location.href, headers: { 'User-Agent': navigator.userAgent } },
      };
      sendToSentry(config.dsn, sentryEvent);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, [isEnabled, config.dsn, config.environment]);

  const captureException = useCallback(
    (error: Error, context?: { tags?: Record<string, string>; extra?: Record<string, any>; user?: { id?: string; email?: string } }) => {
      if (!isEnabled || !config.dsn) return;

      const sentryEvent: SentryEvent = {
        event_id: generateEventId(),
        timestamp: Date.now() / 1000,
        platform: 'javascript',
        level: 'error',
        logger: 'manual',
        environment: config.environment || 'production',
        exception: {
          values: [
            {
              type: error.name,
              value: error.message,
              stacktrace: error.stack ? { frames: parseStack(error.stack) } : undefined,
            },
          ],
        },
        tags: context?.tags,
        extra: context?.extra,
        user: context?.user,
        request: { url: window.location.href, headers: { 'User-Agent': navigator.userAgent } },
      };
      sendToSentry(config.dsn, sentryEvent);
    },
    [isEnabled, config.dsn, config.environment]
  );

  const captureMessage = useCallback(
    (message: string, level: 'info' | 'warning' | 'error' = 'info', context?: { tags?: Record<string, string>; extra?: Record<string, any> }) => {
      if (!isEnabled || !config.dsn) return;

      const sentryEvent: SentryEvent = {
        event_id: generateEventId(),
        timestamp: Date.now() / 1000,
        platform: 'javascript',
        level,
        logger: 'manual',
        environment: config.environment || 'production',
        exception: { values: [{ type: 'Message', value: message }] },
        tags: context?.tags,
        extra: context?.extra,
        request: { url: window.location.href, headers: { 'User-Agent': navigator.userAgent } },
      };
      sendToSentry(config.dsn, sentryEvent);
    },
    [isEnabled, config.dsn, config.environment]
  );

  return { captureException, captureMessage, isEnabled };
}
