import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { formatDistanceToNowStrict } from 'date-fns';
import { AlertTriangle, CheckCircle2, KeyRound, Loader2, ShieldCheck, Smartphone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserSessions } from '@/hooks/useSessions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { haptic } from '@/lib/haptics';

type RiskLevel = 'secure' | 'attention' | 'high';

interface MfaStatus {
  enabled: boolean;
  currentLevel: string | null;
  nextLevel: string | null;
}

export function SecurityQuickStatusPanel() {
  const { user, session } = useAuth();
  const { data: sessions = [], isLoading: sessionsLoading } = useUserSessions();
  const [mfa, setMfa] = useState<MfaStatus>({ enabled: false, currentLevel: null, nextLevel: null });
  const [loadingMfa, setLoadingMfa] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      setLoadingMfa(true);
      const [factorsResult, aalResult] = await Promise.all([
        supabase.auth.mfa.listFactors(),
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      ]);
      if (!active) return;
      const totp = factorsResult.data?.totp ?? [];
      setMfa({
        enabled: totp.some((factor) => factor.status === 'verified') || totp.length > 0,
        currentLevel: aalResult.data?.currentLevel ?? null,
        nextLevel: aalResult.data?.nextLevel ?? null,
      });
      setLoadingMfa(false);
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const sessionMeta = useMemo(() => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const expiresAt = session?.expires_at ?? null;
    const expiresSoon = Boolean(expiresAt && expiresAt - nowSeconds < 24 * 60 * 60);
    const expiryText = expiresAt
      ? formatDistanceToNowStrict(new Date(expiresAt * 1000), { addSuffix: true })
      : 'unknown';
    const otherSessions = sessions.filter((s) => !s.is_current).length;
    const staleSessions = sessions.filter((s) => {
      if (s.is_current || !s.last_active_at) return false;
      return Date.now() - new Date(s.last_active_at).getTime() > 7 * 86_400_000;
    }).length;
    return { expiresSoon, expiryText, otherSessions, staleSessions };
  }, [session?.expires_at, sessions]);

  const risk: RiskLevel = !mfa.enabled || sessionMeta.staleSessions > 0
    ? 'high'
    : sessionMeta.otherSessions > 0 || sessionMeta.expiresSoon
      ? 'attention'
      : 'secure';

  const riskCopy: Record<RiskLevel, { label: string; detail: string; icon: typeof ShieldCheck }> = {
    secure: { label: 'Protected', detail: '2FA and active-session checks look healthy.', icon: CheckCircle2 },
    attention: { label: 'Review', detail: 'Review active devices or refresh your session soon.', icon: AlertTriangle },
    high: { label: 'Action needed', detail: 'Enable 2FA and remove stale devices to reduce takeover risk.', icon: AlertTriangle },
  };

  if (!user) return null;

  const RiskIcon = riskCopy[risk].icon;
  const isLoading = loadingMfa || sessionsLoading;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="glass rounded-2xl p-5 border border-border/40"
      aria-labelledby="security-quick-status-heading"
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <ShieldCheck className="w-5 h-5 text-accent shrink-0" aria-hidden />
          <h2 id="security-quick-status-heading" className="font-semibold truncate">Security Status</h2>
        </div>
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" aria-label="Loading security status" />
        ) : (
          <Badge variant={risk === 'secure' ? 'default' : 'secondary'} className="text-xs shrink-0">
            {riskCopy[risk].label}
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="h-32 rounded-xl bg-muted/30 animate-pulse" />
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/40 bg-background/40 p-3 flex items-start gap-3">
            <RiskIcon className="w-4 h-4 text-accent shrink-0 mt-0.5" aria-hidden />
            <p className="text-sm text-muted-foreground leading-relaxed">
              {riskCopy[risk].detail}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-secondary/30 p-3 min-w-0">
              <KeyRound className="w-4 h-4 mx-auto mb-1 text-accent" aria-hidden />
              <p className="text-[11px] text-muted-foreground">2FA</p>
              <p className="text-sm font-semibold truncate">{mfa.enabled ? 'On' : 'Off'}</p>
            </div>
            <div className="rounded-xl bg-secondary/30 p-3 min-w-0">
              <Smartphone className="w-4 h-4 mx-auto mb-1 text-accent" aria-hidden />
              <p className="text-[11px] text-muted-foreground">Devices</p>
              <p className="text-sm font-semibold tabular-nums">{sessionMeta.otherSessions}</p>
            </div>
            <div className="rounded-xl bg-secondary/30 p-3 min-w-0">
              <ShieldCheck className="w-4 h-4 mx-auto mb-1 text-accent" aria-hidden />
              <p className="text-[11px] text-muted-foreground">Session</p>
              <p className="text-sm font-semibold truncate">{sessionMeta.expiryText}</p>
            </div>
          </div>

          {mfa.nextLevel === 'aal2' && mfa.currentLevel !== 'aal2' && (
            <p className="text-[11px] text-muted-foreground">
              Strong verification is available for this account; complete 2FA challenge on sensitive actions.
            </p>
          )}

          <Button asChild variant="outline" size="sm" className="w-full btn-press" onClick={() => haptic('light')}>
            <Link to="/settings?tab=security">Manage security</Link>
          </Button>
        </div>
      )}
    </motion.section>
  );
}