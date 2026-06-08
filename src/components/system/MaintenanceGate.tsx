import React from 'react';
import { useLocation } from 'react-router-dom';
import { Wrench } from 'lucide-react';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';
import { useAuth } from '@/contexts/AuthContext';

// Paths that remain reachable even when maintenance mode is on,
// so admins can still log in and toggle the flag back off.
const ALLOWLIST_PREFIXES = ['/auth', '/admin', '/admin-invite', '/reset-password', '/offline'];

interface MaintenanceGateProps {
  children: React.ReactNode;
}

export function MaintenanceGate({ children }: MaintenanceGateProps) {
  const { isEnabled: maintenanceOn, settings } = useFeatureFlag('maintenance_mode');
  const { user } = useAuth();
  const location = useLocation();

  const isAllowlisted = ALLOWLIST_PREFIXES.some(p => location.pathname.startsWith(p));

  // Admins can browse normally during maintenance
  const isAdmin = Boolean((user?.app_metadata as any)?.is_admin);

  if (!maintenanceOn || isAllowlisted || isAdmin) {
    return <>{children}</>;
  }

  const message =
    (settings as any)?.message ||
    "We're performing scheduled maintenance to bring you a better experience. We'll be back shortly.";
  const eta = (settings as any)?.eta;

  return (
    <main className="min-h-[100dvh] flex items-center justify-center bg-background px-6">
      <div className="max-w-md text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center">
          <Wrench className="w-8 h-8 text-accent" aria-hidden="true" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">We'll be right back</h1>
        <p className="text-muted-foreground leading-relaxed">{message}</p>
        {eta && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Estimated return:</span> {eta}
          </p>
        )}
      </div>
    </main>
  );
}
