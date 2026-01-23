import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface FeatureFlag {
  id: string;
  feature_key: string;
  feature_name: string;
  description: string | null;
  is_enabled: boolean;
  category: string;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export function useFeatureFlags() {
  const queryClient = useQueryClient();

  const { data: flags = [], isLoading, error } = useQuery({
    queryKey: ['feature-flags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .order('category', { ascending: true });

      if (error) throw error;
      return data as FeatureFlag[];
    },
    staleTime: 0, // Always fetch fresh data
  });

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('feature-flags-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feature_flags',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [queryClient]);

  return { flags, isLoading, error };
}

export function useFeatureFlag(featureKey: string) {
  const { flags, isLoading } = useFeatureFlags();
  const flag = flags.find(f => f.feature_key === featureKey);
  
  return {
    isEnabled: flag?.is_enabled ?? false,
    settings: flag?.settings ?? {},
    isLoading,
    flag,
  };
}

export function useUpdateFeatureFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      is_enabled, 
      settings 
    }: { 
      id: string; 
      is_enabled?: boolean; 
      settings?: Record<string, any>;
    }) => {
      const updates: Partial<FeatureFlag> = {};
      if (is_enabled !== undefined) updates.is_enabled = is_enabled;
      if (settings !== undefined) updates.settings = settings;

      const { error } = await supabase
        .from('feature_flags')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      // Log the action
      await supabase.rpc('log_admin_action', {
        _action: 'update_feature_flag',
        _entity_type: 'feature_flags',
        _entity_id: id,
        _new_values: updates,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
    },
  });
}

// Helper hook to check multiple features at once
export function useFeatures() {
  const { flags, isLoading } = useFeatureFlags();
  
  const isEnabled = (key: string) => {
    const flag = flags.find(f => f.feature_key === key);
    return flag?.is_enabled ?? false;
  };

  const getSettings = (key: string) => {
    const flag = flags.find(f => f.feature_key === key);
    return flag?.settings ?? {};
  };

  return { isEnabled, getSettings, isLoading, flags };
}
