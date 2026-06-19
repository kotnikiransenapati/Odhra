import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { CalendarClock, Save, Plus, Trash2, RefreshCw } from 'lucide-react';

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const TIMEZONES = ['Asia/Kolkata','Asia/Dubai','Asia/Singapore','Europe/London','UTC','America/New_York','America/Los_Angeles'];

interface Schedule {
  id?: string; vendor_id: string; timezone: string;
  cutoff_hours: Record<string, number | null>;
  lead_days: number; notes: string | null;
}
interface Holiday { id: string; vendor_id: string; holiday_date: string; reason: string | null; }

interface Props { vendorId: string; isAdmin?: boolean; }

const defaultCutoffs: Record<string, number | null> = { '0': null, '1': 17, '2': 17, '3': 17, '4': 17, '5': 17, '6': 14 };

export function VendorDispatchSchedule({ vendorId, isAdmin = false }: Props) {
  const [schedule, setSchedule] = useState<Schedule>({ vendor_id: vendorId, timezone: 'Asia/Kolkata', cutoff_hours: defaultCutoffs, lead_days: 1, notes: '' });
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [nextDispatch, setNextDispatch] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newHoliday, setNewHoliday] = useState({ date: '', reason: '' });

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('vendor_dispatch_schedule_get' as any, { _vendor_id: vendorId });
    if (error) { toast.error(error.message); setLoading(false); return; }
    const d = data as any;
    if (d?.schedule) {
      setSchedule({
        ...d.schedule,
        cutoff_hours: { ...defaultCutoffs, ...(d.schedule.cutoff_hours || {}) },
        notes: d.schedule.notes || '',
      });
    }
    setHolidays(d?.holidays || []);
    setNextDispatch(d?.next_dispatch || null);
    setLoading(false);
  }, [vendorId]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    const payload = {
      vendor_id: vendorId,
      timezone: schedule.timezone,
      cutoff_hours: schedule.cutoff_hours,
      lead_days: schedule.lead_days,
      notes: schedule.notes || null,
    };
    const { error } = await supabase.from('vendor_dispatch_schedules' as any).upsert(payload, { onConflict: 'vendor_id' });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Schedule saved');
    load();
  };

  const addHoliday = async () => {
    if (!newHoliday.date) { toast.error('Pick a date'); return; }
    const { error } = await supabase.from('vendor_dispatch_holidays' as any).insert({
      vendor_id: vendorId, holiday_date: newHoliday.date, reason: newHoliday.reason || null,
    });
    if (error) { toast.error(error.message); return; }
    setNewHoliday({ date: '', reason: '' });
    load();
  };

  const removeHoliday = async (id: string) => {
    const { error } = await supabase.from('vendor_dispatch_holidays' as any).delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const setCutoff = (day: string, value: string) => {
    const num = value === '' ? null : Math.max(0, Math.min(23, parseInt(value, 10)));
    setSchedule(s => ({ ...s, cutoff_hours: { ...s.cutoff_hours, [day]: num } }));
  };

  if (loading) return <div className="text-sm text-muted-foreground p-6">Loading dispatch schedule…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2"><CalendarClock className="w-5 h-5" /> Dispatch Schedule</h3>
          <p className="text-sm text-muted-foreground">Set daily cutoff times and holidays. Next dispatch:
            {nextDispatch && <Badge className="ml-2">{new Date(nextDispatch).toLocaleDateString()}</Badge>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
          <Button size="sm" onClick={save} disabled={saving}><Save className="w-4 h-4 mr-1" />{saving ? 'Saving…' : 'Save'}</Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Cutoff Hours (24h, blank = closed)</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
            {DAYS.map((d, i) => (
              <div key={i}>
                <Label className="text-xs">{d}</Label>
                <Input
                  type="number" min={0} max={23}
                  placeholder="closed"
                  value={schedule.cutoff_hours[String(i)] ?? ''}
                  onChange={e => setCutoff(String(i), e.target.value)}
                />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            <div><Label>Timezone</Label>
              <Select value={schedule.timezone} onValueChange={v => setSchedule({ ...schedule, timezone: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIMEZONES.map(tz => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Lead Days (after cutoff)</Label>
              <Input type="number" min={0} max={30} value={schedule.lead_days}
                onChange={e => setSchedule({ ...schedule, lead_days: Math.max(0, Math.min(30, parseInt(e.target.value || '0', 10))) })} />
            </div>
            <div className="md:col-span-1"><Label>Notes</Label>
              <Input value={schedule.notes || ''} onChange={e => setSchedule({ ...schedule, notes: e.target.value })} placeholder="Visible internally" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Holidays ({holidays.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 mb-3 flex-wrap">
            <div><Label className="text-xs">Date</Label><Input type="date" value={newHoliday.date} onChange={e => setNewHoliday({ ...newHoliday, date: e.target.value })} /></div>
            <div className="flex-1 min-w-[180px]"><Label className="text-xs">Reason</Label><Input value={newHoliday.reason} onChange={e => setNewHoliday({ ...newHoliday, reason: e.target.value })} placeholder="Diwali, Inventory day…" /></div>
            <Button size="sm" onClick={addHoliday}><Plus className="w-4 h-4 mr-1" />Add</Button>
          </div>
          {holidays.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">No holidays scheduled.</p> :
            <div className="space-y-1.5">
              {holidays.map(h => (
                <div key={h.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{new Date(h.holiday_date).toLocaleDateString()}</Badge>
                    <span className="text-sm">{h.reason || '—'}</span>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => removeHoliday(h.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              ))}
            </div>}
        </CardContent>
      </Card>
    </div>
  );
}
