import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, Clock, Crown } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { FlashSaleCard } from '@/components/flash-sales/FlashSaleCard';
import { FlashSaleCountdown } from '@/components/flash-sales/FlashSaleCountdown';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useFlashSales, FlashSaleProduct } from '@/hooks/useFlashSales';

export default function FlashSales() {
  const { activeFlashSales, isLoading, getFlashSaleProducts, hasEarlyAccess } = useFlashSales();
  const [saleProducts, setSaleProducts] = useState<Record<string, FlashSaleProduct[]>>({});
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    const loadProducts = async () => {
      setLoadingProducts(true);
      const productsMap: Record<string, FlashSaleProduct[]> = {};
      
      for (const sale of activeFlashSales) {
        const products = await getFlashSaleProducts(sale.id);
        productsMap[sale.id] = products;
      }
      
      setSaleProducts(productsMap);
      setLoadingProducts(false);
    };

    if (activeFlashSales.length > 0) {
      loadProducts();
    } else if (!isLoading) {
      setLoadingProducts(false);
    }
  }, [activeFlashSales, getFlashSaleProducts, isLoading]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-destructive/20 via-destructive/10 to-orange-500/20 py-8 md:py-12">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-2 mb-4"
          >
            <Zap className="h-8 w-8 text-destructive animate-pulse" />
            <h1 className="text-3xl md:text-4xl font-bold">Flash Sales</h1>
            <Zap className="h-8 w-8 text-destructive animate-pulse" />
          </motion.div>
          <p className="text-muted-foreground text-lg">
            Limited time deals with massive discounts. Don't miss out!
          </p>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 pb-24 md:pb-8">
        {isLoading || loadingProducts ? (
          <div className="space-y-8">
            {[1, 2].map((i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-8 w-64" />
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((j) => (
                    <Skeleton key={j} className="aspect-[3/4] rounded-xl" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : activeFlashSales.length === 0 ? (
          <div className="text-center py-16">
            <Clock className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-semibold mb-2">No Active Flash Sales</h2>
            <p className="text-muted-foreground">
              Check back soon for amazing deals and discounts!
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {activeFlashSales.map((sale) => (
              <section key={sale.id} className="space-y-6">
                {/* Sale Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 md:p-6 bg-card rounded-xl border border-border">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-bold">{sale.title}</h2>
                      {hasEarlyAccess(sale) && (
                        <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600">
                          <Crown className="h-3 w-3 mr-1" />
                          Early Access
                        </Badge>
                      )}
                    </div>
                    {sale.description && (
                      <p className="text-muted-foreground">{sale.description}</p>
                    )}
                  </div>
                  <FlashSaleCountdown endTime={sale.ends_at} variant="default" />
                </div>

                {/* Sale Banner */}
                {sale.banner_url && (
                  <img
                    src={sale.banner_url}
                    alt={sale.title}
                    className="w-full h-48 md:h-64 object-cover rounded-xl"
                  />
                )}

                {/* Products Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {saleProducts[sale.id]?.map((product) => (
                    <FlashSaleCard
                      key={product.id}
                      product={product}
                      endTime={sale.ends_at}
                    />
                  ))}
                </div>

                {(!saleProducts[sale.id] || saleProducts[sale.id].length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    All items in this sale have been sold out!
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
}
