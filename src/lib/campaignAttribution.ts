/**
 * Campaign attribution helpers — read the campaign context that
 * `/c/:code` stored in sessionStorage and fire downstream events
 * (signup / purchase) so click→conversion analytics stay accurate.
 */
import { trackCampaignEvent } from '@/hooks/useCampaignLinks';

export interface StoredCampaign {
  code: string;
  link_id?: string;
  campaign_type?: string;
  clicked_at?: string;
}

export function getStoredCampaign(): StoredCampaign | null {
  if (typeof sessionStorage === 'undefined') return null;
  const raw = sessionStorage.getItem('odhra_campaign');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredCampaign;
  } catch {
    return null;
  }
}

export function clearStoredCampaign() {
  try { sessionStorage.removeItem('odhra_campaign'); } catch { /* noop */ }
}

/** Fire a signup conversion against the active campaign, if any. */
export async function trackCampaignSignup(meta?: Record<string, any>) {
  const c = getStoredCampaign();
  if (!c?.code) return;
  try { await trackCampaignEvent(c.code, 'signup', meta); } catch { /* silent */ }
}

/** Fire a purchase conversion. Keeps campaign stored for multi-order journeys. */
export async function trackCampaignPurchase(meta: {
  order_id: string;
  order_number?: string;
  value?: number;
  currency?: string;
}) {
  const c = getStoredCampaign();
  if (!c?.code) return null;
  try {
    return await trackCampaignEvent(c.code, 'purchase', meta);
  } catch {
    return null;
  }
}
