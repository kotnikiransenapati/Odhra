import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface IntegrationSetting {
  id: string;
  integration_key: string;
  integration_name: string;
  category: string;
  is_enabled: boolean;
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export function useIntegrationSettings() {
  const queryClient = useQueryClient();

  const { data: integrations = [], isLoading, error } = useQuery({
    queryKey: ['integration-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integration_settings')
        .select('*')
        .order('category', { ascending: true });

      if (error) throw error;
      return data as IntegrationSetting[];
    },
    staleTime: 30000,
  });

  useEffect(() => {
    const channel = supabase
      .channel('integration-settings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'integration_settings' }, () => {
        queryClient.invalidateQueries({ queryKey: ['integration-settings'] });
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [queryClient]);

  return { integrations, isLoading, error };
}

export function useIntegration(key: string) {
  const { integrations, isLoading } = useIntegrationSettings();
  const integration = integrations.find(i => i.integration_key === key);

  return {
    isEnabled: integration?.is_enabled ?? false,
    config: integration?.config ?? {},
    isLoading,
    integration,
  };
}

export function useUpdateIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      integration_key,
      is_enabled,
      config,
    }: {
      integration_key: string;
      is_enabled?: boolean;
      config?: Record<string, any>;
    }) => {
      const updates: Record<string, any> = {};
      if (is_enabled !== undefined) updates.is_enabled = is_enabled;
      if (config !== undefined) updates.config = config;

      const { error } = await supabase
        .from('integration_settings')
        .update(updates)
        .eq('integration_key', integration_key);

      if (error) throw error;

      await supabase.rpc('log_admin_action', {
        _action: 'update_integration',
        _entity_type: 'integration_settings',
        _entity_id: integration_key,
        _new_values: updates,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-settings'] });
    },
  });
}
