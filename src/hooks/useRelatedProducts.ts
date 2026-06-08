import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Product } from '@/hooks/useProducts';

type RelatedReason = 'curated' | 'frequently_bought' | 'same_category' | 'similar_tags' | 'popular';

export type RelatedProduct = Product & {
  relevanceScore: number;
  reason: RelatedReason;
};

interface UseRelatedProductsOptions {
  productId: string;
  categoryId?: string | null;
  tags?: string[] | null;
  price?: number | null;
  limit?: number;
}

const ASSOCIATION_WEIGHT: Record<string, number> = {
  frequently_bought: 120,
  frequently_bought_together: 120,
  complete_the_look: 115,
  cross_sell: 105,
  related: 95,
  similar: 85,
  viewed_together: 80,
};

const PRODUCT_SELECT = `
  id,
  title,
  slug,
  price,
  compare_at_price,
  stock,
  is_active,
  is_featured,
  avg_rating,
  review_count,
  sold_count,
  vendor_id,
  category_id,
  tags,
  created_at,
  product_images (url, is_primary, alt_text),
  vendors_public (brand_name, slug),
  categories (name, slug)
`;

function associationReason(type: string): RelatedReason {
  return type === 'frequently_bought' || type === 'frequently_bought_together' || type === 'complete_the_look'
    ? 'frequently_bought'
    : 'curated';
}

function scoreFallbackProduct(product: Product, options: UseRelatedProductsOptions): RelatedProduct {
  const sharedTags = (product.tags || []).filter((tag) => options.tags?.includes(tag)).length;
  const sameCategory = Boolean(options.categoryId && product.category_id === options.categoryId);
  const ratingScore = (product.avg_rating || 0) * 5;
  const salesScore = Math.min(product.sold_count || 0, 100) / 2;
  const priceAffinity = options.price && product.price
    ? Math.max(0, 25 - Math.abs(product.price - options.price) / Math.max(options.price, 1) * 25)
    : 0;

  return {
    ...product,
    relevanceScore: (sameCategory ? 60 : 0) + sharedTags * 18 + ratingScore + salesScore + priceAffinity,
    reason: sharedTags > 0 ? 'similar_tags' : sameCategory ? 'same_category' : 'popular',
  };
}

function uniqueById(products: RelatedProduct[], currentProductId: string, limit: number) {
  const seen = new Set<string>([currentProductId]);
  return products
    .filter((product) => {
      if (!product?.id || seen.has(product.id)) return false;
      seen.add(product.id);
      return product.is_active !== false;
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit);
}

export function useRelatedProducts(options: UseRelatedProductsOptions) {
  const { productId, categoryId, tags, price, limit = 10 } = options;

  return useQuery({
    queryKey: ['related-products', { productId, categoryId, tags, price, limit }],
    enabled: Boolean(productId),
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: async () => {
      const associatedQuery = (supabase as any)
        .from('product_associations')
        .select(`
          association_type,
          strength,
          purchase_count,
          associated_product:products!product_associations_associated_product_id_fkey (${PRODUCT_SELECT})
        `)
        .eq('product_id', productId)
        .order('strength', { ascending: false, nullsFirst: false })
        .order('purchase_count', { ascending: false, nullsFirst: false })
        .limit(limit * 2);

      let fallbackQuery = supabase
        .from('products')
        .select(PRODUCT_SELECT)
        .eq('is_active', true)
        .neq('id', productId)
        .order('sold_count', { ascending: false, nullsFirst: false })
        .order('avg_rating', { ascending: false, nullsFirst: false })
        .limit(Math.max(limit * 3, 12));

      if (categoryId) {
        fallbackQuery = fallbackQuery.eq('category_id', categoryId);
      } else if (tags?.length) {
        fallbackQuery = fallbackQuery.overlaps('tags', tags);
      }

      const [associatedResult, fallbackResult] = await Promise.all([associatedQuery, fallbackQuery]);

      if (associatedResult.error) throw associatedResult.error;
      if (fallbackResult.error) throw fallbackResult.error;

      const associatedProducts: RelatedProduct[] = (associatedResult.data || [])
        .map((row: any) => {
          const product = Array.isArray(row.associated_product)
            ? row.associated_product[0]
            : row.associated_product;
          if (!product) return null;
          const associationBase = ASSOCIATION_WEIGHT[row.association_type] || 80;
          return {
            ...product,
            relevanceScore: associationBase + Number(row.strength || 0) * 30 + Math.min(row.purchase_count || 0, 100),
            reason: associationReason(row.association_type),
          } as RelatedProduct;
        })
        .filter(Boolean) as RelatedProduct[];

      const fallbackProducts = ((fallbackResult.data || []) as Product[]).map((product) =>
        scoreFallbackProduct(product, options)
      );

      return uniqueById([...associatedProducts, ...fallbackProducts], productId, limit);
    },
  });
}