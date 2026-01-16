import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Heart } from 'lucide-react';
import { ProductCard } from '@/components/shop/ProductCard';
import { useProducts } from '@/hooks/useProducts';
import { useAuth } from '@/contexts/AuthContext';
import { ProductGridSkeleton } from '@/components/shop/ProductCardSkeleton';
import { Badge } from '@/components/ui/badge';

export function RecommendedProducts() {
  const { user } = useAuth();
  // In real implementation, this would use user's browsing history and preferences
  const { data: products, isLoading } = useProducts({ limit: 8 });

  return (
    <section className="py-20 px-4 bg-gradient-to-b from-secondary/30 to-background">
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
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <Badge variant="outline" className="gap-1">
                <Heart className="w-3 h-3" />
                Personalized
              </Badge>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold">
              {user ? 'Recommended For You' : 'You Might Like'}
            </h2>
            <p className="text-muted-foreground mt-2">
              {user 
                ? 'Based on your browsing history and preferences' 
                : 'Popular picks you might love'
              }
            </p>
          </div>
          <Link 
            to="/shop?sort=recommended" 
            className="hidden md:flex items-center gap-2 text-accent hover:underline font-medium group"
          >
            View All
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>

        {/* Products Grid */}
        {isLoading ? (
          <ProductGridSkeleton count={8} />
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
                    vendorName={product.vendors_public?.brand_name}
                    isFeatured={product.is_featured}
                    stock={product.stock}
                  />
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No recommendations yet</p>
          </div>
        )}

        {/* Mobile View All */}
        <div className="md:hidden mt-8 text-center">
          <Link 
            to="/shop?sort=recommended" 
            className="inline-flex items-center gap-2 text-accent hover:underline font-medium"
          >
            View All Recommendations
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
