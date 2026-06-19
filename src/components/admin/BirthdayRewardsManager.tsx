import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Cake, Save, Play, RefreshCw } from 'lucide-react';

interface Config {
  enabled: boolean; loyalty_points: number; discount_percent: number;
  code_valid_days: number; window_days: number;
}
interface Issuance {
  id: string; user_id: string; reward_year: number; points_awarded: number;
  discount_code: string | null; discount_percent: number | null; code_expires_at: string | null; issued_at: string;
}

export function BirthdayRewardsManager() {
  const [cfg, setCfg] = useState<Config>({ enabled: true, loyalty_points: 200, discount_percent: 15, code_valid_days: 14, window_days: 0 });
  const [issuances, setIssuances] = useState<Issuance[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);

  const load = async () => {
    setLoading(true);
    const [c, i] = await Promise.all([
      supabase.from('birthday_reward_config' as any).select('*').eq('id', 1).maybeSingle(),
      supabase.from('birthday_reward_issuances' as any).select('*').order('issued_at', { ascending: false }).limit(50),
    ]);
    if (c.error) toast.error(c.error.message); else if (c.data) setCfg(c.data as any);
    if (i.error) toast.error(i.error.message); else setIssuances((i.data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from('birthday_reward_config' as any).update({
      enabled: cfg.enabled, loyalty_points: cfg.loyalty_points,
      discount_percent: cfg.discount_percent, code_valid_days: cfg.code_valid_days,
      window_days: cfg.window_days,
    }).eq('id', 1);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Saved');
  };

  const runNow = async () => {
    setRunning(true);
    const { data, error } = await supabase.rpc('process_birthday_rewards' as any);
    setRunning(false);
    if (error) { toast.error(error.message); return; }
    const d = data as any;
    toast.success(`Issued ${d?.issued ?? 0} reward(s)`);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Cake className="w-6 h-6" /> Birthday Rewards</h2>
          <p className="text-sm text-muted-foreground">Automatically gift loyalty points + discount code to customers on their birthday</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
          <Button variant="outline" size="sm" onClick={runNow} disabled={running}><Play className="w-4 h-4 mr-1" />{running ? 'Running…' : 'Run Now'}</Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Configuration</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div><Label className="cursor-pointer">Enabled</Label><p className="text-xs text-muted-foreground">When off, scheduled job is a no-op</p></div>
            <Switch checked={cfg.enabled} onCheckedChange={v => setCfg({ ...cfg, enabled: v })} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><Label>Loyalty Points</Label><Input type="number" min={0} value={cfg.loyalty_points} onChange={e => setCfg({ ...cfg, loyalty_points: parseInt(e.target.value || '0', 10) })} /></div>
            <div><Label>Discount %</Label><Input type="number" min={0} max={90} value={cfg.discount_percent} onChange={e => setCfg({ ...cfg, discount_percent: parseInt(e.target.value || '0', 10) })} /></div>
            <div><Label>Code Valid (days)</Label><Input type="number" min={1} max={90} value={cfg.code_valid_days} onChange={e => setCfg({ ...cfg, code_valid_days: parseInt(e.target.value || '0', 10) })} /></div>
            <div><Label>Window (± days)</Label><Input type="number" min={0} max={7} value={cfg.window_days} onChange={e => setCfg({ ...cfg, window_days: parseInt(e.target.value || '0', 10) })} /></div>
          </div>
          <Button onClick={save} disabled={saving}><Save className="w-4 h-4 mr-1" />{saving ? 'Saving…' : 'Save Config'}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Recent Issuances ({issuances.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="text-sm text-muted-foreground">Loading…</div> :
           issuances.length === 0 ? <div className="text-sm text-muted-foreground py-6 text-center">No rewards issued yet. Click "Run Now" to process today's birthdays.</div> :
           <div className="space-y-2">
            {issuances.map(i => (
              <div key={i.id} className="flex items-center justify-between gap-3 p-3 border rounded-lg">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge>{i.reward_year}</Badge>
                    {i.discount_code && <Badge variant="outline" className="font-mono">{i.discount_code}</Badge>}
                    {i.discount_percent != null && <Badge variant="secondary">{i.discount_percent}% off</Badge>}
                    <span className="text-xs text-muted-foreground">+{i.points_awarded} pts</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 font-mono truncate">{i.user_id}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{new Date(i.issued_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>}
        </CardContent>
      </Card>
    </div>
  );
}
