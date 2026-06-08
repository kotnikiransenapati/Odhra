import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import { ProductCard } from '@/components/shop/ProductCard';
import { Skeleton } from '@/components/ui/skeleton';
import { haptic } from '@/lib/haptics';

interface RelatedProductsProps {
  currentProductId: string;
  categoryId?: string | null;
  categorySlug?: string | null;
  categoryName?: string | null;
}

export function RelatedProducts({
  currentProductId,
  categoryId,
  categorySlug,
  categoryName,
}: RelatedProductsProps) {
  const { data, isLoading } = useProducts({
    categoryId: categoryId || undefined,
    sortBy: 'popular',
    limit: 12,
  });

  const items = (data || []).filter((p) => p.id !== currentProductId).slice(0, 8);

  if (!isLoading && items.length === 0) return null;

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

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-[4/5] w-full rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <motion.ul
          role="list"
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-50px' }}
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.05 } },
          }}
        >
          {items.map((product) => (
            <motion.li
              key={product.id}
              variants={{
                hidden: { opacity: 0, y: 16 },
                show: {
                  opacity: 1,
                  y: 0,
                  transition: { type: 'spring', stiffness: 400, damping: 30 },
                },
              }}
            >
              <ProductCard product={product as any} />
            </motion.li>
          ))}
        </motion.ul>
      )}
    </section>
  );
}
