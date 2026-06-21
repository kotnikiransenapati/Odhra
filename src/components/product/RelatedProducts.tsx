import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useRelatedProducts, type RelatedProduct } from '@/hooks/useRelatedProducts';
import { ProductCard } from '@/components/shop/ProductCard';
import { Skeleton } from '@/components/ui/skeleton';
import { haptic } from '@/lib/haptics';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

interface RelatedProductsProps {
  currentProductId: string;
  categoryId?: string | null;
  categorySlug?: string | null;
  categoryName?: string | null;
  tags?: string[] | null;
  price?: number | null;
}

const reasonLabel: Record<RelatedProduct['reason'], string> = {
  curated: 'Curated match',
  frequently_bought: 'Bought together',
  same_category: 'Same collection',
  similar_tags: 'Similar style',
  popular: 'Popular pick',
};

export function RelatedProducts({
  currentProductId,
  categoryId,
  categorySlug,
  categoryName,
  tags,
  price,
}: RelatedProductsProps) {
  const { data: items = [], isLoading, isFetching, isError } = useRelatedProducts({
    productId: currentProductId,
    categoryId,
    tags,
    price,
    limit: 10,
  });

  const showSkeleton = isLoading && !items.length;

  if ((!showSkeleton && items.length === 0) || isError) return null;

  return (
    <section
      className="mt-16"
      aria-labelledby="related-products-heading"
    >
      <div className="flex items-end justify-between mb-6 gap-4">
        <div>
          <h2
            id="related-products-heading"
            className="text-2xl sm:text-3xl font-bold tracking-tight"
          >
            You may also like
          </h2>
          {categoryName && (
            <p className="text-sm text-muted-foreground mt-1">
              More from {categoryName}
            </p>
          )}
        </div>
        {categorySlug && (
          <Link
            to={`/shop?category=${categorySlug}`}
            onClick={() => haptic('selection')}
            className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-md px-1"
            aria-label={`View all products in ${categoryName || 'this category'}`}
          >
            View all <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        )}
      </div>

      {showSkeleton ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: isFetching ? 4 : 0 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-[4/5] w-full rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <Carousel
          opts={{ align: 'start', dragFree: true }}
          className="relative"
          aria-label="Related product recommendations"
        >
          <CarouselContent className="-ml-3 sm:-ml-4">
            {items.map((product, index) => (
              <CarouselItem
                key={product.id}
                className="basis-[72%] pl-3 xs:basis-[58%] sm:basis-1/3 sm:pl-4 lg:basis-1/4 xl:basis-1/5"
                aria-label={`${index + 1} of ${items.length}: ${product.title}`}
              >
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30, delay: index * 0.03 }}
                  className="relative h-full"
                >
                  <div className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 text-[10px] font-semibold text-foreground shadow-sm backdrop-blur">
                    <Sparkles className="h-3 w-3 text-accent" aria-hidden="true" />
                    {reasonLabel[product.reason]}
                  </div>
                  <ProductCard
                    id={product.id}
                    title={product.title}
                    slug={product.slug}
                    price={product.price}
                    compareAtPrice={product.compare_at_price}
                    imageUrl={
                      product.product_images?.find((i) => i.is_primary)?.url ||
                      product.product_images?.[0]?.url
                    }
                    rating={product.avg_rating ?? 0}
                    reviewCount={product.review_count ?? 0}
                    vendorName={product.vendors_public?.brand_name}
                    vendorSlug={product.vendors_public?.slug}
                    isFeatured={product.is_featured}
                    stock={product.stock}
                    soldCount={product.sold_count ?? 0}
                  />
                </motion.div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious
            className="left-2 top-[42%] hidden min-h-11 min-w-11 border-border/60 bg-background/90 shadow-lg backdrop-blur sm:inline-flex"
            onClick={() => haptic('selection')}
          />
          <CarouselNext
            className="right-2 top-[42%] hidden min-h-11 min-w-11 border-border/60 bg-background/90 shadow-lg backdrop-blur sm:inline-flex"
            onClick={() => haptic('selection')}
          />
        </Carousel>
      )}
    </section>
  );
}
