/**
 * Performance budget tracker.
 *
 * Uses native PerformanceObserver (no `web-vitals` dependency) to verdict
 * LCP / CLS / FCP / TTFB / long-task INP-proxy against Google's "good"
 * thresholds. Verdicts flow through the Sentry reporter as breadcrumbs and
 * warnings so regressions surface in observability without spamming errors.
 */
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

function report(name: string, value: number) {
  const v = verdict(name, value);
  addBreadcrumb({
    category: "web-vitals",
    message: `${name}=${Math.round(value * 1000) / 1000} (${v})`,
    level: v === "poor" ? "warning" : "info",
  });
  if (v === "poor") {
    captureMessage(`web-vital ${name} exceeded budget (${Math.round(value)})`, "warning");
  }
}

let installed = false;
export function installPerformanceBudget(): void {
  if (installed) return;
  installed = true;
  if (typeof window === "undefined" || !("PerformanceObserver" in window)) return;

  try {
    new PerformanceObserver((list) => {
      const fcp = list.getEntries().find((e) => e.name === "first-contentful-paint");
      if (fcp) report("FCP", fcp.startTime);
    }).observe({ type: "paint", buffered: true });

    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) report("LCP", last.startTime);
    }).observe({ type: "largest-contentful-paint", buffered: true });

    let cls = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as any[]) {
        if (!e.hadRecentInput && e.value) cls += e.value;
      }
      report("CLS", cls);
    }).observe({ type: "layout-shift", buffered: true });

    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as any[]) {
        if (e.duration > BUDGETS.INP.good) report("INP", e.duration);
      }
    }).observe({ type: "event", buffered: true, durationThreshold: 40 } as any);

    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (nav) report("TTFB", nav.responseStart - nav.requestStart);
  } catch {
    // PerformanceObserver entry type unsupported — skip silently.
  }
}
