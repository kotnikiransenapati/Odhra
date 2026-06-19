import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { MailCheck, Save, Clock } from 'lucide-react';

type Pref = {
  id: string;
  frequency: 'off' | 'daily' | 'weekly' | 'monthly';
  channels: string[];
  send_hour_local: number;
  timezone: string;
  include_promotions: boolean;
  include_orders: boolean;
  include_recommendations: boolean;
  is_active: boolean;
  last_sent_at: string | null;
  next_due_at: string | null;
};

const defaultPref = (): Pref => ({
  id: '', frequency: 'weekly', channels: ['email'],
  send_hour_local: 9, timezone: 'Asia/Kolkata',
  include_promotions: true, include_orders: true, include_recommendations: true,
  is_active: true, last_sent_at: null, next_due_at: null,
});

const FREQS: Pref['frequency'][] = ['off', 'daily', 'weekly', 'monthly'];

export function NotificationDigestPreferences() {
  const [pref, setPref] = useState<Pref>(defaultPref());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [channelEmail, setChannelEmail] = useState(true);
  const [channelPush, setChannelPush] = useState(false);
  const [channelSms, setChannelSms] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('digest_my_preference');
      if (error) throw error;
      const row = Array.isArray(data) ? (data[0] as Pref | undefined) : (data as Pref | undefined);
      if (row) {
        setPref(row);
        setChannelEmail(row.channels?.includes('email') ?? true);
        setChannelPush(row.channels?.includes('push') ?? false);
        setChannelSms(row.channels?.includes('sms') ?? false);
      }
    } catch (e: any) { toast.error(e.message || 'Failed to load'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const channels: string[] = [];
      if (channelEmail) channels.push('email');
      if (channelPush) channels.push('push');
      if (channelSms) channels.push('sms');
      if (channels.length === 0 && pref.frequency !== 'off') {
        toast.error('Select at least one channel');
        setSaving(false);
        return;
      }
      const { error } = await supabase.rpc('digest_upsert_preference', {
        _frequency: pref.frequency,
        _channels: channels,
        _send_hour_local: pref.send_hour_local,
        _timezone: pref.timezone,
        _include_promotions: pref.include_promotions,
        _include_orders: pref.include_orders,
        _include_recommendations: pref.include_recommendations,
        _is_active: pref.is_active,
      });
      if (error) throw error;
      toast.success('Preferences saved');
      load();
    } catch (e: any) { toast.error(e.message || 'Failed'); }
    finally { setSaving(false); }
  };

  if (loading) {
    return <div className="space-y-3"><Skeleton className="h-8 w-64" /><Skeleton className="h-72 w-full" /></div>;
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MailCheck className="h-5 w-5" /> Notification Digest
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Bundle orders, promotions, and recommendations into one periodic summary instead of
          individual notifications.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Frequency</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {FREQS.map(f => (
              <Button
                key={f}
                variant={pref.frequency === f ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPref({ ...pref, frequency: f })}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {pref.frequency !== 'off' && (
          <>
            <div>
              <Label>Channels</Label>
              <div className="flex items-center gap-4 mt-2 flex-wrap">
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={channelEmail} onCheckedChange={setChannelEmail} /> Email
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={channelPush} onCheckedChange={setChannelPush} /> Push
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={channelSms} onCheckedChange={setChannelSms} /> SMS
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Send hour (local)</Label>
                <Input type="number" min={0} max={23} value={pref.send_hour_local}
                  onChange={(e) => setPref({ ...pref, send_hour_local: Math.max(0, Math.min(23, parseInt(e.target.value) || 0)) })} />
              </div>
              <div>
                <Label>Timezone</Label>
                <Input value={pref.timezone}
                  onChange={(e) => setPref({ ...pref, timezone: e.target.value })} />
              </div>
            </div>

            <div>
              <Label>Include in digest</Label>
              <div className="mt-2 space-y-2">
                <label className="flex items-center justify-between text-sm">
                  <span>Order updates</span>
                  <Switch checked={pref.include_orders}
                    onCheckedChange={(v) => setPref({ ...pref, include_orders: v })} />
                </label>
                <label className="flex items-center justify-between text-sm">
                  <span>Promotions & deals</span>
                  <Switch checked={pref.include_promotions}
                    onCheckedChange={(v) => setPref({ ...pref, include_promotions: v })} />
                </label>
                <label className="flex items-center justify-between text-sm">
                  <span>Personalized recommendations</span>
                  <Switch checked={pref.include_recommendations}
                    onCheckedChange={(v) => setPref({ ...pref, include_recommendations: v })} />
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span>Active</span>
              <Switch checked={pref.is_active}
                onCheckedChange={(v) => setPref({ ...pref, is_active: v })} />
            </div>
          </>
        )}

        {(pref.last_sent_at || pref.next_due_at) && (
          <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-1">
            {pref.last_sent_at && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> Last sent: {new Date(pref.last_sent_at).toLocaleString()}
              </div>
            )}
            {pref.next_due_at && pref.frequency !== 'off' && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> Next due: {new Date(pref.next_due_at).toLocaleString()}
              </div>
            )}
          </div>
        )}

        <Badge variant="outline">{pref.frequency === 'off' ? 'No digests will be sent' : `Digest: ${pref.frequency}`}</Badge>

        <Button onClick={save} disabled={saving} className="w-full gap-1">
          <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save Preferences'}
        </Button>
      </CardContent>
    </Card>
  );
}

export default NotificationDigestPreferences;
