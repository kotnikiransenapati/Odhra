/**
 * Lightweight Sentry-compatible reporter.
 *
 * We intentionally avoid bundling `@sentry/browser` to keep payload size down
 * — Sentry's public ingest endpoint accepts plain HTTPS POSTs of the envelope
 * format, which is what we send here. If a DSN is not configured we no-op.
 *
 * Captures are PII-redacted via `piiRedaction` to honour our privacy posture.
 */
import { integrations, site } from "@/lib/env";
import { redact } from "@/lib/piiRedaction";

const redactPII = (s: string): string => redact(s);

type Level = "fatal" | "error" | "warning" | "info" | "debug";

interface Breadcrumb {
  category: string;
  message: string;
  level?: Level;
  data?: Record<string, unknown>;
  timestamp: number;
}

const BREADCRUMBS: Breadcrumb[] = [];
const MAX_BREADCRUMBS = 30;

interface ParsedDsn {
  ingestUrl: string;
  publicKey: string;
  projectId: string;
}

function parseDsn(dsn: string | null): ParsedDsn | null {
  if (!dsn) return null;
  try {
    const u = new URL(dsn);
    const publicKey = u.username;
    const projectId = u.pathname.replace(/^\//, "");
    if (!publicKey || !projectId) return null;
    const ingestUrl = `${u.protocol}//${u.host}/api/${projectId}/envelope/`;
    return { ingestUrl, publicKey, projectId };
  } catch {
    return null;
  }
}

const DSN = parseDsn(integrations.analytics.sentry);
const RELEASE = (import.meta.env.VITE_APP_VERSION as string | undefined) ?? "dev";
const ENV = import.meta.env.MODE;

export function addBreadcrumb(b: Omit<Breadcrumb, "timestamp">): void {
  BREADCRUMBS.push({ ...b, timestamp: Date.now() / 1000 });
  if (BREADCRUMBS.length > MAX_BREADCRUMBS) BREADCRUMBS.shift();
}

async function postEnvelope(eventBody: Record<string, unknown>): Promise<void> {
  if (!DSN) return;
  const eventId = crypto.randomUUID().replace(/-/g, "");
  const header = JSON.stringify({
    event_id: eventId,
    sent_at: new Date().toISOString(),
    sdk: { name: "odhra.web", version: "1.0.0" },
  });
  const item = JSON.stringify({ type: "event", content_type: "application/json" });
  const body = JSON.stringify({
    event_id: eventId,
    timestamp: Date.now() / 1000,
    platform: "javascript",
    environment: ENV,
    release: RELEASE,
    server_name: site.name,
    breadcrumbs: { values: [...BREADCRUMBS] },
    ...eventBody,
  });

  const envelope = `${header}\n${item}\n${body}`;

  try {
    await fetch(`${DSN.ingestUrl}?sentry_key=${DSN.publicKey}&sentry_version=7`, {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/x-sentry-envelope" },
      body: envelope,
    });
  } catch {
    // Telemetry must never throw into product code.
  }
}

export function captureException(err: unknown, context?: Record<string, unknown>): void {
  const error = err instanceof Error ? err : new Error(String(err));
  const safeCtx = context ? JSON.parse(redactPII(JSON.stringify(context))) : undefined;
  void postEnvelope({
    level: "error",
    exception: {
      values: [
        {
          type: error.name,
          value: redactPII(error.message),
          stacktrace: error.stack ? { frames: [{ filename: "browser", function: error.stack }] } : undefined,
        },
      ],
    },
    extra: safeCtx,
  });
}

export function captureMessage(message: string, level: Level = "info"): void {
  void postEnvelope({ level, message: { formatted: redactPII(message) } });
}

/** Install global error / unhandled rejection handlers. Idempotent. */
let installed = false;
export function installSentry(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  if (!DSN) return;
  window.addEventListener("error", (e) => captureException(e.error ?? e.message));
  window.addEventListener("unhandledrejection", (e) => captureException(e.reason));
}

export const sentryEnabled = Boolean(DSN);
