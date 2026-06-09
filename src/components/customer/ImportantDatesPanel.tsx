import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Cake, Heart, Gift, Loader2, BellRing, BellOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

interface DatesState {
  birthday: string | null;
  anniversary: string | null;
  dates_reminders_enabled: boolean;
}

const MAX_DATE = new Date().toISOString().slice(0, 10);

function daysUntilNext(mmdd: string | null): number | null {
  if (!mmdd) return null;
  const today = new Date();
  const [m, d] = mmdd.split("-").map(Number);
  let next = new Date(today.getFullYear(), m - 1, d);
  if (next.getTime() < new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) {
    next = new Date(today.getFullYear() + 1, m - 1, d);
  }
  return Math.round((next.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86400000);
}

export function ImportantDatesPanel() {
  const { user } = useAuth();
  const [state, setState] = useState<DatesState>({
    birthday: null,
    anniversary: null,
    dates_reminders_enabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<keyof DatesState | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("profiles")
      .select("birthday, anniversary, dates_reminders_enabled")
      .eq("id", user.id)
      .maybeSingle();
    if (!error && data) {
      setState({
        birthday: data.birthday ?? null,
        anniversary: data.anniversary ?? null,
        dates_reminders_enabled: data.dates_reminders_enabled ?? true,
      });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async <K extends keyof DatesState>(key: K, value: DatesState[K]) => {
    if (!user) return;
    setSaving(key);
    const prev = state[key];
    setState((s) => ({ ...s, [key]: value }));
    const { error } = await supabase
      .from("profiles")
      .update({ [key]: value })
      .eq("id", user.id);
    setSaving(null);
    if (error) {
      setState((s) => ({ ...s, [key]: prev }));
      toast.error(error.message.replace(/^.*?: /, "") || "Couldn't save");
      haptic("error");
    } else {
      haptic("success");
    }
  };

  const bdayMd = state.birthday ? state.birthday.slice(5) : null;
  const annMd = state.anniversary ? state.anniversary.slice(5) : null;
  const bdayDays = daysUntilNext(bdayMd);
  const annDays = daysUntilNext(annMd);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="glass rounded-2xl p-5"
      aria-label="Important dates"
    >
      <header className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center">
            <Gift className="w-4 h-4 text-accent" aria-hidden />
          </div>
          <div>
            <h2 className="font-semibold text-sm">Important dates</h2>
            <p className="text-[11px] text-muted-foreground">Get a surprise reward on your special days</p>
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
          {state.dates_reminders_enabled ? <BellRing className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
          <Switch
            checked={state.dates_reminders_enabled}
            disabled={loading || saving === "dates_reminders_enabled"}
            onCheckedChange={(v) => save("dates_reminders_enabled", v)}
            aria-label="Toggle date reminders"
          />
        </label>
      </header>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-6">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="bday" className="text-xs flex items-center gap-1.5 mb-1.5">
              <Cake className="w-3.5 h-3.5 text-accent" /> Birthday
            </Label>
            <Input
              id="bday"
              type="date"
              max={MAX_DATE}
              value={state.birthday ?? ""}
              disabled={saving === "birthday"}
              onChange={(e) => save("birthday", e.target.value || null)}
            />
            {bdayDays !== null && (
              <p className="mt-1.5 text-[11px] text-accent">
                {bdayDays === 0 ? "🎉 Today! Happy birthday!" : `${bdayDays} day${bdayDays === 1 ? "" : "s"} to go`}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="ann" className="text-xs flex items-center gap-1.5 mb-1.5">
              <Heart className="w-3.5 h-3.5 text-accent" /> Anniversary
            </Label>
            <Input
              id="ann"
              type="date"
              max={MAX_DATE}
              value={state.anniversary ?? ""}
              disabled={saving === "anniversary"}
              onChange={(e) => save("anniversary", e.target.value || null)}
            />
            {annDays !== null && (
              <p className="mt-1.5 text-[11px] text-accent">
                {annDays === 0 ? "💖 Today! Happy anniversary!" : `${annDays} day${annDays === 1 ? "" : "s"} to go`}
              </p>
            )}
          </div>
        </div>
      )}

      <p className="mt-4 text-[11px] text-muted-foreground">
        We only use these to send you a small gift around the date. You can disable reminders anytime.
      </p>
    </motion.section>
  );
}
