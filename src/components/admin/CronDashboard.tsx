import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Clock, RefreshCw, CheckCircle2, XCircle, AlertCircle, Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface CronRun {
  started_at: string;
  ended_at: string | null;
  status: string;
  duration_ms: number;
  message: string;
}

interface CronJob {
  jobid: number;
  jobname: string;
  schedule: string;
  command: string;
  active: boolean;
  last_run_started_at: string | null;
  last_status: string | null;
  last_duration_ms: number | null;
  last_return_message: string | null;
  recent_runs: CronRun[];
}

const statusIcon = (s: string | null) => {
  if (s === 'succeeded') return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (s === 'failed') return <XCircle className="h-4 w-4 text-red-500" />;
  if (s === 'running' || s === 'starting') return <Activity className="h-4 w-4 text-blue-500 animate-pulse" />;
  return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
};

const fmtMs = (ms: number | null) => {
  if (ms == null) return '—';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
};

export function CronDashboard() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('admin_cron_status', { _runs_per_job: 20 });
    setLoading(false);
    if (error) {
      console.error('cron status failed', error);
      return;
    }
    setJobs((data || []) as unknown as CronJob[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  const totals = {
    active: jobs.filter((j) => j.active).length,
    failing: jobs.filter((j) => j.last_status === 'failed').length,
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ stiffness: 400, damping: 30 }} className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> Scheduled Jobs</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {jobs.length} total · {totals.active} active
              {totals.failing > 0 && <span className="text-red-500"> · {totals.failing} failing</span>}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <div className="text-center text-muted-foreground py-10 text-sm">No cron jobs scheduled.</div>
          ) : (
            <Accordion type="multiple" className="space-y-2">
              {jobs.map((j) => (
                <AccordionItem key={j.jobid} value={String(j.jobid)} className="border rounded-md px-3">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3 flex-1 text-left">
                      {statusIcon(j.last_status)}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{j.jobname}</div>
                        <div className="text-xs text-muted-foreground flex gap-2 items-center">
                          <code className="px-1.5 py-0.5 rounded bg-muted">{j.schedule}</code>
                          {j.last_run_started_at && (
                            <span>· last {formatDistanceToNow(new Date(j.last_run_started_at), { addSuffix: true })}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 items-center shrink-0">
                        {!j.active && <Badge variant="outline" className="text-muted-foreground">paused</Badge>}
                        {j.last_status && (
                          <Badge variant="outline" className={
                            j.last_status === 'succeeded' ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30'
                            : j.last_status === 'failed' ? 'bg-red-500/10 text-red-700 border-red-500/30'
                            : ''
                          }>{j.last_status}</Badge>
                        )}
                        <span className="text-xs text-muted-foreground tabular-nums">{fmtMs(j.last_duration_ms)}</span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 pt-2">
                    <div>
                      <div className="text-xs font-medium mb-1">Command</div>
                      <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-32 whitespace-pre-wrap">{j.command}</pre>
                    </div>
                    {j.last_return_message && (
                      <div>
                        <div className="text-xs font-medium mb-1">Last message</div>
                        <pre className={`p-2 rounded text-xs overflow-auto max-h-32 whitespace-pre-wrap ${j.last_status === 'failed' ? 'bg-destructive/5 text-destructive border border-destructive/20' : 'bg-muted'}`}>{j.last_return_message}</pre>
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-medium mb-1">Recent runs</div>
                      <div className="space-y-1">
                        {j.recent_runs.length === 0 && <div className="text-xs text-muted-foreground">No runs yet.</div>}
                        {j.recent_runs.map((r, i) => (
                          <div key={i} className="flex items-center justify-between text-xs bg-muted/50 px-2 py-1.5 rounded">
                            <div className="flex items-center gap-2">
                              {statusIcon(r.status)}
                              <span className="tabular-nums">{new Date(r.started_at).toLocaleString()}</span>
                            </div>
                            <span className="tabular-nums text-muted-foreground">{fmtMs(r.duration_ms)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
