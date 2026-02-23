import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Crown, Sparkles } from 'lucide-react';
import { ProductCard } from '@/components/shop/ProductCard';
import { ProductCompactCard } from '@/components/shop/ProductCompactCard';
import { ProductListCard } from '@/components/shop/ProductListCard';
import { ViewModeToggle } from '@/components/shop/ViewModeToggle';
import { useProducts } from '@/hooks/useProducts';
import { ProductGridSkeleton } from '@/components/shop/ProductGridSkeleton';
import { useViewMode, getGridClasses } from '@/hooks/useViewMode';

export function FeaturedProducts() {
  const { data: products, isLoading } = useProducts({ featured: true, limit: 12 });
  const { viewMode, setViewMode } = useViewMode('grid');

  const renderProduct = (product: NonNullable<typeof products>[0], index: number) => {
    const primaryImage = product.product_images?.find(img => img.is_primary) || product.product_images?.[0];
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
            transition={{ delay: index * 0.04 }}
            className="relative"
          >
            {index === 0 && (
              <motion.div 
                className="absolute -top-2 -right-2 z-10 px-3 py-1 rounded-lg bg-gradient-to-r from-accent to-warning text-accent-foreground text-xs font-bold shadow-lg flex items-center gap-1"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: 'spring' }}
              >
                <Sparkles className="w-3 h-3" />
                Editor's Pick
              </motion.div>
            )}
            <ProductCard {...commonProps} />
          </motion.div>
        );
    }
  };

  return (
    <section className="py-16 md:py-24 px-4 bg-gradient-to-b from-background via-secondary/30 to-background relative overflow-hidden">
      <div className="absolute top-1/4 -left-32 w-64 h-64 bg-accent/5 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-primary/5 rounded-full blur-[100px]" />
      
      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10"
        >
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-accent/20 to-warning/20 shadow-sm">
                <Crown className="w-5 h-5 text-accent" />
              </div>
              <span className="text-accent text-sm font-bold uppercase tracking-wider">
                Handpicked Selection
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Featured <span className="text-accent">Products</span>
            </h2>
            <p className="text-muted-foreground font-medium">
              Curated by our experts for exceptional quality
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
            <Link 
              to="/shop?filter=featured" 
              className="hidden md:inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-accent-foreground font-semibold shadow-md hover:shadow-lg transition-all group"
            >
              View All Featured
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
          <div className="text-center py-16 bg-card/50 rounded-2xl border border-border/50">
            <Crown className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">No featured products yet</p>
            <Link to="/shop" className="text-accent hover:underline text-sm mt-2 inline-block">
              Browse all products
            </Link>
          </div>
        )}

        <div className="md:hidden mt-8 text-center">
          <Link 
            to="/shop?filter=featured" 
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-accent-foreground font-semibold shadow-md"
          >
            View All Featured
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
