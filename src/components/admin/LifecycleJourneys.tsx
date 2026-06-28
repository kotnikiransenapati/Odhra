import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Plus, Play, Pause, Trash2, GitBranch, Zap, Mail, BellRing, Tag, Webhook, Clock, Gift } from 'lucide-react';
import { toast } from 'sonner';

type Journey = {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  trigger_config: Record<string, any>;
  status: 'draft' | 'active' | 'paused' | 'archived';
  throttle_per_user_days: number;
};

type Step = {
  id?: string;
  step_order: number;
  action_type: 'wait' | 'send_email' | 'send_notification' | 'grant_discount' | 'tag_segment' | 'webhook';
  action_config: Record<string, any>;
  wait_hours: number;
};

const ACTION_META: Record<string, { icon: any; label: string }> = {
  wait: { icon: Clock, label: 'Wait' },
  send_email: { icon: Mail, label: 'Send Email' },
  send_notification: { icon: BellRing, label: 'Notification' },
  grant_discount: { icon: Gift, label: 'Grant Discount' },
  tag_segment: { icon: Tag, label: 'Add to Segment' },
  webhook: { icon: Webhook, label: 'Webhook' },
};

export function LifecycleJourneys() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Journey | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [draft, setDraft] = useState<Partial<Journey>>({ trigger_type: 'segment_entry', status: 'draft', throttle_per_user_days: 30 });

  const journeys = useQuery({
    queryKey: ['lifecycle-journeys'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('lifecycle_journeys').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as Journey[];
    },
  });

  const steps = useQuery({
    queryKey: ['journey-steps', selected?.id],
    enabled: !!selected,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('journey_steps').select('*').eq('journey_id', selected!.id).order('step_order', { ascending: true });
      if (error) throw error;
      return data as Step[];
    },
  });

  const saveJourney = useMutation({
    mutationFn: async (j: Partial<Journey>) => {
      const payload = {
        name: j.name, description: j.description ?? null,
        trigger_type: j.trigger_type ?? 'manual',
        trigger_config: j.trigger_config ?? {},
        status: j.status ?? 'draft',
        throttle_per_user_days: j.throttle_per_user_days ?? 30,
      };
      const { data, error } = j.id
        ? await (supabase as any).from('lifecycle_journeys').update(payload).eq('id', j.id).select().single()
        : await (supabase as any).from('lifecycle_journeys').insert(payload).select().single();
      if (error) throw error;
      return data as Journey;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lifecycle-journeys'] }); toast.success('Saved'); setShowNew(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase as any).from('lifecycle_journeys').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lifecycle-journeys'] }),
  });

  const removeJourney = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('lifecycle_journeys').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lifecycle-journeys'] }); setSelected(null); toast.success('Deleted'); },
  });

  const addStep = useMutation({
    mutationFn: async (s: Step) => {
      const { error } = await (supabase as any).from('journey_steps').insert({ ...s, journey_id: selected!.id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['journey-steps', selected?.id] }),
  });

  const deleteStep = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('journey_steps').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['journey-steps', selected?.id] }),
  });

  const runNow = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('journey-runner', { body: {} });
      if (error) throw error;
      toast.success(`Runner OK: ${JSON.stringify(data)}`);
    } catch (e: any) {
      toast.error(`Runner failed: ${e.message}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><GitBranch className="w-6 h-6" /> Lifecycle Journeys</h2>
          <p className="text-sm text-muted-foreground">Automated multi-step customer journeys with segmentation triggers.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={runNow}><Zap className="w-4 h-4 mr-2" /> Run Now</Button>
          <Button onClick={() => { setDraft({ trigger_type: 'segment_entry', status: 'draft', throttle_per_user_days: 30 }); setShowNew(true); }}>
            <Plus className="w-4 h-4 mr-2" /> New Journey
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
          <CardHeader><CardTitle className="text-base">Journeys</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {journeys.isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {journeys.data?.map((j) => (
              <button key={j.id} onClick={() => setSelected(j)}
                className={`w-full text-left p-3 rounded-md border transition ${selected?.id === j.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium">{j.name}</span>
                  <Badge variant={j.status === 'active' ? 'default' : 'outline'}>{j.status}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">Trigger: {j.trigger_type}</div>
              </button>
            ))}
            {journeys.data?.length === 0 && <p className="text-sm text-muted-foreground">No journeys yet.</p>}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{selected ? selected.name : 'Select a journey'}</CardTitle>
          </CardHeader>
          <CardContent>
            {!selected && <p className="text-sm text-muted-foreground">Pick a journey on the left or create a new one.</p>}
            {selected && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {selected.status !== 'active' ? (
                    <Button size="sm" onClick={() => setStatus.mutate({ id: selected.id, status: 'active' })}>
                      <Play className="w-3 h-3 mr-1" /> Activate
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: selected.id, status: 'paused' })}>
                      <Pause className="w-3 h-3 mr-1" /> Pause
                    </Button>
                  )}
                  <Button size="sm" variant="destructive" onClick={() => removeJourney.mutate(selected.id)}>
                    <Trash2 className="w-3 h-3 mr-1" /> Delete
                  </Button>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-2">Steps</h4>
                  <div className="space-y-2">
                    {steps.data?.map((s) => {
                      const M = ACTION_META[s.action_type];
                      const Icon = M?.icon ?? Clock;
                      return (
                        <div key={s.id} className="flex items-center gap-3 p-3 border rounded-md">
                          <Badge variant="outline">#{s.step_order}</Badge>
                          <Icon className="w-4 h-4" />
                          <div className="flex-1">
                            <div className="text-sm font-medium">{M?.label ?? s.action_type}</div>
                            <div className="text-xs text-muted-foreground">Wait {s.wait_hours}h · {JSON.stringify(s.action_config).slice(0, 80)}</div>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => s.id && deleteStep.mutate(s.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                  <StepAdder onAdd={(s) => addStep.mutate({ ...s, step_order: (steps.data?.length ?? 0) + 1 })} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Lifecycle Journey</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Name" value={draft.name ?? ''} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            <Textarea placeholder="Description" value={draft.description ?? ''} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            <Select value={draft.trigger_type} onValueChange={(v) => setDraft({ ...draft, trigger_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="segment_entry">Segment Entry</SelectItem>
                <SelectItem value="signup">Signup</SelectItem>
                <SelectItem value="first_purchase">First Purchase</SelectItem>
                <SelectItem value="abandoned_cart">Abandoned Cart</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
            {draft.trigger_type === 'segment_entry' && (
              <Input placeholder="Segment ID" onChange={(e) => setDraft({ ...draft, trigger_config: { segment_id: e.target.value } })} />
            )}
            <Input type="number" placeholder="Throttle days" value={draft.throttle_per_user_days ?? 30}
              onChange={(e) => setDraft({ ...draft, throttle_per_user_days: Number(e.target.value) })} />
          </div>
          <DialogFooter>
            <Button onClick={() => saveJourney.mutate(draft)} disabled={!draft.name || saveJourney.isPending}>
              {saveJourney.isPending && <Loader2 className="w-3 h-3 mr-2 animate-spin" />} Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StepAdder({ onAdd }: { onAdd: (s: Step) => void }) {
  const [type, setType] = useState<Step['action_type']>('send_email');
  const [wait, setWait] = useState(24);
  const [cfg, setCfg] = useState('{}');
  return (
    <div className="mt-3 p-3 border-dashed border-2 rounded-md space-y-2">
      <div className="flex gap-2 items-center">
        <Select value={type} onValueChange={(v: any) => setType(v)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(ACTION_META).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="number" className="w-32" placeholder="Wait hrs" value={wait} onChange={(e) => setWait(Number(e.target.value))} />
        <Button size="sm" onClick={() => {
          let config = {};
          try { config = JSON.parse(cfg || '{}'); } catch { toast.error('Invalid JSON config'); return; }
          onAdd({ step_order: 0, action_type: type, action_config: config, wait_hours: wait });
          setCfg('{}');
        }}><Plus className="w-3 h-3 mr-1" /> Add Step</Button>
      </div>
      <Textarea rows={2} placeholder='Config JSON e.g. {"subject":"Hi","html":"<p>...</p>"}' value={cfg} onChange={(e) => setCfg(e.target.value)} />
    </div>
  );
}
