import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface EmailPreferences {
  id: string;
  user_id: string;
  order_updates: boolean;
  shipping_updates: boolean;
  promotional_emails: boolean;
  product_recommendations: boolean;
  abandoned_cart_reminders: boolean;
  review_reminders: boolean;
  newsletter: boolean;
  created_at: string;
  updated_at: string;
}

export function useEmailPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['email-preferences', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('email_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      // If no preferences exist, return defaults
      if (!data) {
        return {
          user_id: user.id,
          order_updates: true,
          shipping_updates: true,
          promotional_emails: true,
          product_recommendations: true,
          abandoned_cart_reminders: true,
          review_reminders: true,
          newsletter: true,
        } as Partial<EmailPreferences>;
      }
      
      return data as EmailPreferences;
    },
    enabled: !!user,
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async (updates: Partial<EmailPreferences>) => {
      if (!user) throw new Error('Not authenticated');

      // Check if preferences exist
      const { data: existing } = await supabase
        .from('email_preferences')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        // Update
        const { data, error } = await supabase
          .from('email_preferences')
          .update(updates)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert
        const { data, error } = await supabase
          .from('email_preferences')
          .insert({
            user_id: user.id,
            ...updates,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-preferences'] });
      toast.success('Email preferences saved');
    },
    onError: (error) => {
      console.error('Failed to update preferences:', error);
      toast.error('Failed to save preferences');
    },
  });

  return {
    preferences,
    isLoading,
    updatePreferences: updatePreferencesMutation.mutateAsync,
    isUpdating: updatePreferencesMutation.isPending,
  };
}
