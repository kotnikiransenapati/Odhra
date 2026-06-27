/**
 * Performance budget tracker.
 *
 * Subscribes to Web Vitals and verdicts against Google's "good" thresholds.
 * Reports verdicts via the Sentry reporter (as messages, not exceptions) so
 * regressions surface in observability without spamming the error stream.
 *
 * Budgets are intentionally strict — they nudge us toward the experience we
 * want, even when CrUX would still mark us "needs improvement".
 */
import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from "web-vitals";
import { addBreadcrumb, captureMessage } from "@/lib/observability/sentry";

export interface BudgetThreshold {
  good: number;
  poor: number;
}

export const BUDGETS: Record<string, BudgetThreshold> = {
  LCP: { good: 2500, poor: 4000 },
  INP: { good: 200, poor: 500 },
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 },
};

function verdict(name: string, value: number): "good" | "needs-improvement" | "poor" {
  const t = BUDGETS[name];
  if (!t) return "good";
  if (value <= t.good) return "good";
  if (value <= t.poor) return "needs-improvement";
  return "poor";
}

function handle(metric: Metric) {
  const v = verdict(metric.name, metric.value);
  addBreadcrumb({
    category: "web-vitals",
    message: `${metric.name}=${Math.round(metric.value)} (${v})`,
    level: v === "good" ? "info" : v === "poor" ? "warning" : "info",
    data: { id: metric.id, navigationType: metric.navigationType },
  });
  if (v === "poor") {
    captureMessage(`web-vital ${metric.name} exceeded budget (${Math.round(metric.value)})`, "warning");
  }
}

let installed = false;
export function installPerformanceBudget(): void {
  if (installed) return;
  installed = true;
  onCLS(handle);
  onFCP(handle);
  onINP(handle);
  onLCP(handle);
  onTTFB(handle);
}
