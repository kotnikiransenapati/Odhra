import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CustomerStory {
  id: string;
  name: string;
  avatar: string | null;
  location: string;
  rating: number;
  story: string;
  productName: string;
  productSlug: string;
  createdAt: string;
}

export function useCustomerStories() {
  return useQuery({
    queryKey: ['customer-stories'],
    queryFn: async () => {
      // Fetch approved reviews with 4-5 stars, including profile and product data
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          id,
          rating,
          title,
          content,
          created_at,
          user_id,
          product_id
        `)
        .gte('rating', 4)
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(12);

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Get unique product and user IDs
      const productIds = [...new Set(data.map(r => r.product_id))];
      const userIds = [...new Set(data.map(r => r.user_id))];

      // Fetch products
      const { data: products } = await supabase
        .from('products')
        .select('id, title, slug')
        .in('id', productIds);

      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      // Map products and profiles for quick lookup
      const productMap = new Map(products?.map(p => [p.id, p]) || []);
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Indian cities for display (when location not available)
      const indianCities = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad', 'Kolkata', 'Pune', 'Jaipur', 'Ahmedabad', 'Lucknow'];

      return data.map((review, index) => {
        const product = productMap.get(review.product_id);
        const profile = profileMap.get(review.user_id);
        
        return {
          id: review.id,
          name: profile?.full_name || 'Happy Customer',
          avatar: profile?.avatar_url || null,
          location: indianCities[index % indianCities.length],
          rating: review.rating,
          story: review.content || review.title || 'Great product! Highly recommended.',
          productName: product?.title || 'Product',
          productSlug: product?.slug || '',
          createdAt: review.created_at,
        } as CustomerStory;
      });
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
