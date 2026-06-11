import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Bell, Save } from 'lucide-react';

const CATEGORIES = ['security', 'orders', 'inventory', 'payments', 'vendors', 'reviews', 'system'];
const SEVERITIES = ['low', 'medium', 'high', 'critical'];

export function AdminNotificationPreferences() {
  const [prefs, setPrefs] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_my_admin_notification_prefs' as any);
    if (error) toast.error(error.message);
    else setPrefs(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!prefs) return;
    setSaving(true);
    const { error } = await supabase.rpc('upsert_my_admin_notification_prefs' as any, {
      _channel_in_app: prefs.channel_in_app,
      _channel_email: prefs.channel_email,
      _channel_sms: prefs.channel_sms,
      _severity_threshold: prefs.severity_threshold,
      _categories: prefs.categories,
      _quiet_hours_start: prefs.quiet_hours_start,
      _quiet_hours_end: prefs.quiet_hours_end,
      _timezone: prefs.timezone,
      _is_active: prefs.is_active,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Preferences saved');
  };

  const toggleCategory = (c: string) => {
    const cats = prefs.categories || [];
    setPrefs({ ...prefs, categories: cats.includes(c) ? cats.filter((x: string) => x !== c) : [...cats, c] });
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!prefs) return <p className="text-sm text-muted-foreground">No preferences available.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><Bell className="w-6 h-6" /> Notification Preferences</h2>
        <p className="text-sm text-muted-foreground">Control how and when you receive admin alerts</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Master Switch</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="font-medium">Enable Notifications</p>
            <p className="text-xs text-muted-foreground">Disable to mute all admin alerts</p>
          </div>
          <Switch checked={prefs.is_active} onCheckedChange={v => setPrefs({ ...prefs, is_active: v })} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Channels</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {[
            { k: 'channel_in_app', l: 'In-App', d: 'Show inside the admin notification bell' },
            { k: 'channel_email', l: 'Email', d: 'Send to your admin email address' },
            { k: 'channel_sms', l: 'SMS', d: 'Critical alerts only (uses SMS credits)' },
          ].map(c => (
            <div key={c.k} className="flex items-center justify-between">
              <div>
                <p className="font-medium">{c.l}</p>
                <p className="text-xs text-muted-foreground">{c.d}</p>
              </div>
              <Switch checked={!!prefs[c.k]} onCheckedChange={v => setPrefs({ ...prefs, [c.k]: v })} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Filters</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Minimum Severity</Label>
            <Select value={prefs.severity_threshold} onValueChange={v => setPrefs({ ...prefs, severity_threshold: v })}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>{SEVERITIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">Only notify for events at or above this severity</p>
          </div>
          <div>
            <Label>Categories</Label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {CATEGORIES.map(c => (
                <Badge
                  key={c}
                  variant={prefs.categories?.includes(c) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleCategory(c)}
                >
                  {c}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Quiet Hours</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <div>
            <Label>Start</Label>
            <Input type="time" value={prefs.quiet_hours_start || ''} onChange={e => setPrefs({ ...prefs, quiet_hours_start: e.target.value || null })} />
          </div>
          <div>
            <Label>End</Label>
            <Input type="time" value={prefs.quiet_hours_end || ''} onChange={e => setPrefs({ ...prefs, quiet_hours_end: e.target.value || null })} />
          </div>
          <div className="col-span-2">
            <Label>Timezone</Label>
            <Input value={prefs.timezone} onChange={e => setPrefs({ ...prefs, timezone: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving} className="w-full"><Save className="w-4 h-4 mr-2" />{saving ? 'Saving…' : 'Save Preferences'}</Button>
    </div>
  );
}
