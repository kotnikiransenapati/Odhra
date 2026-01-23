import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { History, ArrowRight, RotateCcw, ShoppingBag } from 'lucide-react';
import { ProductCard } from '@/components/shop/ProductCard';
import { ProductCompactCard } from '@/components/shop/ProductCompactCard';
import { ProductListCard } from '@/components/shop/ProductListCard';
import { ViewModeToggle } from '@/components/shop/ViewModeToggle';
import { useProducts } from '@/hooks/useProducts';
import { useAuth } from '@/contexts/AuthContext';
import { ProductGridSkeleton } from '@/components/shop/ProductGridSkeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useViewMode, getGridClasses } from '@/hooks/useViewMode';

export function PreviouslyPurchased() {
  const { user } = useAuth();
  const { data: products, isLoading } = useProducts({ limit: 8 });
  const { viewMode, setViewMode } = useViewMode('grid');

  if (!user) return null;

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
      isFeatured: false,
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
            className="relative group"
          >
            <ProductCard {...commonProps} />
          </motion.div>
        );
    }
  };

  return (
    <section className="py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8"
        >
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <History className="w-5 h-5 text-green-600" />
              </div>
              <Badge variant="secondary" className="gap-1">
                <RotateCcw className="w-3 h-3" />
                Buy Again
              </Badge>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold">Your Previous Purchases</h2>
            <p className="text-muted-foreground mt-1">Loved something? Get it again with one click</p>
          </div>
          <div className="flex items-center gap-3">
            <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
            <Link 
              to="/customer/orders" 
              className="hidden md:flex items-center gap-2 text-accent hover:underline font-medium group"
            >
              View Order History
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </motion.div>

        {isLoading ? (
          <ProductGridSkeleton count={viewMode === 'compact' ? 8 : 4} viewMode={viewMode} />
        ) : products && products.length > 0 ? (
          <div className={`grid gap-4 md:gap-6 ${getGridClasses(viewMode)}`}>
            {products.slice(0, viewMode === 'compact' ? 8 : 4).map((product, index) => 
              renderProduct(product, index)
            )}
          </div>
        ) : (
          <div className="text-center py-12 bg-secondary/30 rounded-2xl">
            <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No previous purchases yet</p>
            <Button asChild>
              <Link to="/shop">Start Shopping</Link>
            </Button>
          </div>
        )}

        <div className="md:hidden mt-6 text-center">
          <Link 
            to="/customer/orders" 
            className="inline-flex items-center gap-2 text-accent hover:underline font-medium"
          >
            View Order History
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
