import { Bell, BellOff, Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  PermissionContext,
  pushPermissionState,
  requestPushPermissionInContext,
} from '@/lib/push/contextualPermission';

interface Props {
  context: PermissionContext;
  /** Custom label override per surface. */
  label?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  onGranted?: () => void;
}

/**
 * Inline opt-in button. Hidden when push is unsupported.
 * Shows "Enabled" state when already granted, "Blocked" when hard-denied.
 */
export function PushOptInButton({
  context,
  label,
  variant = 'outline',
  size = 'sm',
  className,
  onGranted,
}: Props) {
  const [state, setState] = useState<'unsupported' | NotificationPermission>('default');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setState(pushPermissionState());
  }, []);

  if (state === 'unsupported') return null;

  if (state === 'granted') {
    return (
      <Button variant="ghost" size={size} className={className} disabled aria-label="Notifications enabled">
        <Check className="w-4 h-4 mr-1.5 text-success" />
        Alerts on
      </Button>
    );
  }

  if (state === 'denied') {
    return (
      <Button
        variant="ghost"
        size={size}
        className={className}
        onClick={() =>
          toast.info('Notifications are blocked. Enable them in your browser site settings to receive alerts.')
        }
      >
        <BellOff className="w-4 h-4 mr-1.5" />
        Blocked
      </Button>
    );
  }

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const outcome = await requestPushPermissionInContext(context);
      setState(pushPermissionState());
      if (outcome === 'granted' || outcome === 'already_granted') {
        toast.success("You're subscribed to alerts.");
        onGranted?.();
      } else if (outcome === 'denied' || outcome === 'hard_blocked') {
        toast.error('Notifications were blocked.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant={variant} size={size} className={className} onClick={handleClick} disabled={busy}>
      <Bell className="w-4 h-4 mr-1.5" />
      {label ?? 'Notify me'}
    </Button>
  );
}
