import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingUp, ArrowRight, Flame } from 'lucide-react';
import { ProductCard } from '@/components/shop/ProductCard';
import { useProducts } from '@/hooks/useProducts';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export function TrendingProducts() {
  // In a real app, this would fetch products sorted by sold_count/view_count
  const { data: products, isLoading } = useProducts({ limit: 8 });

  return (
    <section className="py-20 px-4 relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
      
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex items-end justify-between mb-12"
        >
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <Flame className="w-5 h-5 text-accent" />
              </div>
              <Badge variant="secondary" className="gap-1">
                <TrendingUp className="w-3 h-3" />
                Trending Now
              </Badge>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold">What's Hot Right Now</h2>
            <p className="text-muted-foreground mt-2">Most popular products this week</p>
          </div>
          <Link 
            to="/shop?sort=trending" 
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
                  className="relative"
                >
                  {/* Trending rank badge */}
                  {index < 3 && (
                    <div className="absolute -top-2 -left-2 z-10 w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-sm font-bold shadow-lg">
                      #{index + 1}
                    </div>
                  )}
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
            <p className="text-muted-foreground">No trending products yet</p>
          </div>
        )}

        {/* Mobile View All */}
        <div className="md:hidden mt-8 text-center">
          <Link 
            to="/shop?sort=trending" 
            className="inline-flex items-center gap-2 text-accent hover:underline font-medium"
          >
            View All Trending
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
