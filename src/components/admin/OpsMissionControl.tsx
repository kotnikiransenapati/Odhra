import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Gauge,
  Siren,
  TestTube,
  Wrench,
  TrendingUp,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  getObservabilitySnapshot,
  type ObservabilitySnapshot,
} from "@/lib/observabilityData";
import { supabase } from "@/integrations/supabase/client";

type OpsSummary = {
  snapshot: ObservabilitySnapshot | null;
  openIncidents: number;
  criticalIncidents: number;
  openAnomalies: number;
  unhealthyProbes: number;
  openBreakers: number;
  activeKillSwitches: number;
};

const SHORTCUTS = [
  {
    id: "ops-observability",
    label: "Observability Cockpit",
    icon: Activity,
    description: "Commerce KPIs, funnel, edge fns, vendor pulse.",
    tone: "from-sky-500/20 to-sky-500/5",
  },
  {
    id: "ops-incidents",
    label: "Incident Command",
    icon: AlertTriangle,
    description: "Declare, triage, and resolve live incidents.",
    tone: "from-rose-500/20 to-rose-500/5",
  },
  {
    id: "ops-slo",
    label: "SLOs & Anomalies",
    icon: Gauge,
    description: "Track SLO budgets, alerts and detection rules.",
    tone: "from-amber-500/20 to-amber-500/5",
  },
  {
    id: "ops-runbooks",
    label: "Runbook Designer",
    icon: Wrench,
    description: "Author automated response playbooks.",
    tone: "from-violet-500/20 to-violet-500/5",
  },
  {
    id: "ops-killswitch",
    label: "Kill-Switch & Breakers",
    icon: ShieldAlert,
    description: "Emergency gates with mandatory audit reasons.",
    tone: "from-red-500/20 to-red-500/5",
  },
  {
    id: "ops-smoke",
    label: "Smoke Test Runner",
    icon: TestTube,
    description: "Synthetic journeys across critical surfaces.",
    tone: "from-emerald-500/20 to-emerald-500/5",
  },
] as const;

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n || 0);

const KpiCard = ({
  label,
  value,
  helper,
  tone = "default",
  icon: Icon,
}: {
  label: string;
  value: string;
  helper?: string;
  tone?: "default" | "good" | "warn" | "danger";
  icon?: React.ComponentType<{ className?: string }>;
}) => {
  const toneRing = {
    default: "ring-border",
    good: "ring-emerald-500/40",
    warn: "ring-amber-500/40",
    danger: "ring-rose-500/40",
  }[tone];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={cn(
        "rounded-xl bg-card p-4 ring-1 transition-shadow hover:shadow-md",
        toneRing,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        {Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      {helper ? (
        <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
      ) : null}
    </motion.div>
  );
};

export default function OpsMissionControl() {
  const [summary, setSummary] = useState<OpsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [snapshot, incidents, anomalies, probes, breakers, switches] =
          await Promise.all([
            getObservabilitySnapshot(7).catch(() => null),
            supabase
              .from("incidents" as any)
              .select("id,severity,status")
              .neq("status", "resolved"),
            supabase
              .from("anomaly_alerts" as any)
              .select("id,resolved_at")
              .is("resolved_at", null),
            supabase
              .from("service_health_probes" as any)
              .select("id,consecutive_failures,is_active")
              .eq("is_active", true),
            supabase
              .from("circuit_breakers" as any)
              .select("id,state")
              .in("state", ["open", "half_open"]),
            supabase
              .from("kill_switches" as any)
              .select("id,is_active")
              .eq("is_active", true),
          ]);
        if (!alive) return;

        const openIncidents = incidents.data?.length ?? 0;
        const criticalIncidents =
          incidents.data?.filter((i: any) => i.severity === "critical")
            .length ?? 0;
        const openAnomalies = anomalies.data?.length ?? 0;
        const unhealthyProbes =
          probes.data?.filter((p: any) => (p.consecutive_failures ?? 0) >= 2)
            .length ?? 0;
        const openBreakers = breakers.data?.length ?? 0;
        const activeKillSwitches = switches.data?.length ?? 0;

        setSummary({
          snapshot,
          openIncidents,
          criticalIncidents,
          openAnomalies,
          unhealthyProbes,
          openBreakers,
          activeKillSwitches,
        });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [refreshKey]);

  const incidentTone =
    (summary?.criticalIncidents ?? 0) > 0
      ? "danger"
      : (summary?.openIncidents ?? 0) > 0
        ? "warn"
        : "good";
  const probeTone =
    (summary?.unhealthyProbes ?? 0) > 0 ? "danger" : "good";
  const breakerTone =
    (summary?.openBreakers ?? 0) > 0 ? "warn" : "good";
  const killTone =
    (summary?.activeKillSwitches ?? 0) > 0 ? "warn" : "default";
  const slaBreaches = summary?.snapshot?.ops?.open_breaches ?? 0;
  const slaTone = slaBreaches > 0 ? "warn" : "good";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Operations Mission Control</h2>
          <p className="text-sm text-muted-foreground">
            Unified pulse across reliability, incidents, and synthetic journeys
            for the last 7 days.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setRefreshKey((k) => k + 1)}
        >
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <KpiCard
            label="GMV (7d)"
            value={fmtCurrency(summary?.snapshot?.commerce?.gmv ?? 0)}
            helper={`AOV ${fmtCurrency(summary?.snapshot?.commerce?.aov ?? 0)}`}
            icon={TrendingUp}
          />
          <KpiCard
            label="Open Incidents"
            value={String(summary?.openIncidents ?? 0)}
            helper={`${summary?.criticalIncidents ?? 0} critical`}
            tone={incidentTone}
            icon={AlertTriangle}
          />
          <KpiCard
            label="Active Anomalies"
            value={String(summary?.openAnomalies ?? 0)}
            helper="Unresolved alerts"
            tone={(summary?.openAnomalies ?? 0) > 0 ? "warn" : "good"}
            icon={Siren}
          />
          <KpiCard
            label="Probe Failures"
            value={String(summary?.unhealthyProbes ?? 0)}
            helper="≥2 consecutive failures"
            tone={probeTone}
            icon={Activity}
          />
          <KpiCard
            label="Circuit Breakers"
            value={String(summary?.openBreakers ?? 0)}
            helper="Open or half-open"
            tone={breakerTone}
            icon={Gauge}
          />
          <KpiCard
            label="Kill Switches"
            value={String(summary?.activeKillSwitches ?? 0)}
            helper="Currently active"
            tone={killTone}
            icon={ShieldAlert}
          />
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Service Level Health</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <KpiCard
            label="SLA Breaches"
            value={String(slaBreaches)}
            tone={slaTone}
          />
          <KpiCard
            label="Funnel Conv. (paid/views)"
            value={(() => {
              const f = summary?.snapshot?.funnel ?? [];
              const totals = f.reduce(
                (a, p) => ({ views: a.views + p.views, paid: a.paid + p.paid }),
                { views: 0, paid: 0 },
              );
              const rate = totals.views ? (totals.paid / totals.views) * 100 : 0;
              return `${rate.toFixed(2)}%`;
            })()}
          />
          <KpiCard
            label="Top Edge Fn Errors"
            value={(() => {
              const m = summary?.snapshot?.edge_fns ?? [];
              const worst = [...m].sort((a, b) => b.error_rate - a.error_rate)[0];
              if (!worst) return "—";
              return `${worst.fn} · ${(worst.error_rate * 100).toFixed(1)}%`;
            })()}
            tone={
              (summary?.snapshot?.edge_fns ?? []).some(
                (m) => m.error_rate > 0.05,
              )
                ? "warn"
                : "good"
            }
          />
        </CardContent>
      </Card>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Quick Access
        </h3>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {SHORTCUTS.map((s) => (
            <Link
              key={s.id}
              to={`/admin?tab=${s.id}`}
              className={cn(
                "group rounded-xl bg-gradient-to-br p-4 ring-1 ring-border transition-all hover:-translate-y-0.5 hover:ring-primary/40",
                s.tone,
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-background/70 p-2">
                    <s.icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{s.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.description}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 translate-x-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {(summary?.criticalIncidents ?? 0) > 0 && (
        <Card className="border-rose-500/40 bg-rose-500/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-500" />
              <div>
                <p className="text-sm font-semibold">
                  Critical incident in progress
                </p>
                <p className="text-xs text-muted-foreground">
                  Coordinate response from the Incident Command Center.
                </p>
              </div>
            </div>
            <Badge variant="destructive">
              {summary?.criticalIncidents} critical
            </Badge>
            <Button asChild size="sm" variant="destructive">
              <Link to="/admin?tab=ops-incidents">Open Command Center</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
