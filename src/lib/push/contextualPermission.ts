/**
 * Contextual push permission API.
 *
 * Lets feature surfaces (order success, low-stock viewer, price drop subscribe)
 * request the browser notification permission at a high-intent moment and
 * record the funnel to analytics_events for the admin's deliverability panel.
 *
 * Replaces the legacy global re-prompting strategy where it makes sense:
 * use this from action handlers, keep the passive prompt for first visits.
 */
import {
  getNotificationPermission,
  isPushSupported,
  requestNotificationPermission,
} from '@/hooks/useNotifications';
import { supabase } from '@/integrations/supabase/client';

export type PermissionContext =
  | 'order_placed'
  | 'price_drop'
  | 'back_in_stock'
  | 'cart_save'
  | 'wishlist_add'
  | 'first_visit'
  | 'account_settings';

export type PermissionOutcome =
  | 'granted'
  | 'denied'
  | 'dismissed'
  | 'unsupported'
  | 'already_granted'
  | 'hard_blocked';

async function logFunnel(stage: 'shown' | 'result', context: PermissionContext, outcome?: PermissionOutcome) {
  try {
    const sessionId =
      sessionStorage.getItem('odhra_session_id') || crypto.randomUUID();
    sessionStorage.setItem('odhra_session_id', sessionId);
    await supabase.from('analytics_events').insert({
      event_type: `push_permission_${stage}`,
      session_id: sessionId,
      properties: { context, outcome: outcome ?? null },
    });
  } catch {
    /* best effort */
  }
}

const COOLDOWN_KEY = 'push_ctx_cooldown_v1';
const COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 hours between contextual asks

function getCooldownMap(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(COOLDOWN_KEY) || '{}');
  } catch {
    return {};
  }
}
function setCooldown(context: PermissionContext) {
  const map = getCooldownMap();
  map[context] = Date.now();
  try {
    localStorage.setItem(COOLDOWN_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}
function isOnCooldown(context: PermissionContext): boolean {
  const map = getCooldownMap();
  return !!map[context] && Date.now() - map[context] < COOLDOWN_MS;
}

/**
 * Request permission inline at a high-intent moment.
 * Safe to call from a button click handler — gracefully handles unsupported envs.
 */
export async function requestPushPermissionInContext(
  context: PermissionContext
): Promise<PermissionOutcome> {
  if (!isPushSupported()) return 'unsupported';

  const current = getNotificationPermission();
  if (current === 'granted') return 'already_granted';
  if (current === 'denied') return 'hard_blocked';
  if (isOnCooldown(context)) return 'dismissed';

  await logFunnel('shown', context);
  setCooldown(context);

  const result = await requestNotificationPermission();
  const outcome: PermissionOutcome =
    result === 'granted' ? 'granted' : result === 'denied' ? 'denied' : 'dismissed';
  await logFunnel('result', context, outcome);
  return outcome;
}

export function pushPermissionState(): 'unsupported' | NotificationPermission {
  if (!isPushSupported()) return 'unsupported';
  return getNotificationPermission();
}
