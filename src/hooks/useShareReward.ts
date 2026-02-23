import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useShareReward(productId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: shareData } = useQuery({
    queryKey: ['share-reward', user?.id, productId],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('share_rewards')
        .select('*')
        .eq('sharer_user_id', user.id)
        .eq('product_id', productId)
        .maybeSingle();
      return data;
    },
    enabled: !!user && !!productId,
  });

  const createShareLink = useMutation({
    mutationFn: async (platform: string) => {
      if (!user) throw new Error('Must be logged in');
      
      const { data, error } = await supabase
        .from('share_rewards')
        .upsert({
          sharer_user_id: user.id,
          product_id: productId,
          platform,
        }, { onConflict: 'sharer_user_id,product_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['share-reward', user?.id, productId] });
    },
    onError: () => {
      toast.error('Failed to create share link');
    },
  });

  const shareProduct = async (platform: string, _productTitle: string, _productSlug: string) => {
    // Track the share in the rewards system (link generation is handled by ShareSheet)
    await createShareLink.mutateAsync(platform);
  };

  return {
    shareData,
    shareProduct,
    isSharing: createShareLink.isPending,
  };
}
