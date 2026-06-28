import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, Play, Save, Plus, Trash2 } from 'lucide-react';

type Tier = {
  name: string;
  min_spend: number;
  max_spend?: number | null;
  window_days: number;
  reward_pct: number;
};

type SimResult = {
  total_customers: number;
  tiers: Array<{
    tier_name: string;
    min_spend: number;
    customers: number;
    pct_of_base: number;
    total_spend: number;
    projected_reward_cost: number;
  }>;
  simulated_at: string;
};

const DEFAULT_TIERS: Tier[] = [
  { name: 'Silver', min_spend: 0, max_spend: 5000, window_days: 365, reward_pct: 1 },
  { name: 'Gold', min_spend: 5000, max_spend: 25000, window_days: 365, reward_pct: 2 },
  { name: 'Platinum', min_spend: 25000, max_spend: null, window_days: 365, reward_pct: 4 },
];

export function LoyaltyTierOptimizer() {
  const [tiers, setTiers] = useState<Tier[]>(DEFAULT_TIERS);
  const [scenario, setScenario] = useState('Q1 Tier Refresh');
  const [notes, setNotes] = useState('');
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<SimResult | null>(null);

  const update = (i: number, patch: Partial<Tier>) =>
    setTiers((p) => p.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));

  const runSim = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.rpc('simulate_loyalty_tiers' as any, { _tiers: tiers as any });
      if (error) throw error;
      setResult(data as unknown as SimResult);
    } catch (e: any) {
      toast.error(e.message || 'Simulation failed');
    } finally {
      setRunning(false);
    }
  };

  const saveScenario = async () => {
    if (!result) return toast.error('Run simulation first');
    setSaving(true);
    try {
      const totalCost = result.tiers.reduce((s, t) => s + Number(t.projected_reward_cost || 0), 0);
      const { error } = await (supabase.from('loyalty_tier_simulations' as any) as any).insert({
        scenario_name: scenario,
        proposed_tiers: tiers,
        baseline_metrics: { total_customers: result.total_customers },
        projected_metrics: { total_reward_cost: totalCost, tiers: result.tiers },
        notes,
        status: 'draft',
      });
      if (error) throw error;
      toast.success('Scenario saved');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Loyalty Tier Optimizer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Scenario Name</Label>
              <Input value={scenario} onChange={(e) => setScenario(e.target.value)} />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          </div>

          <div className="space-y-2">
            {tiers.map((t, i) => (
              <div key={i} className="grid gap-2 md:grid-cols-6 items-end border rounded-md p-3">
                <div>
                  <Label className="text-xs">Tier name</Label>
                  <Input value={t.name} onChange={(e) => update(i, { name: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Min spend (₹)</Label>
                  <Input type="number" value={t.min_spend} onChange={(e) => update(i, { min_spend: +e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Max spend (₹)</Label>
                  <Input
                    type="number"
                    value={t.max_spend ?? ''}
                    placeholder="∞"
                    onChange={(e) => update(i, { max_spend: e.target.value ? +e.target.value : null })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Window (days)</Label>
                  <Input type="number" value={t.window_days} onChange={(e) => update(i, { window_days: +e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Reward %</Label>
                  <Input type="number" step="0.1" value={t.reward_pct} onChange={(e) => update(i, { reward_pct: +e.target.value })} />
                </div>
                <Button variant="ghost" size="icon" onClick={() => setTiers((p) => p.filter((_, idx) => idx !== i))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setTiers((p) => [...p, { name: 'New Tier', min_spend: 0, max_spend: null, window_days: 365, reward_pct: 1 }])
              }
            >
              <Plus className="h-4 w-4 mr-1" /> Add Tier
            </Button>
          </div>

          <div className="flex gap-2">
            <Button onClick={runSim} disabled={running}>
              {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
              Run Simulation
            </Button>
            <Button variant="outline" onClick={saveScenario} disabled={!result || saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Scenario
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Projection — {result.total_customers.toLocaleString()} paying customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="py-2">Tier</th>
                    <th>Min ₹</th>
                    <th>Customers</th>
                    <th>% of base</th>
                    <th>Total spend</th>
                    <th>Reward cost</th>
                  </tr>
                </thead>
                <tbody>
                  {result.tiers.map((t) => (
                    <tr key={t.tier_name} className="border-t">
                      <td className="py-2 font-medium">{t.tier_name}</td>
                      <td>₹{Number(t.min_spend).toLocaleString()}</td>
                      <td>{t.customers.toLocaleString()}</td>
                      <td>{t.pct_of_base}%</td>
                      <td>₹{Number(t.total_spend).toLocaleString()}</td>
                      <td>₹{Number(t.projected_reward_cost).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
