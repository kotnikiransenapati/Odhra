/**
 * PWA install helpers — platform detection + analytics logging.
 */
import { supabase } from '@/integrations/supabase/client';

export type InstallPlatform = 'ios-safari' | 'android-chrome' | 'desktop' | 'unsupported';

export function detectInstallPlatform(): InstallPlatform {
  if (typeof navigator === 'undefined') return 'unsupported';
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
  const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(ua);
  if (isIOS && isSafari) return 'ios-safari';
  if (/Android/.test(ua)) return 'android-chrome';
  if (/Mac|Windows|Linux/.test(ua)) return 'desktop';
  return 'unsupported';
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export async function logInstallEvent(
  event: 'prompt_shown' | 'prompt_accepted' | 'prompt_dismissed' | 'installed' | 'ios_instructions_shown',
  extra: Record<string, unknown> = {}
) {
  try {
    await supabase.from('analytics_events').insert({
      event_name: `pwa_${event}`,
      event_data: {
        platform: detectInstallPlatform(),
        standalone: isStandaloneDisplay(),
        ...extra,
      },
    });
  } catch {
    // best-effort, never block UI
  }
}
