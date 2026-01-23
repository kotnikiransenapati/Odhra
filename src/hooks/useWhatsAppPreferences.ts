import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface WhatsAppPreferences {
  id: string;
  user_id: string;
  phone_number: string;
  order_notifications: boolean;
  shipping_notifications: boolean;
  return_notifications: boolean;
  promotional_messages: boolean;
  opted_in_at: string;
  opted_out_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useWhatsAppPreferences() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['whatsapp-preferences', user?.id],
    queryFn: async (): Promise<WhatsAppPreferences | null> => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('whatsapp_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useUpdateWhatsAppPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (preferences: {
      phone_number: string;
      order_notifications?: boolean;
      shipping_notifications?: boolean;
      return_notifications?: boolean;
      promotional_messages?: boolean;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Check if preferences exist
      const { data: existing } = await supabase
        .from('whatsapp_preferences')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existing) {
        const { data, error } = await supabase
          .from('whatsapp_preferences')
          .update(preferences)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('whatsapp_preferences')
          .insert({
            user_id: user.id,
            ...preferences,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-preferences'] });
      toast.success('WhatsApp preferences updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update preferences');
    },
  });
}

export function useOptOutWhatsApp() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('whatsapp_preferences')
        .update({
          order_notifications: false,
          shipping_notifications: false,
          return_notifications: false,
          promotional_messages: false,
          opted_out_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-preferences'] });
      toast.success('Opted out of WhatsApp notifications');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to opt out');
    },
  });
}
