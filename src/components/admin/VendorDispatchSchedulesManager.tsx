import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { haptic } from '@/lib/haptics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { CalendarClock, Clock, Plus, RefreshCw, Save, Search, Trash2, Truck } from 'lucide-react';

type VendorLite = { id: string; brand_name: string | null };
type DispatchSchedule = {
  id?: string;
  vendor_id: string;
  timezone: string;
  cutoff_hours: Record<string, number | null>;
  lead_days: number;
  notes: string | null;
};
type DispatchHoliday = { id: string; vendor_id: string; holiday_date: string; reason: string | null; created_at?: string };

const DAYS = [
  ['0', 'Sun'], ['1', 'Mon'], ['2', 'Tue'], ['3', 'Wed'], ['4', 'Thu'], ['5', 'Fri'], ['6', 'Sat'],
] as const;
const TIMEZONES = ['Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'UTC', 'America/New_York', 'America/Los_Angeles'];
const DEFAULT_CUTOFFS: Record<string, number | null> = { '0': null, '1': 17, '2': 17, '3': 17, '4': 17, '5': 17, '6': 14 };

const normalizeCutoffs = (value: unknown): Record<string, number | null> => {
  const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return Object.fromEntries(DAYS.map(([key]) => {
    const candidate = raw[key] ?? DEFAULT_CUTOFFS[key];
    if (candidate === null || candidate === '') return [key, null];
    const parsed = Number(candidate);
    return [key, Number.isInteger(parsed) && parsed >= 0 && parsed <= 23 ? parsed : null];
  })) as Record<string, number | null>;
};

const makeDefaultSchedule = (vendorId: string): DispatchSchedule => ({
  vendor_id: vendorId,
  timezone: 'Asia/Kolkata',
  cutoff_hours: { ...DEFAULT_CUTOFFS },
  lead_days: 1,
  notes: '',
});

const dateLabel = (date?: string | null) => date ? new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export function VendorDispatchSchedulesManager() {
  const [vendors, setVendors] = useState<VendorLite[]>([]);
  const [schedules, setSchedules] = useState<DispatchSchedule[]>([]);
  const [holidays, setHolidays] = useState<DispatchHoliday[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [schedule, setSchedule] = useState<DispatchSchedule>(makeDefaultSchedule(''));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [newHoliday, setNewHoliday] = useState({ date: '', reason: '' });
  const [placedAt, setPlacedAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [nextDispatch, setNextDispatch] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: vendorRows, error: vendorError }, { data: scheduleRows, error: scheduleError }, { data: holidayRows, error: holidayError }] = await Promise.all([
        supabase.from('vendors').select('id,brand_name').order('brand_name').limit(1000),
        supabase.from('vendor_dispatch_schedules').select('*').order('updated_at', { ascending: false }),
        supabase.from('vendor_dispatch_holidays').select('*').order('holiday_date', { ascending: true }),
      ]);
      if (vendorError) throw vendorError;
      if (scheduleError) throw scheduleError;
      if (holidayError) throw holidayError;
      setVendors((vendorRows as VendorLite[]) || []);
      setSchedules(((scheduleRows || []) as any[]).map(row => ({ ...row, cutoff_hours: normalizeCutoffs(row.cutoff_hours) })));
      setHolidays((holidayRows as DispatchHoliday[]) || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load dispatch controls');
      haptic('error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!selectedVendorId && vendors.length) setSelectedVendorId(vendors[0].id);
  }, [selectedVendorId, vendors]);

  useEffect(() => {
    if (!selectedVendorId) return;
    const existing = schedules.find(item => item.vendor_id === selectedVendorId);
    setSchedule(existing ? { ...existing, cutoff_hours: normalizeCutoffs(existing.cutoff_hours) } : makeDefaultSchedule(selectedVendorId));
  }, [selectedVendorId, schedules]);

  const selectedVendor = useMemo(() => vendors.find(v => v.id === selectedVendorId), [selectedVendorId, vendors]);
  const scheduleByVendor = useMemo(() => new Map(schedules.map(item => [item.vendor_id, item])), [schedules]);
  const holidaysByVendor = useMemo(() => {
    const map = new Map<string, DispatchHoliday[]>();
    holidays.forEach(holiday => map.set(holiday.vendor_id, [...(map.get(holiday.vendor_id) || []), holiday]));
    return map;
  }, [holidays]);

  const filteredVendors = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vendors;
    return vendors.filter(v => (v.brand_name || 'Vendor').toLowerCase().includes(q));
  }, [search, vendors]);

  const selectedHolidays = useMemo(() => holidaysByVendor.get(selectedVendorId) || [], [holidaysByVendor, selectedVendorId]);
  const stats = useMemo(() => {
    const configured = schedules.length;
    const avgLead = configured ? schedules.reduce((sum, item) => sum + Number(item.lead_days || 0), 0) / configured : 0;
    const blackoutDays = holidays.filter(h => new Date(h.holiday_date) >= new Date(new Date().toDateString())).length;
    return { vendors: vendors.length, configured, avgLead: avgLead.toFixed(1), blackoutDays };
  }, [holidays, schedules, vendors.length]);

  const refreshNextDispatch = useCallback(async () => {
    if (!selectedVendorId) return;
    try {
      const at = placedAt ? new Date(placedAt).toISOString() : new Date().toISOString();
      const { data, error } = await supabase.rpc('vendor_compute_next_dispatch', { _vendor_id: selectedVendorId, _placed_at: at });
      if (error) throw error;
      setNextDispatch(data || null);
    } catch (error: any) {
      toast.error(error.message || 'Dispatch preview failed');
    }
  }, [placedAt, selectedVendorId]);

  useEffect(() => { refreshNextDispatch(); }, [refreshNextDispatch]);

  const setCutoff = (key: string, value: string) => {
    setSchedule(current => ({
      ...current,
      cutoff_hours: { ...current.cutoff_hours, [key]: value === 'closed' ? null : Number(value) },
    }));
    haptic('selection');
  };

  const save = async () => {
    if (!selectedVendorId) return toast.error('Select a vendor first');
    const leadDays = Number(schedule.lead_days);
    if (!Number.isInteger(leadDays) || leadDays < 0 || leadDays > 30) return toast.error('Lead days must be 0–30');
    setSaving(true);
    try {
      const payload = {
        vendor_id: selectedVendorId,
        timezone: schedule.timezone || 'Asia/Kolkata',
        cutoff_hours: normalizeCutoffs(schedule.cutoff_hours),
        lead_days: leadDays,
        notes: schedule.notes?.trim() || null,
      };
      const { error } = await supabase.from('vendor_dispatch_schedules').upsert(payload, { onConflict: 'vendor_id' });
      if (error) throw error;
      toast.success('Dispatch schedule saved');
      haptic('success');
      await load();
      await refreshNextDispatch();
    } catch (error: any) {
      toast.error(error.message || 'Save failed');
      haptic('error');
    } finally {
      setSaving(false);
    }
  };

  const addHoliday = async () => {
    if (!selectedVendorId) return toast.error('Select a vendor first');
    if (!newHoliday.date) return toast.error('Pick a holiday date');
    if (selectedHolidays.some(h => h.holiday_date === newHoliday.date)) return toast.error('Holiday already exists for this vendor');
    try {
      const { error } = await supabase.from('vendor_dispatch_holidays').insert({
        vendor_id: selectedVendorId,
        holiday_date: newHoliday.date,
        reason: newHoliday.reason.trim().slice(0, 160) || null,
      });
      if (error) throw error;
      setNewHoliday({ date: '', reason: '' });
      toast.success('Holiday added');
      haptic('success');
      await load();
      await refreshNextDispatch();
    } catch (error: any) {
      toast.error(error.message || 'Holiday save failed');
      haptic('error');
    }
  };

  const removeHoliday = async (id: string) => {
    if (!confirm('Remove this dispatch holiday?')) return;
    try {
      const { error } = await supabase.from('vendor_dispatch_holidays').delete().eq('id', id);
      if (error) throw error;
      toast.success('Holiday removed');
      await load();
      await refreshNextDispatch();
    } catch (error: any) {
      toast.error(error.message || 'Delete failed');
      haptic('error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2"><CalendarClock className="h-6 w-6" /> Vendor Dispatch Schedules</h2>
          <p className="text-sm text-muted-foreground">Centralized fulfillment calendars with cutoffs, lead times, holidays, and dispatch previews.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
          <Button size="sm" onClick={save} disabled={saving || !selectedVendorId}><Save className="h-4 w-4 mr-1" />{saving ? 'Saving…' : 'Save schedule'}</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="pt-5"><div className="text-xs text-muted-foreground">Vendors</div><div className="text-2xl font-semibold">{stats.vendors}</div></CardContent></Card>
        <Card><CardContent className="pt-5"><div className="text-xs text-muted-foreground">Configured</div><div className="text-2xl font-semibold">{stats.configured}</div></CardContent></Card>
        <Card><CardContent className="pt-5"><div className="text-xs text-muted-foreground">Avg lead days</div><div className="text-2xl font-semibold">{stats.avgLead}</div></CardContent></Card>
        <Card><CardContent className="pt-5"><div className="text-xs text-muted-foreground">Upcoming blackout days</div><div className="text-2xl font-semibold">{stats.blackoutDays}</div></CardContent></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Truck className="h-4 w-4" /> Vendors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search vendors…" value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
            <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
              {loading ? Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-16 rounded-lg" />) : filteredVendors.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">No vendors found.</div>
              ) : filteredVendors.map(vendor => {
                const configured = scheduleByVendor.has(vendor.id);
                const count = holidaysByVendor.get(vendor.id)?.length || 0;
                return (
                  <button
                    key={vendor.id}
                    type="button"
                    onClick={() => { setSelectedVendorId(vendor.id); haptic('selection'); }}
                    className="w-full rounded-lg border p-3 text-left transition hover:bg-muted/50 data-[selected=true]:border-primary data-[selected=true]:bg-muted"
                    data-selected={vendor.id === selectedVendorId}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">{vendor.brand_name || 'Unnamed vendor'}</span>
                      <Badge variant={configured ? 'default' : 'secondary'}>{configured ? 'Ready' : 'Default'}</Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{count} holiday{count === 1 ? '' : 's'} configured</div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <CardTitle className="text-base">{selectedVendor?.brand_name || 'Select a vendor'}</CardTitle>
                  <p className="text-xs text-muted-foreground">Cutoff hours use 24-hour local time; closed days are skipped automatically.</p>
                </div>
                {nextDispatch && <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Next: {dateLabel(nextDispatch)}</Badge>}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="sm:col-span-2">
                  <Label>Timezone</Label>
                  <Select value={schedule.timezone} onValueChange={(value) => setSchedule(current => ({ ...current, timezone: value }))} disabled={!selectedVendorId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TIMEZONES.map(timezone => <SelectItem key={timezone} value={timezone}>{timezone}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Lead days</Label>
                  <Input type="number" min={0} max={30} value={schedule.lead_days} disabled={!selectedVendorId}
                    onChange={(event) => setSchedule(current => ({ ...current, lead_days: Math.max(0, Math.min(30, Number(event.target.value || 0))) }))} />
                </div>
                <div>
                  <Label>Simulate placed at</Label>
                  <Input type="datetime-local" value={placedAt} onChange={(event) => setPlacedAt(event.target.value)} disabled={!selectedVendorId} />
                </div>
              </div>

              <div>
                <Label>Daily cutoff matrix</Label>
                <div className="mt-2 grid gap-2 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-7">
                  {DAYS.map(([key, label]) => (
                    <div key={key} className="rounded-lg border p-2">
                      <div className="mb-1 text-xs font-medium">{label}</div>
                      <Select value={schedule.cutoff_hours[key] === null ? 'closed' : String(schedule.cutoff_hours[key])} onValueChange={(value) => setCutoff(key, value)} disabled={!selectedVendorId}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="closed">Closed</SelectItem>
                          {Array.from({ length: 24 }).map((_, hour) => <SelectItem key={hour} value={String(hour)}>{String(hour).padStart(2, '0')}:00</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Internal notes</Label>
                <Textarea rows={3} value={schedule.notes || ''} disabled={!selectedVendorId} onChange={(event) => setSchedule(current => ({ ...current, notes: event.target.value }))} placeholder="Pickup constraints, courier handoff windows, or vendor-specific exceptions…" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Dispatch holidays</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 md:grid-cols-[180px_minmax(0,1fr)_auto] md:items-end">
                <div><Label>Date</Label><Input type="date" value={newHoliday.date} onChange={(event) => setNewHoliday(current => ({ ...current, date: event.target.value }))} disabled={!selectedVendorId} /></div>
                <div><Label>Reason</Label><Input value={newHoliday.reason} onChange={(event) => setNewHoliday(current => ({ ...current, reason: event.target.value }))} placeholder="Festival, maintenance, stock count…" disabled={!selectedVendorId} /></div>
                <Button onClick={addHoliday} disabled={!selectedVendorId}><Plus className="h-4 w-4 mr-1" />Add</Button>
              </div>
              {selectedHolidays.length === 0 ? (
                <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">No holiday exceptions for this vendor.</div>
              ) : (
                <div className="space-y-2">
                  {selectedHolidays.map(holiday => (
                    <div key={holiday.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                      <div className="min-w-0">
                        <div className="font-medium">{dateLabel(holiday.holiday_date)}</div>
                        <div className="text-sm text-muted-foreground truncate">{holiday.reason || 'No reason provided'}</div>
                      </div>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeHoliday(holiday.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default VendorDispatchSchedulesManager;