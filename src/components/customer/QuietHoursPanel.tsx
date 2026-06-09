import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Moon, Loader2, BellOff, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { haptic } from '@/lib/haptics';

const TIMEZONES = [
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
  'Europe/London',
  'America/New_York',
  'America/Los_Angeles',
  'Australia/Sydney',
];

interface DndState {
  dnd_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  timezone: string;
}

const DEFAULT: DndState = {
  dnd_enabled: false,
  quiet_hours_start: '22:00',
  quiet_hours_end: '07:00',
  timezone: 'Asia/Kolkata',
};

/**
 * Quiet Hours / Do-Not-Disturb panel.
 * Persists to email_preferences (4 new columns). The DB helper
 * is_in_quiet_hours(user_id) is consumed by notification edge functions
 * to suppress promotional sends during the window.
 */
export function QuietHoursPanel() {
  const { user } = useAuth();
  const [state, setState] = useState<DndState>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('email_preferences')
        .select('dnd_enabled, quiet_hours_start, quiet_hours_end, timezone')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!active) return;
      if (data) {
        setState({
          dnd_enabled: data.dnd_enabled ?? false,
          quiet_hours_start: (data.quiet_hours_start ?? '22:00').slice(0, 5),
          quiet_hours_end: (data.quiet_hours_end ?? '07:00').slice(0, 5),
          timezone: data.timezone ?? 'Asia/Kolkata',
        });
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const save = async (next: DndState) => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('email_preferences')
      .upsert(
        { user_id: user.id, ...next },
        { onConflict: 'user_id' },
      );
    setSaving(false);
    if (error) {
      haptic('error');
      toast({ title: 'Could not save', description: error.message, variant: 'destructive' });
      return;
    }
    haptic('success');
  };

  const update = (patch: Partial<DndState>) => {
    const next = { ...state, ...patch };
    setState(next);
    save(next);
  };

  if (!user) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="glass rounded-2xl p-5 border border-border/40"
      aria-labelledby="dnd-heading"
    >
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-2">
          <Moon className="w-5 h-5 text-accent" aria-hidden />
          <h2 id="dnd-heading" className="font-semibold">Quiet Hours</h2>
        </div>
        {saving && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" aria-label="Saving" />}
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Mute promotional pushes, marketing emails & WhatsApp blasts during your sleep window.
        Order, shipping and security alerts are always delivered.
      </p>

      {loading ? (
        <div className="h-32 rounded-xl bg-muted/30 animate-pulse" />
      ) : (
        <div className="space-y-4">
          <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-background/40 border border-border/40 cursor-pointer">
            <div className="flex items-center gap-2 min-w-0">
              <BellOff className="w-4 h-4 text-accent shrink-0" aria-hidden />
              <div className="min-w-0">
                <p className="text-sm font-medium">Do Not Disturb</p>
                <p className="text-xs text-muted-foreground">Pause non-critical notifications nightly.</p>
              </div>
            </div>
            <Switch
              checked={state.dnd_enabled}
              onCheckedChange={(v) => update({ dnd_enabled: v })}
              aria-label="Toggle Do Not Disturb"
            />
          </label>

          <div className={`grid grid-cols-2 gap-3 transition-opacity ${state.dnd_enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
            <div className="space-y-1.5">
              <Label htmlFor="qh-start" className="text-xs">From</Label>
              <Input
                id="qh-start"
                type="time"
                value={state.quiet_hours_start}
                onChange={(e) => update({ quiet_hours_start: e.target.value })}
                disabled={!state.dnd_enabled}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qh-end" className="text-xs">Until</Label>
              <Input
                id="qh-end"
                type="time"
                value={state.quiet_hours_end}
                onChange={(e) => update({ quiet_hours_end: e.target.value })}
                disabled={!state.dnd_enabled}
              />
            </div>
          </div>

          <div className={`space-y-1.5 transition-opacity ${state.dnd_enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
            <Label htmlFor="qh-tz" className="text-xs flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" aria-hidden /> Timezone
            </Label>
            <Select
              value={state.timezone}
              onValueChange={(v) => update({ timezone: v })}
              disabled={!state.dnd_enabled}
            >
              <SelectTrigger id="qh-tz">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>{tz.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {state.dnd_enabled && (
            <p className="text-[11px] text-muted-foreground">
              Quiet from <span className="font-medium text-foreground">{state.quiet_hours_start}</span> to{' '}
              <span className="font-medium text-foreground">{state.quiet_hours_end}</span>{' '}
              ({state.timezone.replace('_', ' ')}). Overnight windows wrap past midnight automatically.
            </p>
          )}
        </div>
      )}
    </motion.section>
  );
}
