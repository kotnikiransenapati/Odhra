import { Suspense, lazy } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { HeroSlider } from '@/components/home/HeroSlider';
import { PromoStrip } from '@/components/home/PromoStrip';
import { Skeleton } from '@/components/ui/skeleton';
import { SEOHead, homepageJsonLd } from '@/components/SEOHead';
import { SectionErrorBoundary } from '@/components/ui/SectionErrorBoundary';
import { usePromoStripContent } from '@/hooks/useHomepageCMS';
import { EcommerceUtilityRibbon } from './EcommerceUtilityRibbon';
import { EcommerceCategoryStrip } from './EcommerceCategoryStrip';
import { EcommerceDealsGrid } from './EcommerceDealsGrid';

const Footer = lazy(() => import('@/components/layout/Footer').then(m => ({ default: m.Footer })));
const ProductCarousel = lazy(() => import('@/components/home/ProductCarousel').then(m => ({ default: m.ProductCarousel })));
const DealsCarousel = lazy(() => import('@/components/home/DealsCarousel').then(m => ({ default: m.DealsCarousel })));
const TrustBadges = lazy(() => import('@/components/home/TrustBadges').then(m => ({ default: m.TrustBadges })));
const DeliveryReviews = lazy(() => import('@/components/home/DeliveryReviews').then(m => ({ default: m.DeliveryReviews })));
const RecentlyViewedWidget = lazy(() => import('@/components/ui/RecentlyViewed').then(m => ({ default: m.RecentlyViewedWidget })));

const FB = () => (
  <div className="py-8 px-3">
    <Skeleton className="h-6 w-48 mb-3" />
    <div className="flex gap-3">
      {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="w-36 h-52 rounded" />)}
    </div>
  </div>
);

/**
 * Advanced Ecommerce template homepage.
 * Composition: trust ribbon → utility nav → dense category strip → hero →
 * 4-up "Today's Deals" grid (Amazon-style cards) → flat carousels → reviews.
 */
export default function EcommerceHome() {
  const { data: promoStrip } = usePromoStripContent();

  return (
    <div className="min-h-screen bg-secondary/40 pb-16 lg:pb-0">
      <SEOHead
        title="Premium Marketplace"
        description="India's premium multi-vendor marketplace. Verified vendors, best prices, fast delivery."
        keywords="online shopping India, ecommerce, deals, verified vendors"
        jsonLd={homepageJsonLd}
      />
      <h1 className="sr-only">Marketplace — Verified Vendors, Best Prices, Fast Delivery</h1>

      <EcommerceUtilityRibbon />

      {promoStrip && promoStrip.isActive && (
        <PromoStrip
          message={promoStrip.message}
          link={promoStrip.link}
          linkText={promoStrip.linkText}
          countdownTo={promoStrip.countdownTo}
        />
      )}

      <Navbar />

      <EcommerceCategoryStrip />

      <main className="space-y-6">
        {/* Hero band with overlap deals grid */}
        <section className="bg-primary/95">
          <div className="max-w-7xl mx-auto px-3 pt-4 pb-20">
            <SectionErrorBoundary>
              <HeroSlider />
            </SectionErrorBoundary>
          </div>
        </section>

        <SectionErrorBoundary>
          <EcommerceDealsGrid />
        </SectionErrorBoundary>

        <SectionErrorBoundary>
          <Suspense fallback={<FB />}>
            <DealsCarousel title="Lightning deals" subtitle="Limited stock, limited time" limit={12} />
          </Suspense>
        </SectionErrorBoundary>

        <SectionErrorBoundary>
          <Suspense fallback={<FB />}>
            <ProductCarousel
              title="Trending now"
              subtitle="What everyone's buying"
              sortBy="trending"
              limit={12}
              bgColor="bg-card"
              badge="🔥"
              badgeColor="bg-destructive text-destructive-foreground"
              viewAllLink="/shop?sort=trending"
            />
          </Suspense>
        </SectionErrorBoundary>

        <SectionErrorBoundary>
          <Suspense fallback={<FB />}>
            <ProductCarousel
              title="Top rated this week"
              subtitle="Verified buyer ratings 4★+"
              sortBy="rating"
              limit={12}
              bgColor="bg-card"
              badge="★ Top"
              badgeColor="bg-accent text-accent-foreground"
              viewAllLink="/shop?sort=rating"
            />
          </Suspense>
        </SectionErrorBoundary>

        <SectionErrorBoundary>
          <Suspense fallback={null}>
            <TrustBadges />
          </Suspense>
        </SectionErrorBoundary>

        <SectionErrorBoundary>
          <Suspense fallback={<FB />}>
            <ProductCarousel
              title="New arrivals"
              subtitle="Fresh from our vendors"
              sortBy="newest"
              limit={12}
              bgColor="bg-card"
              badge="✨ New"
              badgeColor="bg-success text-success-foreground"
              viewAllLink="/shop?sort=newest"
            />
          </Suspense>
        </SectionErrorBoundary>

        <SectionErrorBoundary>
          <Suspense fallback={null}>
            <DeliveryReviews />
          </Suspense>
        </SectionErrorBoundary>

        <Suspense fallback={null}>
          <RecentlyViewedWidget />
        </Suspense>
      </main>

      <Suspense fallback={null}>
        <Footer />
      </Suspense>

      <BottomNavigation />
    </div>
  );
}
