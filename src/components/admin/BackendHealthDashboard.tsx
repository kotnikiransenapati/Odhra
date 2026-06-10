import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Activity, AlertTriangle, CheckCircle2, ShieldCheck, Webhook } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

interface AuditRow {
  table_name: string;
  rls_enabled: boolean;
  policy_count: number;
  has_service_role_grant: boolean;
  has_authenticated_grant: boolean;
  has_anon_grant: boolean;
  approx_row_count: number;
}

interface WebhookStat {
  provider: string;
  total: number;
  processed: number;
  failed: number;
  duplicates: number;
  last_event_at: string | null;
}

function severityFor(row: AuditRow): { label: string; tone: "destructive" | "warning" | "default" } {
  if (!row.rls_enabled) return { label: "RLS disabled", tone: "destructive" };
  if (row.policy_count === 0) return { label: "No policies", tone: "destructive" };
  if (!row.has_service_role_grant) return { label: "Missing service grant", tone: "warning" };
  if (row.policy_count < 2) return { label: "Single policy", tone: "warning" };
  return { label: "Healthy", tone: "default" };
}

export function BackendHealthDashboard() {
  const audit = useQuery({
    queryKey: ["admin", "rls-audit"],
    queryFn: async (): Promise<AuditRow[]> => {
      const { data, error } = await supabase.rpc("admin_rls_audit");
      if (error) throw error;
      return (data ?? []) as AuditRow[];
    },
    staleTime: 60_000,
  });

  const webhooks = useQuery({
    queryKey: ["admin", "webhook-stats"],
    queryFn: async (): Promise<WebhookStat[]> => {
      const { data, error } = await supabase.rpc("admin_webhook_stats", { _days: 7 });
      if (error) throw error;
      return (data ?? []) as WebhookStat[];
    },
    staleTime: 60_000,
  });

  const summary = useMemo(() => {
    const rows = audit.data ?? [];
    return {
      total: rows.length,
      rlsDisabled: rows.filter((r) => !r.rls_enabled).length,
      noPolicies: rows.filter((r) => r.rls_enabled && r.policy_count === 0).length,
      missingServiceGrant: rows.filter((r) => !r.has_service_role_grant).length,
      singlePolicy: rows.filter((r) => r.rls_enabled && r.policy_count === 1).length,
    };
  }, [audit.data]);

  const issues = (audit.data ?? []).filter((r) => severityFor(r).tone !== "default");
  const healthy = (audit.data ?? []).filter((r) => severityFor(r).tone === "default");

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="space-y-6"
    >
      <header className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5 text-accent" aria-hidden />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight">Backend Health</h2>
          <p className="text-sm text-muted-foreground">
            RLS coverage, table grants, and webhook delivery quality across the last 7 days.
          </p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={ShieldCheck}
          label="Tables audited"
          value={audit.isLoading ? "…" : summary.total.toString()}
          tone="default"
        />
        <SummaryCard
          icon={AlertTriangle}
          label="RLS disabled"
          value={audit.isLoading ? "…" : summary.rlsDisabled.toString()}
          tone={summary.rlsDisabled > 0 ? "destructive" : "default"}
        />
        <SummaryCard
          icon={AlertTriangle}
          label="No policies"
          value={audit.isLoading ? "…" : summary.noPolicies.toString()}
          tone={summary.noPolicies > 0 ? "destructive" : "default"}
        />
        <SummaryCard
          icon={Activity}
          label="Missing service grant"
          value={audit.isLoading ? "…" : summary.missingServiceGrant.toString()}
          tone={summary.missingServiceGrant > 0 ? "warning" : "default"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Webhook className="w-4 h-4 text-accent" aria-hidden /> Webhook deliveries (7d)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {webhooks.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (webhooks.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No webhook events recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Processed</TableHead>
                    <TableHead className="text-right">Failed</TableHead>
                    <TableHead className="text-right">Duplicates</TableHead>
                    <TableHead>Last event</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {webhooks.data!.map((row) => (
                    <TableRow key={row.provider}>
                      <TableCell className="font-medium capitalize">{row.provider}</TableCell>
                      <TableCell className="text-right">{row.total.toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-right text-emerald-600">{row.processed}</TableCell>
                      <TableCell className={`text-right ${row.failed > 0 ? "text-destructive font-semibold" : ""}`}>
                        {row.failed}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{row.duplicates}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {row.last_event_at
                          ? formatDistanceToNow(new Date(row.last_event_at), { addSuffix: true })
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="w-4 h-4 text-warning" aria-hidden /> Tables needing attention
            <Badge variant="secondary" className="ml-1">{issues.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {audit.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : issues.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-emerald-600">
              <CheckCircle2 className="w-4 h-4" aria-hidden /> All public tables look healthy.
            </div>
          ) : (
            <PolicyTable rows={issues} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-hidden /> Healthy tables
            <Badge variant="outline" className="ml-1">{healthy.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {audit.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <PolicyTable rows={healthy} compact />
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function PolicyTable({ rows, compact = false }: { rows: AuditRow[]; compact?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Table</TableHead>
            <TableHead className="text-center">RLS</TableHead>
            <TableHead className="text-center">Policies</TableHead>
            <TableHead className="text-center">Service</TableHead>
            <TableHead className="text-center">Auth</TableHead>
            <TableHead className="text-center">Anon</TableHead>
            <TableHead className="text-right">Rows</TableHead>
            {!compact && <TableHead>Status</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const sev = severityFor(row);
            return (
              <TableRow key={row.table_name}>
                <TableCell className="font-mono text-xs">{row.table_name}</TableCell>
                <TableCell className="text-center">
                  {row.rls_enabled ? "✓" : <span className="text-destructive font-semibold">✗</span>}
                </TableCell>
                <TableCell className="text-center font-medium">{row.policy_count}</TableCell>
                <TableCell className="text-center">{row.has_service_role_grant ? "✓" : "—"}</TableCell>
                <TableCell className="text-center">{row.has_authenticated_grant ? "✓" : "—"}</TableCell>
                <TableCell className="text-center">{row.has_anon_grant ? "✓" : "—"}</TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">
                  {row.approx_row_count >= 0 ? row.approx_row_count.toLocaleString("en-IN") : "—"}
                </TableCell>
                {!compact && (
                  <TableCell>
                    <Badge
                      variant={sev.tone === "default" ? "outline" : sev.tone === "warning" ? "secondary" : "destructive"}
                      className="text-[10px]"
                    >
                      {sev.label}
                    </Badge>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  tone: "default" | "warning" | "destructive";
}) {
  const toneClass =
    tone === "destructive"
      ? "border-destructive/40 bg-destructive/5"
      : tone === "warning"
        ? "border-warning/40 bg-warning/5"
        : "border-border";
  return (
    <Card className={toneClass}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
          <Icon className="w-3.5 h-3.5" aria-hidden /> {label}
        </div>
        <p className="text-2xl font-bold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}
