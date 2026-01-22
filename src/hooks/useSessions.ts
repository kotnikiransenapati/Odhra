import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface UserSession {
  id: string;
  user_id: string;
  device_info: {
    browser?: string;
    os?: string;
    device?: string;
  };
  ip_address: string | null;
  user_agent: string | null;
  location: string | null;
  last_active_at: string;
  is_current: boolean;
  created_at: string;
}

// Parse user agent to get device info
function parseUserAgent(ua: string): { browser: string; os: string; device: string } {
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';
  let device = 'Desktop';

  // Browser detection
  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';

  // OS detection
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux') && !ua.includes('Android')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  // Device detection
  if (ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone')) {
    device = 'Mobile';
  } else if (ua.includes('iPad') || ua.includes('Tablet')) {
    device = 'Tablet';
  }

  return { browser, os, device };
}

export function useUserSessions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-sessions', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('last_active_at', { ascending: false });

      if (error) throw error;
      return data as UserSession[];
    },
    enabled: !!user,
  });
}

export function useRecordSession() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const userAgent = navigator.userAgent;
      const deviceInfo = parseUserAgent(userAgent);

      // Check if this session already exists (by user agent match)
      const { data: existingSessions } = await supabase
        .from('user_sessions')
        .select('id, user_agent')
        .eq('user_id', user.id);

      const existingSession = existingSessions?.find(s => s.user_agent === userAgent);

      if (existingSession) {
        // Update existing session
        const { error } = await supabase
          .from('user_sessions')
          .update({
            last_active_at: new Date().toISOString(),
            is_current: true,
            device_info: deviceInfo,
          })
          .eq('id', existingSession.id);

        if (error) throw error;

        // Mark other sessions as not current
        await supabase
          .from('user_sessions')
          .update({ is_current: false })
          .eq('user_id', user.id)
          .neq('id', existingSession.id);

        return existingSession.id;
      } else {
        // Create new session
        const { data, error } = await supabase
          .from('user_sessions')
          .insert({
            user_id: user.id,
            device_info: deviceInfo,
            user_agent: userAgent,
            is_current: true,
            last_active_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (error) throw error;

        // Mark other sessions as not current
        await supabase
          .from('user_sessions')
          .update({ is_current: false })
          .eq('user_id', user.id)
          .neq('id', data.id);

        return data.id;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-sessions'] });
    },
  });
}

export function useRevokeSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('user_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;
      return sessionId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-sessions'] });
      toast.success('Session revoked successfully');
    },
    onError: () => {
      toast.error('Failed to revoke session');
    },
  });
}

export function useRevokeAllOtherSessions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const userAgent = navigator.userAgent;

      // Delete all sessions except current one
      const { error } = await supabase
        .from('user_sessions')
        .delete()
        .eq('user_id', user.id)
        .neq('user_agent', userAgent);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-sessions'] });
      toast.success('All other sessions have been logged out');
    },
    onError: () => {
      toast.error('Failed to revoke sessions');
    },
  });
}
