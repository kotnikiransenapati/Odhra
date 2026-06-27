import { useEffect, useState } from "react";
import { runHealthChecks, type HealthReport } from "@/lib/observability/healthz";

/**
 * Public /healthz endpoint. Returns a machine-readable JSON block in the DOM
 * plus a human-readable summary. Uptime monitors should look for
 * `data-health-status="ok"`.
 */
export default function Healthz() {
  const [report, setReport] = useState<HealthReport | null>(null);

  useEffect(() => {
    let cancelled = false;
    runHealthChecks().then((r) => {
      if (!cancelled) setReport(r);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!report) {
    return (
      <pre data-health-status="checking" style={{ padding: 16, fontFamily: "monospace" }}>
        {JSON.stringify({ status: "checking" }, null, 2)}
      </pre>
    );
  }

  return (
    <div style={{ padding: 16, fontFamily: "monospace" }}>
      <pre data-health-status={report.status} data-health-report={JSON.stringify(report)}>
        {JSON.stringify(report, null, 2)}
      </pre>
    </div>
  );
}
