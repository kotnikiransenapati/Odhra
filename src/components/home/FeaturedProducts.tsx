import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2 } from 'lucide-react';
import { ProductCard } from '@/components/shop/ProductCard';
import { useProducts } from '@/hooks/useProducts';
import { Skeleton } from '@/components/ui/skeleton';

export function FeaturedProducts() {
  const { data: products, isLoading } = useProducts({ featured: true, limit: 8 });

  return (
    <section className="py-24 px-4 bg-secondary/30">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex items-end justify-between mb-12"
        >
          <div>
            <span className="text-accent text-sm font-semibold uppercase tracking-wider mb-2 block">
              Handpicked for You
            </span>
            <h2 className="text-3xl md:text-4xl font-bold">Featured Products</h2>
          </div>
          <Link 
            to="/shop?filter=featured" 
            className="hidden md:flex items-center gap-2 text-accent hover:underline font-medium group"
          >
            View All
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-square rounded-2xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : products && products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((product, index) => {
              const primaryImage = product.product_images?.find(img => img.is_primary);
              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                >
                  <ProductCard
                    id={product.id}
                    title={product.title}
                    slug={product.slug}
                    price={product.price}
                    compareAtPrice={product.compare_at_price}
                    imageUrl={primaryImage?.url}
                    rating={product.avg_rating || 0}
                    reviewCount={product.review_count || 0}
                    vendorName={product.vendors?.brand_name}
                    isFeatured={product.is_featured}
                    stock={product.stock}
                  />
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No featured products yet</p>
          </div>
        )}

        {/* Mobile View All */}
        <div className="md:hidden mt-8 text-center">
          <Link 
            to="/shop?filter=featured" 
            className="inline-flex items-center gap-2 text-accent hover:underline font-medium"
          >
            View All Featured
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
