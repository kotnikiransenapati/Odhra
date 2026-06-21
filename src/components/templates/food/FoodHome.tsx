import { Suspense, lazy } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { SEOHead, homepageJsonLd } from '@/components/SEOHead';
import { SectionErrorBoundary } from '@/components/ui/SectionErrorBoundary';
import { usePromoStripContent } from '@/hooks/useHomepageCMS';
import { PromoStrip } from '@/components/home/PromoStrip';
import { FoodUtilityRibbon } from './FoodUtilityRibbon';
import { FoodHero } from './FoodHero';
import { FoodCuisineRail } from './FoodCuisineRail';
import { FoodDishRail } from './FoodDishRail';

const Footer = lazy(() => import('@/components/layout/Footer').then(m => ({ default: m.Footer })));
const DeliveryReviews = lazy(() => import('@/components/home/DeliveryReviews').then(m => ({ default: m.DeliveryReviews })));
const TrustBadges = lazy(() => import('@/components/home/TrustBadges').then(m => ({ default: m.TrustBadges })));
const RecentlyViewedWidget = lazy(() => import('@/components/ui/RecentlyViewed').then(m => ({ default: m.RecentlyViewedWidget })));

/**
 * Advanced Food template homepage.
 * Composition: trust ribbon → navbar → appetite hero → cuisines rail →
 * popular dishes → best rated → new on menu → trust → real reviews.
 */
export default function FoodHome() {
  const { data: promoStrip } = usePromoStripContent();

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <SEOHead
        title="Buy Indian Snacks Online — Namkeen, Mithai & More"
        description="Shop authentic Indian snacks online — namkeen, bhujia, chivda, mithai, chips and regional favourites. FSSAI certified brands, pan-India delivery, free shipping over ₹499."
        keywords="indian snacks online, namkeen, bhujia, mithai, chivda, chips, buy snacks india"
        jsonLd={homepageJsonLd}
      />
      <h1 className="sr-only">Indian Snacks Store — Namkeen, Mithai, Chips & Regional Favourites</h1>

      <FoodUtilityRibbon />

      {promoStrip && promoStrip.isActive && (
        <PromoStrip
          message={promoStrip.message}
          link={promoStrip.link}
          linkText={promoStrip.linkText}
          countdownTo={promoStrip.countdownTo}
        />
      )}

      <Navbar />

      <main className="space-y-2">
        <SectionErrorBoundary>
          <FoodHero />
        </SectionErrorBoundary>

        <SectionErrorBoundary>
          <FoodCuisineRail />
        </SectionErrorBoundary>

        <SectionErrorBoundary>
          <FoodDishRail
            title="Trending tonight"
            subtitle="Ordered most in your area"
            sortBy="trending"
            limit={10}
            viewAllLink="/shop?sort=trending"
            badge="🔥 Hot"
          />
        </SectionErrorBoundary>

        <SectionErrorBoundary>
          <FoodDishRail
            title="Top rated dishes"
            subtitle="Loved by verified diners"
            sortBy="rating"
            limit={10}
            viewAllLink="/shop?sort=rating"
            badge="★ 4.5+"
          />
        </SectionErrorBoundary>

        <SectionErrorBoundary>
          <FoodDishRail
            title="New on the menu"
            subtitle="Just-added kitchens and dishes"
            sortBy="newest"
            limit={10}
            viewAllLink="/shop?sort=newest"
            badge="✨ New"
          />
        </SectionErrorBoundary>

        <SectionErrorBoundary>
          <Suspense fallback={null}>
            <TrustBadges />
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
