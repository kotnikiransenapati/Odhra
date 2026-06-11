import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ListChecks, RefreshCw, Sprout, CheckCircle2 } from 'lucide-react';

const STATUSES = ['pending', 'in_progress', 'completed', 'skipped'] as const;

interface Task {
  id: string; task_key: string; title: string; description: string | null;
  is_required: boolean; status: string; due_at: string | null;
  completed_at: string | null; sort_order: number;
}

interface Props { vendorId: string; }

export function VendorOnboardingChecklist({ vendorId }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [l, s] = await Promise.all([
      supabase.rpc('vendor_onboarding_list' as any, { _vendor_id: vendorId }),
      supabase.rpc('vendor_onboarding_stats' as any, { _vendor_id: vendorId }),
    ]);
    if (l.error) toast.error(l.error.message); else setTasks((l.data as Task[]) || []);
    if (s.error) toast.error(s.error.message); else setStats(s.data || {});
    setLoading(false);
  };
  useEffect(() => { if (vendorId) load(); /* eslint-disable-next-line */ }, [vendorId]);

  const seed = async () => {
    const { data, error } = await supabase.rpc('vendor_onboarding_seed' as any, { _vendor_id: vendorId });
    if (error) { toast.error(error.message); return; }
    toast.success(`Seeded ${data ?? 0} default task(s)`);
    load();
  };

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.rpc('vendor_onboarding_set_status' as any, { _task_id: id, _status: status });
    if (error) { toast.error(error.message); return; }
    load();
  };

  const sVariant = (s: string): any =>
    s === 'completed' ? 'default' : s === 'in_progress' ? 'secondary' : s === 'skipped' ? 'outline' : 'outline';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2"><ListChecks className="w-5 h-5" /> Onboarding Checklist</h3>
          <p className="text-xs text-muted-foreground">
            {stats.completed ?? 0}/{stats.total ?? 0} done · {stats.required_completed ?? 0}/{stats.required ?? 0} required
            {stats.overdue > 0 && <> · <span className="text-destructive font-medium">{stats.overdue} overdue</span></>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
          {tasks.length === 0 && <Button size="sm" onClick={seed}><Sprout className="w-4 h-4 mr-2" />Seed Defaults</Button>}
        </div>
      </div>

      <Progress value={Number(stats.percent ?? 0)} className="h-2" />

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> :
       tasks.length === 0 ? <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No onboarding tasks. Click "Seed Defaults" to start.</CardContent></Card> : (
        <div className="space-y-2">
          {tasks.map(t => (
            <Card key={t.id}>
              <CardContent className="p-3 flex items-start gap-3">
                <CheckCircle2 className={`w-5 h-5 mt-0.5 shrink-0 ${t.status === 'completed' ? 'text-primary' : 'text-muted-foreground/40'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-medium ${t.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>{t.title}</span>
                    {t.is_required && <Badge variant="outline" className="text-[10px]">required</Badge>}
                    <Badge variant={sVariant(t.status)} className="text-[10px]">{t.status}</Badge>
                  </div>
                  {t.description && <p className="text-xs text-muted-foreground mt-1">{t.description}</p>}
                </div>
                <Select value={t.status} onValueChange={(v) => setStatus(t.id, v)}>
                  <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
