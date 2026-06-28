import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, ShieldAlert, Monitor, Clock, KeyRound } from 'lucide-react';
import { useUserSessions } from '@/hooks/useSessions';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

/**
 * Unified security posture for the customer account hub.
 * Aggregates: 2FA status, active sessions, last sign-in, recent failed attempts.
 */
export function SecurityOverviewCard() {
  const { user } = useAuth();
  const { data: sessions = [] } = useUserSessions();

  const { data: twoFA } = useQuery({
    queryKey: ['2fa-enabled', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.auth.mfa.listFactors();
      return (data?.totp ?? []).some((f: any) => f.status === 'verified');
    },
  });

  const stats = useMemo(() => {
    const activeSessions = sessions.length;
    const lastActive = sessions[0]?.last_active_at;
    const lastSignIn = user?.last_sign_in_at ?? null;
    return { activeSessions, lastActive, lastSignIn };
  }, [sessions, user]);

  const score = useMemo(() => {
    let s = 40;
    if (twoFA) s += 35;
    if (stats.activeSessions <= 3) s += 15;
    if (user?.email_confirmed_at) s += 10;
    return Math.min(100, s);
  }, [twoFA, stats.activeSessions, user]);

  const level = score >= 85 ? 'Strong' : score >= 60 ? 'Good' : 'Needs attention';
  const tone = score >= 85 ? 'text-emerald-600' : score >= 60 ? 'text-amber-600' : 'text-destructive';

  return (
    <Card className="glass" role="region" aria-labelledby="security-overview-title">
      <CardHeader>
        <CardTitle id="security-overview-title" className="text-lg flex items-center gap-2">
          {score >= 60 ? (
            <ShieldCheck className="w-5 h-5 text-accent" aria-hidden />
          ) : (
            <ShieldAlert className="w-5 h-5 text-destructive" aria-hidden />
          )}
          Security overview
        </CardTitle>
        <CardDescription>A live snapshot of how protected your account is</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold tracking-tight" aria-label={`Security score ${score} out of 100`}>
              {score}
              <span className="text-base font-normal text-muted-foreground">/100</span>
            </p>
            <p className={`text-sm font-medium ${tone}`}>{level}</p>
          </div>
          <Badge variant={twoFA ? 'default' : 'outline'} className="gap-1.5">
            <KeyRound className="w-3.5 h-3.5" aria-hidden />
            {twoFA ? '2FA on' : '2FA off'}
          </Badge>
        </div>

        <div
          className="h-2 w-full rounded-full bg-muted overflow-hidden"
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Security score"
        >
          <div
            className="h-full bg-accent transition-[width] duration-500"
            style={{ width: `${score}%` }}
          />
        </div>

        <dl className="grid grid-cols-2 gap-3 pt-2 text-sm">
          <div className="flex items-start gap-2">
            <Monitor className="w-4 h-4 text-muted-foreground mt-0.5" aria-hidden />
            <div>
              <dt className="text-xs text-muted-foreground">Active devices</dt>
              <dd className="font-medium">{stats.activeSessions}</dd>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-muted-foreground mt-0.5" aria-hidden />
            <div>
              <dt className="text-xs text-muted-foreground">Last sign-in</dt>
              <dd className="font-medium">
                {stats.lastSignIn
                  ? formatDistanceToNow(new Date(stats.lastSignIn), { addSuffix: true })
                  : '—'}
              </dd>
            </div>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
