import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getSiteBaseUrl } from '@/lib/siteUrl';

export interface CampaignLink {
  id: string;
  code: string;
  campaign_type: string;
  campaign_name: string;
  target_path: string;
  created_by: string | null;
  metadata: Record<string, any>;
  personalization: Record<string, any>;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  click_count: number;
  signup_count: number;
  purchase_count: number;
  revenue_generated: number;
  created_at: string;
  updated_at: string;
}

export interface CampaignLinkEvent {
  id: string;
  link_id: string;
  event_type: string;
  user_id: string | null;
  session_id: string | null;
  referrer: string | null;
  device_info: Record<string, any>;
  metadata: Record<string, any>;
  created_at: string;
}

const BASE_URL = getSiteBaseUrl({ preferPublishedInPreview: true });

// Generate full trackable URL from a campaign code
export function getCampaignUrl(code: string): string {
  return `${BASE_URL}/c/${code}`;
}

// ─── Admin Hooks ─────────────────────────────────────────────

export function useCampaignLinks(filters?: { type?: string }) {
  return useQuery({
    queryKey: ['campaign-links', filters],
    queryFn: async () => {
      let query = supabase
        .from('campaign_links')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (filters?.type) {
        query = query.eq('campaign_type', filters.type);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as CampaignLink[];
    },
  });
}

export function useCampaignLinkEvents(linkId: string) {
  return useQuery({
    queryKey: ['campaign-link-events', linkId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaign_link_events')
        .select('*')
        .eq('link_id', linkId)
        .order('created_at', { ascending: false })
        .limit(200);
      
      if (error) throw error;
      return data as CampaignLinkEvent[];
    },
    enabled: !!linkId,
  });
}

export function useCreateCampaignLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      campaign_type: string;
      campaign_name: string;
      target_path: string;
      metadata?: Record<string, any>;
      personalization?: Record<string, any>;
      starts_at?: string;
      expires_at?: string;
    }) => {
      // Generate code
      const { data: codeData, error: codeErr } = await supabase.rpc('generate_campaign_code');
      if (codeErr) throw codeErr;
      const code = codeData as string;

      const { data: authData } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('campaign_links')
        .insert({
          code,
          campaign_type: params.campaign_type,
          campaign_name: params.campaign_name,
          target_path: params.target_path,
          metadata: params.metadata || {},
          personalization: params.personalization || {},
          starts_at: params.starts_at || null,
          expires_at: params.expires_at || null,
          created_by: authData.user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as CampaignLink;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-links'] });
    },
    onError: (err: Error) => {
      toast.error('Failed to create campaign link: ' + err.message);
    },
  });
}

export function useToggleCampaignLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('campaign_links')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-links'] });
    },
  });
}

export function useDeleteCampaignLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('campaign_links')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-links'] });
      toast.success('Campaign link deleted');
    },
  });
}

// ─── Tracking (Public) ───────────────────────────────────────

export async function trackCampaignEvent(
  code: string,
  eventType: string,
  metadata?: Record<string, any>
) {
  const sessionId = sessionStorage.getItem('odhra_session_id') || crypto.randomUUID();
  sessionStorage.setItem('odhra_session_id', sessionId);

  const { data: userData } = await supabase.auth.getUser();

  const deviceInfo = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    screenWidth: screen.width,
    screenHeight: screen.height,
    isMobile: /Mobi|Android/i.test(navigator.userAgent),
  };

  const { data, error } = await supabase.rpc('track_campaign_event', {
    p_code: code,
    p_event_type: eventType,
    p_session_id: sessionId,
    p_user_id: userData.user?.id || null,
    p_referrer: document.referrer || null,
    p_device_info: deviceInfo,
    p_metadata: metadata || {},
  });

  if (error) {
    console.error('Campaign tracking error:', error);
    return null;
  }

  return data as {
    success: boolean;
    link_id?: string;
    target_path?: string;
    campaign_type?: string;
    personalization?: Record<string, any>;
    metadata?: Record<string, any>;
  };
}
