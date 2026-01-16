import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect } from 'react';

export interface CMSContent {
  id: string;
  slug: string;
  type: string;
  title: string;
  content: Record<string, any>;
  is_active: boolean;
  sort_order: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useCMSContent(type?: string) {
  const queryClient = useQueryClient();

  // Set up real-time subscription for CMS content
  useEffect(() => {
    const channel = supabase
      .channel('cms-content-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cms_content',
        },
        (payload) => {
          console.log('CMS content changed:', payload);
          // Invalidate all CMS related queries for instant refresh
          queryClient.invalidateQueries({ queryKey: ['cms-content'] });
          queryClient.invalidateQueries({ queryKey: ['homepage-banners'] });
          queryClient.invalidateQueries({ queryKey: ['homepage-sections'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['cms-content', type],
    queryFn: async () => {
      let query = supabase
        .from('cms_content')
        .select('*')
        .order('sort_order', { ascending: true });
      
      if (type) {
        query = query.eq('type', type);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as CMSContent[];
    },
    staleTime: 0, // Always check for fresh data
    refetchOnWindowFocus: true,
  });
}

export function useCreateCMSContent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (content: Omit<CMSContent, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('cms_content')
        .insert(content)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-content'] });
      queryClient.invalidateQueries({ queryKey: ['homepage-banners'] });
      queryClient.invalidateQueries({ queryKey: ['homepage-sections'] });
      toast.success('Content created successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to create content: ' + error.message);
    },
  });
}

export function useUpdateCMSContent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CMSContent> & { id: string }) => {
      const { data, error } = await supabase
        .from('cms_content')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-content'] });
      queryClient.invalidateQueries({ queryKey: ['homepage-banners'] });
      queryClient.invalidateQueries({ queryKey: ['homepage-sections'] });
      toast.success('Content updated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to update content: ' + error.message);
    },
  });
}

export function useDeleteCMSContent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cms_content')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-content'] });
      queryClient.invalidateQueries({ queryKey: ['homepage-banners'] });
      queryClient.invalidateQueries({ queryKey: ['homepage-sections'] });
      toast.success('Content deleted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete content: ' + error.message);
    },
  });
}

export function useBulkUpdateCMSOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (items: { id: string; sort_order: number }[]) => {
      const promises = items.map(item => 
        supabase
          .from('cms_content')
          .update({ sort_order: item.sort_order })
          .eq('id', item.id)
      );
      
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-content'] });
      queryClient.invalidateQueries({ queryKey: ['homepage-banners'] });
      queryClient.invalidateQueries({ queryKey: ['homepage-sections'] });
    },
  });
}
