/**
 * O3 — End-to-End Smoke Test Harness
 * Synthetic-user journey runner + assertion library for prod & preview.
 *
 * Usage:
 *   const report = await runSmokeSuite(DEFAULT_JOURNEYS, { baseUrl, env: 'preview' });
 *   persistSmokeReport(report);
 */
import { supabase } from "@/integrations/supabase/client";

// ---------- Types ----------
export type SmokeEnv = "preview" | "production" | "local";
export type StepStatus = "passed" | "failed" | "skipped";
export type JourneyStatus = "passed" | "failed" | "partial";

export interface SmokeContext {
  baseUrl: string;
  env: SmokeEnv;
  vars: Record<string, unknown>;
  startedAt: number;
}

export interface AssertionResult {
  name: string;
  ok: boolean;
  expected?: unknown;
  actual?: unknown;
  message?: string;
}

export interface StepResult {
  name: string;
  status: StepStatus;
  duration_ms: number;
  assertions: AssertionResult[];
  error?: string;
  data?: Record<string, unknown>;
}

export interface SmokeStep {
  name: string;
  /** Return assertions + optional data merged into ctx.vars */
  run: (ctx: SmokeContext) => Promise<{
    assertions: AssertionResult[];
    data?: Record<string, unknown>;
  }>;
  /** If true, suite stops on failure of this step */
  critical?: boolean;
  timeoutMs?: number;
}

export interface SmokeJourney {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  steps: SmokeStep[];
}

export interface JourneyReport {
  id: string;
  name: string;
  status: JourneyStatus;
  duration_ms: number;
  steps: StepResult[];
  failed_step?: string;
}

export interface SmokeReport {
  env: SmokeEnv;
  baseUrl: string;
  started_at: string;
  finished_at: string;
  duration_ms: number;
  total: number;
  passed: number;
  failed: number;
  partial: number;
  journeys: JourneyReport[];
}

// ---------- Assertion helpers ----------
export const assert = {
  ok(name: string, cond: boolean, message?: string): AssertionResult {
    return { name, ok: !!cond, message };
  },
  equals<T>(name: string, actual: T, expected: T): AssertionResult {
    return {
      name,
      ok: JSON.stringify(actual) === JSON.stringify(expected),
      actual,
      expected,
    };
  },
  truthy(name: string, actual: unknown): AssertionResult {
    return { name, ok: !!actual, actual };
  },
  lt(name: string, actual: number, max: number): AssertionResult {
    return { name, ok: actual < max, actual, expected: `< ${max}` };
  },
  statusOk(name: string, status: number): AssertionResult {
    return {
      name,
      ok: status >= 200 && status < 400,
      actual: status,
      expected: "2xx/3xx",
    };
  },
};

// ---------- Runner ----------
async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, rej) =>
      setTimeout(() => rej(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

async function runStep(step: SmokeStep, ctx: SmokeContext): Promise<StepResult> {
  const t0 = performance.now();
  try {
    const { assertions, data } = await withTimeout(
      step.run(ctx),
      step.timeoutMs ?? 15_000,
      step.name,
    );
    if (data) Object.assign(ctx.vars, data);
    const passed = assertions.every((a) => a.ok);
    return {
      name: step.name,
      status: passed ? "passed" : "failed",
      duration_ms: Math.round(performance.now() - t0),
      assertions,
      data,
    };
  } catch (e) {
    return {
      name: step.name,
      status: "failed",
      duration_ms: Math.round(performance.now() - t0),
      assertions: [],
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function runJourney(
  journey: SmokeJourney,
  baseCtx: Omit<SmokeContext, "vars" | "startedAt">,
): Promise<JourneyReport> {
  const ctx: SmokeContext = { ...baseCtx, vars: {}, startedAt: Date.now() };
  const stepResults: StepResult[] = [];
  let failedStep: string | undefined;

  for (const step of journey.steps) {
    const res = await runStep(step, ctx);
    stepResults.push(res);
    if (res.status === "failed") {
      failedStep = res.name;
      if (step.critical) {
        // mark remaining as skipped
        const rest = journey.steps.slice(stepResults.length);
        for (const s of rest) {
          stepResults.push({
            name: s.name,
            status: "skipped",
            duration_ms: 0,
            assertions: [],
          });
        }
        break;
      }
    }
  }

  const anyFailed = stepResults.some((s) => s.status === "failed");
  const allPassed = stepResults.every((s) => s.status === "passed");
  const status: JourneyStatus = allPassed
    ? "passed"
    : anyFailed && stepResults.some((s) => s.status === "passed")
    ? "partial"
    : "failed";

  return {
    id: journey.id,
    name: journey.name,
    status,
    duration_ms: Date.now() - ctx.startedAt,
    steps: stepResults,
    failed_step: failedStep,
  };
}

export async function runSmokeSuite(
  journeys: SmokeJourney[],
  opts: { baseUrl: string; env: SmokeEnv },
): Promise<SmokeReport> {
  const startedAt = new Date();
  const t0 = performance.now();
  const reports: JourneyReport[] = [];
  for (const j of journeys) {
    reports.push(await runJourney(j, opts));
  }
  const finishedAt = new Date();
  return {
    env: opts.env,
    baseUrl: opts.baseUrl,
    started_at: startedAt.toISOString(),
    finished_at: finishedAt.toISOString(),
    duration_ms: Math.round(performance.now() - t0),
    total: reports.length,
    passed: reports.filter((r) => r.status === "passed").length,
    failed: reports.filter((r) => r.status === "failed").length,
    partial: reports.filter((r) => r.status === "partial").length,
    journeys: reports,
  };
}

// ---------- Persistence (best-effort to error_logs) ----------
export async function persistSmokeReport(report: SmokeReport): Promise<void> {
  try {
    await (supabase as any).from("error_logs").insert({
      error_type: "smoke_report",
      severity: report.failed > 0 ? "error" : "info",
      message: `Smoke ${report.env}: ${report.passed}/${report.total} passed`,
      metadata: report,
    });
  } catch {
    // swallow — harness must not break callers
  }
}

// ---------- Built-in steps ----------
export const steps = {
  httpGet(name: string, path: string, expectStatus = 200): SmokeStep {
    return {
      name,
      run: async (ctx) => {
        const t0 = performance.now();
        const res = await fetch(new URL(path, ctx.baseUrl).toString(), {
          method: "GET",
          credentials: "omit",
        });
        const dt = performance.now() - t0;
        return {
          assertions: [
            assert.equals(`${name} status`, res.status, expectStatus),
            assert.lt(`${name} latency`, dt, 5_000),
          ],
          data: { [`${name}_latency_ms`]: Math.round(dt) },
        };
      },
    };
  },
  supabasePing(): SmokeStep {
    return {
      name: "supabase reachable",
      critical: true,
      run: async () => {
        const { error } = await supabase
          .from("system_settings")
          .select("key")
          .limit(1);
        return {
          assertions: [assert.ok("no error", !error, error?.message)],
        };
      },
    };
  },
  productsListing(): SmokeStep {
    return {
      name: "products listing",
      run: async () => {
        const { data, error } = await supabase
          .from("products")
          .select("id,name")
          .eq("is_active", true)
          .limit(3);
        return {
          assertions: [
            assert.ok("query ok", !error, error?.message),
            assert.ok("has rows", (data?.length ?? 0) > 0),
          ],
          data: { sample_product_id: data?.[0]?.id },
        };
      },
    };
  },
};

// ---------- Default journeys ----------
export const DEFAULT_JOURNEYS: SmokeJourney[] = [
  {
    id: "infra",
    name: "Infrastructure",
    tags: ["core"],
    steps: [steps.supabasePing(), steps.httpGet("homepage", "/", 200)],
  },
  {
    id: "catalog",
    name: "Catalog & PDP",
    tags: ["commerce"],
    steps: [
      steps.productsListing(),
      {
        name: "product detail page reachable",
        run: async (ctx) => {
          const id = ctx.vars.sample_product_id as string | undefined;
          if (!id) {
            return {
              assertions: [assert.ok("skipped (no product)", true)],
            };
          }
          const res = await fetch(
            new URL(`/product/${id}`, ctx.baseUrl).toString(),
          );
          return { assertions: [assert.statusOk("pdp status", res.status)] };
        },
      },
    ],
  },
];
