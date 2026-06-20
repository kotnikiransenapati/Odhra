/**
 * P2 — Smoke Test Runner (UI)
 * Run synthetic journeys from src/lib/smokeHarness.ts against the current origin
 * and persist results for the observability dashboard.
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Play, CheckCircle2, XCircle, MinusCircle, Loader2, FlaskConical } from "lucide-react";
import {
  DEFAULT_JOURNEYS,
  persistSmokeReport,
  runSmokeSuite,
  type SmokeReport,
  type JourneyReport,
  type StepResult,
} from "@/lib/smokeHarness";
import { toast } from "sonner";

const STATUS_ICON: Record<string, JSX.Element> = {
  passed:  <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  failed:  <XCircle      className="h-4 w-4 text-red-500" />,
  partial: <MinusCircle  className="h-4 w-4 text-amber-500" />,
  skipped: <MinusCircle  className="h-4 w-4 text-muted-foreground" />,
};

function detectEnv(): "preview" | "production" | "local" {
  if (typeof window === "undefined") return "local";
  const h = window.location.hostname;
  if (h === "localhost" || h.startsWith("127.")) return "local";
  if (h.includes("lovable.app") && h.includes("preview")) return "preview";
  return "production";
}

function StepRow({ step }: { step: StepResult }) {
  const failed = step.assertions.filter(a => !a.ok);
  return (
    <li className="rounded border border-border/60 p-2 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          {STATUS_ICON[step.status]}
          <span className="font-medium">{step.name}</span>
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">{step.duration_ms}ms</span>
      </div>
      {step.error && (
        <p className="mt-1 text-xs text-red-500">⚠ {step.error}</p>
      )}
      {failed.length > 0 && (
        <ul className="mt-1 space-y-0.5">
          {failed.map((a, i) => (
            <li key={i} className="text-xs text-red-500">
              ✗ {a.name}{a.expected !== undefined && ` — expected ${String(a.expected)}, got ${String(a.actual)}`}
              {a.message && ` (${a.message})`}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function JourneyCard({ j }: { j: JourneyReport }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            {STATUS_ICON[j.status]}
            {j.name}
          </span>
          <Badge variant={j.status === "passed" ? "default" : j.status === "failed" ? "destructive" : "secondary"}>
            {j.status}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1.5">
          {j.steps.map((s, i) => <StepRow key={`${s.name}-${i}`} step={s} />)}
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">
          Duration {j.duration_ms}ms{j.failed_step ? ` • first failure: ${j.failed_step}` : ""}
        </p>
      </CardContent>
    </Card>
  );
}

export default function SmokeTestRunner() {
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<SmokeReport | null>(null);

  async function run() {
    setRunning(true);
    try {
      const env = detectEnv();
      const baseUrl = window.location.origin;
      const r = await runSmokeSuite(DEFAULT_JOURNEYS, { baseUrl, env });
      setReport(r);
      await persistSmokeReport(r);
      if (r.failed > 0) {
        toast.error(`Smoke suite finished — ${r.failed}/${r.total} journeys failed`);
      } else {
        toast.success(`Smoke suite passed — ${r.passed}/${r.total} journeys`);
      }
    } catch (e) {
      toast.error("Smoke runner crashed", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-primary" /> Smoke Test Runner
          </h1>
          <p className="text-sm text-muted-foreground">
            Synthetic user journeys — infrastructure, catalog &amp; PDP. Results stream into observability.
          </p>
        </div>
        <Button onClick={run} disabled={running}>
          {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
          {running ? "Running…" : "Run smoke suite"}
        </Button>
      </header>

      {report && (
        <Card>
          <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4">
            <div><p className="text-xs uppercase text-muted-foreground">Env</p><p className="font-semibold capitalize">{report.env}</p></div>
            <div><p className="text-xs uppercase text-muted-foreground">Total</p><p className="font-semibold">{report.total}</p></div>
            <div><p className="text-xs uppercase text-muted-foreground">Passed</p><p className="font-semibold text-emerald-600">{report.passed}</p></div>
            <div><p className="text-xs uppercase text-muted-foreground">Failed</p><p className={`font-semibold ${report.failed ? "text-red-600" : ""}`}>{report.failed}</p></div>
            <div><p className="text-xs uppercase text-muted-foreground">Duration</p><p className="font-semibold tabular-nums">{report.duration_ms}ms</p></div>
          </CardContent>
        </Card>
      )}

      {!report && !running && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No results yet. Click <em>Run smoke suite</em> to execute {DEFAULT_JOURNEYS.length} journeys against{" "}
            <code className="rounded bg-muted px-1">{typeof window !== "undefined" ? window.location.origin : ""}</code>.
          </CardContent>
        </Card>
      )}

      {report && (
        <ScrollArea className="max-h-[60vh]">
          <div className="grid gap-4 md:grid-cols-2">
            {report.journeys.map(j => <JourneyCard key={j.id} j={j} />)}
          </div>
          <Separator className="my-4" />
          <p className="text-xs text-muted-foreground">
            Finished at {new Date(report.finished_at).toLocaleString()}
          </p>
        </ScrollArea>
      )}
    </div>
  );
}
