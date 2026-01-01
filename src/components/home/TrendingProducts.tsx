import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingUp, ArrowRight, Flame, Clock } from 'lucide-react';
import { ProductCard } from '@/components/shop/ProductCard';
import { useProducts } from '@/hooks/useProducts';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export function TrendingProducts() {
  // In a real app, this would fetch products sorted by sold_count/view_count
  const { data: products, isLoading } = useProducts({ limit: 8 });

  return (
    <section className="py-16 md:py-24 px-4 relative overflow-hidden bg-gradient-to-b from-background to-secondary/20">
      {/* Section accent line */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent/60 to-transparent" />
      
      <div className="max-w-7xl mx-auto">
        {/* Header with urgency psychology */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10"
        >
          <div>
            <div className="flex items-center gap-3 mb-4">
              <motion.div 
                className="p-2.5 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 shadow-sm"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Flame className="w-5 h-5 text-orange-500" />
              </motion.div>
              <Badge className="gap-1.5 bg-accent/10 text-accent border-accent/30 px-3 py-1 font-semibold">
                <TrendingUp className="w-3.5 h-3.5" />
                Trending Now
              </Badge>
              <Badge variant="outline" className="gap-1 text-muted-foreground hidden sm:flex">
                <Clock className="w-3 h-3" />
                Updated hourly
              </Badge>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              What Everyone's <span className="text-accent">Buying</span>
            </h2>
            <p className="text-muted-foreground font-medium">
              Join thousands of happy customers with our most popular picks
            </p>
          </div>
          <Link 
            to="/shop?sort=trending" 
            className="hidden md:inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent/10 text-accent hover:bg-accent/20 font-semibold transition-colors group"
          >
            View All Trending
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
                  transition={{ delay: index * 0.04 }}
                  className="relative"
                >
                  {/* Trending rank badge - Psychology: Scarcity & Social Proof */}
                  {index < 3 && (
                    <motion.div 
                      className="absolute -top-2 -left-2 z-10 w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-orange-500 text-accent-foreground flex items-center justify-center text-sm font-bold shadow-lg"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3 + index * 0.1, type: 'spring' }}
                    >
                      #{index + 1}
                    </motion.div>
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
          <div className="text-center py-16 bg-card/50 rounded-2xl border border-border/50">
            <Flame className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">No trending products yet</p>
            <Link to="/shop" className="text-accent hover:underline text-sm mt-2 inline-block">
              Browse all products
            </Link>
          </div>
        )}

        {/* Mobile View All */}
        <div className="md:hidden mt-8 text-center">
          <Link 
            to="/shop?sort=trending" 
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent/10 text-accent font-semibold"
          >
            View All Trending
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}