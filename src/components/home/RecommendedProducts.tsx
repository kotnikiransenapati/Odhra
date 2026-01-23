import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Heart } from 'lucide-react';
import { ProductCard } from '@/components/shop/ProductCard';
import { ProductCompactCard } from '@/components/shop/ProductCompactCard';
import { ProductListCard } from '@/components/shop/ProductListCard';
import { ViewModeToggle } from '@/components/shop/ViewModeToggle';
import { useProducts } from '@/hooks/useProducts';
import { useAuth } from '@/contexts/AuthContext';
import { ProductGridSkeleton } from '@/components/shop/ProductGridSkeleton';
import { Badge } from '@/components/ui/badge';
import { useViewMode, getGridClasses } from '@/hooks/useViewMode';

export function RecommendedProducts() {
  const { user } = useAuth();
  const { data: products, isLoading } = useProducts({ limit: 12 });
  const { viewMode, setViewMode } = useViewMode('grid');

  const renderProduct = (product: NonNullable<typeof products>[0], index: number) => {
    const primaryImage = product.product_images?.find(img => img.is_primary);
    const commonProps = {
      id: product.id,
      title: product.title,
      slug: product.slug,
      price: product.price,
      compareAtPrice: product.compare_at_price,
      imageUrl: primaryImage?.url,
      rating: product.avg_rating || 0,
      reviewCount: product.review_count || 0,
      vendorName: product.vendors_public?.brand_name,
      isFeatured: product.is_featured,
      stock: product.stock,
    };

    switch (viewMode) {
      case 'compact':
        return <ProductCompactCard key={product.id} {...commonProps} />;
      case 'list':
        return <ProductListCard key={product.id} {...commonProps} description={product.description} />;
      default:
        return (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.05 }}
          >
            <ProductCard {...commonProps} />
          </motion.div>
        );
    }
  };

  return (
    <section className="py-20 px-4 bg-gradient-to-b from-secondary/30 to-background">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12"
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
          <div className="flex items-center gap-3">
            <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
            <Link 
              to="/shop?sort=recommended" 
              className="hidden md:flex items-center gap-2 text-accent hover:underline font-medium group"
            >
              View All
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </motion.div>

        {isLoading ? (
          <ProductGridSkeleton count={viewMode === 'compact' ? 12 : 8} viewMode={viewMode} />
        ) : products && products.length > 0 ? (
          <div className={`grid gap-4 md:gap-6 ${getGridClasses(viewMode)}`}>
            {products.map((product, index) => renderProduct(product, index))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No recommendations yet</p>
          </div>
        )}

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
