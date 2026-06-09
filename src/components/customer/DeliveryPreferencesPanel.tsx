import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Truck, Loader2, PackageCheck, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
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

interface Prefs {
  delivery_instructions: string;
  leave_unattended: boolean;
  preferred_delivery_window: 'any' | 'morning' | 'afternoon' | 'evening' | 'weekend';
}

const DEFAULT: Prefs = {
  delivery_instructions: '',
  leave_unattended: false,
  preferred_delivery_window: 'any',
};

const WINDOWS: Array<{ value: Prefs['preferred_delivery_window']; label: string }> = [
  { value: 'any', label: 'Any time' },
  { value: 'morning', label: 'Morning (8 AM – 12 PM)' },
  { value: 'afternoon', label: 'Afternoon (12 – 5 PM)' },
  { value: 'evening', label: 'Evening (5 – 9 PM)' },
  { value: 'weekend', label: 'Weekends only' },
];

const MAX_LEN = 280;

/**
 * Default delivery preferences applied across all orders.
 * Persists to profiles.delivery_instructions / leave_unattended /
 * preferred_delivery_window. Checkout reads these as defaults and may
 * be overridden per-order at the checkout step.
 */
export function DeliveryPreferencesPanel() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('delivery_instructions, leave_unattended, preferred_delivery_window')
        .eq('id', user.id)
        .maybeSingle();
      if (!active) return;
      if (data) {
        setPrefs({
          delivery_instructions: data.delivery_instructions ?? '',
          leave_unattended: data.leave_unattended ?? false,
          preferred_delivery_window:
            (data.preferred_delivery_window as Prefs['preferred_delivery_window']) ?? 'any',
        });
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const save = async (next: Prefs) => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        delivery_instructions: next.delivery_instructions || null,
        leave_unattended: next.leave_unattended,
        preferred_delivery_window: next.preferred_delivery_window,
      })
      .eq('id', user.id);
    setSaving(false);
    if (error) {
      haptic('error');
      toast({ title: 'Could not save', description: error.message, variant: 'destructive' });
      return;
    }
    haptic('success');
  };

  const update = (patch: Partial<Prefs>) => {
    const next = { ...prefs, ...patch };
    if ((next.delivery_instructions ?? '').length > MAX_LEN) return;
    setPrefs(next);
    save(next);
  };

  if (!user) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="glass rounded-2xl p-5 border border-border/40"
      aria-labelledby="delivery-prefs-heading"
    >
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-accent" aria-hidden />
          <h2 id="delivery-prefs-heading" className="font-semibold">Delivery Preferences</h2>
        </div>
        {saving && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" aria-label="Saving" />}
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Default instructions applied to every order. You can still override them at checkout.
      </p>

      {loading ? (
        <div className="h-40 rounded-xl bg-muted/30 animate-pulse" />
      ) : (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="delivery-instructions" className="text-xs">
              Notes for courier
            </Label>
            <Textarea
              id="delivery-instructions"
              value={prefs.delivery_instructions}
              onChange={(e) => update({ delivery_instructions: e.target.value })}
              placeholder="e.g. 2nd floor, blue door. Ring twice."
              maxLength={MAX_LEN}
              rows={3}
              className="resize-none"
            />
            <p className="text-[11px] text-muted-foreground text-right tabular-nums">
              {prefs.delivery_instructions.length}/{MAX_LEN}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="delivery-window" className="text-xs flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" aria-hidden /> Preferred window
            </Label>
            <Select
              value={prefs.preferred_delivery_window}
              onValueChange={(v) =>
                update({ preferred_delivery_window: v as Prefs['preferred_delivery_window'] })
              }
            >
              <SelectTrigger id="delivery-window">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WINDOWS.map((w) => (
                  <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-background/40 border border-border/40 cursor-pointer">
            <div className="flex items-center gap-2 min-w-0">
              <PackageCheck className="w-4 h-4 text-accent shrink-0" aria-hidden />
              <div className="min-w-0">
                <p className="text-sm font-medium">Allow contactless drop</p>
                <p className="text-xs text-muted-foreground">
                  Courier may leave the parcel if no one answers (you accept the risk).
                </p>
              </div>
            </div>
            <Switch
              checked={prefs.leave_unattended}
              onCheckedChange={(v) => update({ leave_unattended: v })}
              aria-label="Toggle contactless drop"
            />
          </label>
        </div>
      )}
    </motion.section>
  );
}
