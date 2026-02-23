import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

interface Translation {
  id: string;
  language_code: string;
  namespace: string;
  key: string;
  value: string;
  is_custom: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Hook to fetch database-driven translations for the current language.
 * These override the hardcoded translations in LanguageContext.
 */
export function useDbTranslations(namespace = 'common') {
  const { language } = useLanguage();

  return useQuery({
    queryKey: ['translations', language, namespace],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('translations')
        .select('*')
        .eq('language_code', language)
        .eq('namespace', namespace);
      if (error) throw error;
      return (data as Translation[]) || [];
    },
    staleTime: 5 * 60 * 1000, // cache 5 min
  });
}

/**
 * Builds a lookup map from db translations for fast key->value resolution.
 */
export function useTranslationMap(namespace = 'common') {
  const { data } = useDbTranslations(namespace);
  const map = new Map<string, string>();
  data?.forEach(t => map.set(`${t.namespace}.${t.key}`, t.value));
  return map;
}

/**
 * Admin hook to manage translations (CRUD).
 */
export function useAdminTranslations() {
  const queryClient = useQueryClient();

  const allTranslationsQuery = useQuery({
    queryKey: ['admin-translations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('translations')
        .select('*')
        .order('language_code')
        .order('namespace')
        .order('key');
      if (error) throw error;
      return (data as Translation[]) || [];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (t: { language_code: string; namespace: string; key: string; value: string }) => {
      const { error } = await supabase
        .from('translations')
        .upsert(
          { language_code: t.language_code, namespace: t.namespace, key: t.key, value: t.value, is_custom: true },
          { onConflict: 'language_code,namespace,key' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['translations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-translations'] });
      toast.success('Translation saved');
    },
    onError: () => toast.error('Failed to save translation'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('translations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['translations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-translations'] });
      toast.success('Translation deleted');
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: async (translations: { language_code: string; namespace: string; key: string; value: string }[]) => {
      const records = translations.map(t => ({ ...t, is_custom: true }));
      const { error } = await supabase.from('translations').upsert(records, { onConflict: 'language_code,namespace,key' });
      if (error) throw error;
      return records.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['translations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-translations'] });
      toast.success(`${count} translations imported`);
    },
    onError: () => toast.error('Import failed'),
  });

  return {
    translations: allTranslationsQuery.data || [],
    isLoading: allTranslationsQuery.isLoading,
    upsert: upsertMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    bulkImport: bulkImportMutation.mutateAsync,
    isSaving: upsertMutation.isPending,
  };
}
