import React, { Suspense, lazy, useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';

import { Navbar } from '@/components/layout/Navbar';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { HeroSlider } from '@/components/home/HeroSlider';
import { PromoStrip } from '@/components/home/PromoStrip';
import { QuickServices } from '@/components/home/QuickServices';
import { CategoryTabs } from '@/components/home/CategoryTabs';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useHomepageSections, usePromoStripContent } from '@/hooks/useHomepageCMS';
import { useFeatures } from '@/hooks/useFeatureFlags';
import { Sparkles, ChevronRight, Shield, Truck, Award } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { SEOHead, homepageJsonLd } from '@/components/SEOHead';
import { SectionErrorBoundary } from '@/components/ui/SectionErrorBoundary';
import { useSiteTemplate } from '@/hooks/useSiteTemplate';

// Lazy-load below-fold components to reduce main chunk size and shorten critical chain
const TrustBadges = lazy(() => import('@/components/home/TrustBadges').then(m => ({ default: m.TrustBadges })));
const DealBannerSection = lazy(() => import('@/components/home/DealBanner').then(m => ({ default: m.DealBannerSection })));
const Footer = lazy(() => import('@/components/layout/Footer').then(m => ({ default: m.Footer })));

// Lazy load all product-fetching components — they only load + fetch data when in viewport
const ProductCarousel = lazy(() => import('@/components/home/ProductCarousel').then(m => ({ default: m.ProductCarousel })));
const DealsCarousel = lazy(() => import('@/components/home/DealsCarousel').then(m => ({ default: m.DealsCarousel })));

// Lazy load below-the-fold components
const TrendingProducts = lazy(() => import('@/components/home/TrendingProducts').then(m => ({ default: m.TrendingProducts })));
const RecommendedProducts = lazy(() => import('@/components/home/RecommendedProducts').then(m => ({ default: m.RecommendedProducts })));
const PreviouslyPurchased = lazy(() => import('@/components/home/PreviouslyPurchased').then(m => ({ default: m.PreviouslyPurchased })));
const CategoryShowcase = lazy(() => import('@/components/home/CategoryShowcase').then(m => ({ default: m.CategoryShowcase })));
const ConditionalSpinWheel = lazy(() => import('@/components/home/ConditionalSpinWheel').then(m => ({ default: m.ConditionalSpinWheel })));
const FeaturedProducts = lazy(() => import('@/components/home/FeaturedProducts').then(m => ({ default: m.FeaturedProducts })));
const CustomerStories = lazy(() => import('@/components/home/CustomerStories').then(m => ({ default: m.CustomerStories })));
const TrendingNowCarousel = lazy(() => import('@/components/home/TrendingNowCarousel').then(m => ({ default: m.TrendingNowCarousel })));
const DeliveryReviews = lazy(() => import('@/components/home/DeliveryReviews').then(m => ({ default: m.DeliveryReviews })));
const FlashSaleBanner = lazy(() => import('@/components/marketing/FlashSaleBanner').then(m => ({ default: m.FlashSaleBanner })));
const WelcomePopup = lazy(() => import('@/components/marketing/WelcomePopup').then(m => ({ default: m.WelcomePopup })));
const RecentlyViewedWidget = lazy(() => import('@/components/ui/RecentlyViewed').then(m => ({ default: m.RecentlyViewedWidget })));

// Loading fallback
const SectionSkeleton = () => (
  <div className="py-8 px-4">
    <div className="max-w-7xl mx-auto">
      <Skeleton className="h-6 w-48 mb-4" />
      <div className="flex gap-3 overflow-hidden">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="w-36 h-52 rounded-xl flex-shrink-0" />
        ))}
      </div>
    </div>
  </div>
);

// Hook: only renders children when the wrapper enters viewport (with rootMargin for preloading)
function useInView(rootMargin = '200px') {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } },
      { rootMargin, threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return { ref, inView };
}

// Deferred section — only renders children when scrolled near, avoids data fetching until visible
function DeferredSection({ children, fallback, className = '' }: { children: React.ReactNode; fallback?: React.ReactNode; className?: string }) {
  const { ref, inView } = useInView('300px');
  return (
    <div ref={ref} className={className}>
      {inView ? children : (fallback || <SectionSkeleton />)}
    </div>
  );
}

// Lightweight CSS-based scroll animation (avoids framer-motion forced reflows)
function AnimatedSection({ children, className = '' }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, inView } = useInView('-60px');

  return (
    <div
      ref={ref}
      className={`transition-all duration-500 ease-out ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
    >
      {children}
    </div>
  );
}

// Vendor CTA Section - Premium redesign
function VendorCTA() {
  const { user } = useAuth();
  
  return (
    <section className="py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <AnimatedSection>
          <div className="relative rounded-3xl overflow-hidden">
            {/* Background with premium gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/95 to-primary/80" />
            <div className="absolute inset-0 opacity-[0.04]" style={{
              backgroundImage: `radial-gradient(circle at 20% 50%, hsl(var(--accent)) 1px, transparent 1px), radial-gradient(circle at 80% 20%, hsl(var(--accent)) 1px, transparent 1px)`,
              backgroundSize: '60px 60px, 40px 40px'
            }} />
            <div className="absolute top-0 right-0 w-80 h-80 bg-accent/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3" />

            <div className="relative z-10 p-8 md:p-14 text-center">
              <span
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/15 text-accent text-sm font-semibold mb-5 backdrop-blur-sm border border-accent/20"
              >
                <Sparkles className="w-4 h-4" />
                Join 500+ Verified Vendors
              </span>

              <h2 className="font-display text-display-sm md:text-display-md text-primary-foreground mb-4 text-balance">
                Start Your <span className="text-accent">Premium</span> Store
              </h2>
              <p className="text-primary-foreground/70 max-w-xl mx-auto mb-8 text-sm md:text-base leading-relaxed">
                Join India's fastest-growing marketplace. Low commission rates, powerful analytics, and dedicated support for every seller.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  size="lg" 
                  className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold gap-2 shadow-lg shadow-accent/25 px-8"
                  asChild
                >
                  <Link to={user ? "/become-vendor" : "/auth"}>
                    Start Selling Free
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/15 font-semibold bg-primary-foreground/10 backdrop-blur-sm"
                  asChild
                >
                  <Link to="/about">Learn more about selling on Odhra</Link>
                </Button>
              </div>

              {/* Trust row */}
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-8 text-primary-foreground/60 text-xs">
                <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Secure Payments</span>
                <span className="flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" /> Pan-India Delivery</span>
                <span className="flex items-center gap-1.5"><Award className="w-3.5 h-3.5" /> 0% Commission*</span>
              </div>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}

// Personalized greeting for returning users
function PersonalizedGreeting({ userName }: { userName: string }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  
  return (
    <AnimatedSection>
      <div className="px-4 pt-2">
        <div className="max-w-7xl mx-auto">
           <div
            className="flex items-center gap-3 py-3"
          >
            <div className="text-2xl">👋</div>
            <div>
              <h2 className="text-lg font-bold">
                {greeting}, <span className="text-accent">{userName}</span>!
              </h2>
              <p className="text-sm text-muted-foreground">Here's what's new for you today</p>
            </div>
          </div>
        </div>
      </div>
    </AnimatedSection>
  );
}

// Map section types to their default configurations
const defaultCarouselConfigs: Record<string, { sortBy: string; badge: string; badgeColor: string; bgColor: string; viewAllLink: string }> = {
  'trending': { 
    sortBy: 'trending', 
    badge: '🔥 Hot', 
    badgeColor: 'bg-destructive/90 text-destructive-foreground', 
    bgColor: 'bg-gradient-to-br from-destructive/[0.04] to-accent/[0.04] dark:from-destructive/[0.08] dark:to-accent/[0.08]',
    viewAllLink: '/shop?sort=trending'
  },
  'bestsellers': { 
    sortBy: 'popular', 
    badge: '🏆 Top', 
    badgeColor: 'bg-primary text-primary-foreground', 
    bgColor: 'bg-gradient-to-br from-primary/[0.04] to-info/[0.04] dark:from-primary/[0.08] dark:to-info/[0.08]',
    viewAllLink: '/shop?sort=popular'
  },
  'new-arrivals': { 
    sortBy: 'newest', 
    badge: '✨ New', 
    badgeColor: 'bg-success text-success-foreground', 
    bgColor: 'bg-gradient-to-br from-success/[0.04] to-accent/[0.04] dark:from-success/[0.08] dark:to-accent/[0.08]',
    viewAllLink: '/shop?sort=newest'
  },
  'featured': { 
    sortBy: 'newest', 
    badge: '⭐ Premium', 
    badgeColor: 'bg-accent text-accent-foreground', 
    bgColor: 'bg-gradient-to-br from-accent/[0.04] to-primary/[0.04] dark:from-accent/[0.08] dark:to-primary/[0.08]',
    viewAllLink: '/shop?filter=featured'
  },
};

// Section aliases for backward compatibility
const sectionAliases: Record<string, string> = {
  'trending-products': 'trending',
  'featured-products': 'featured',
  'recommended-products': 'recommended',
  'best-sellers': 'bestsellers',
  'spin-wheel': 'spinwheel',
  'customer-stories': 'stories',
  'delivery-reviews': 'reviews',
  'trust-badges': 'trust-badges',
  'quick-services': 'quick-services',
  'category-tabs': 'category-tabs',
  'hero-slider': 'hero',
};

// Map CMS section type -> feature_flags.feature_key. Admin can kill section via either.
const sectionFlagMap: Record<string, string> = {
  trending: 'trending_products',
  bestsellers: 'best_sellers',
  stories: 'customer_stories',
  categories: 'category_showcase',
  reviews: 'delivery_reviews',
  recommended: 'product_recommendations',
};

const EcommerceHome = lazy(() => import('@/components/templates/ecommerce/EcommerceHome'));
const FoodHome = lazy(() => import('@/components/templates/food/FoodHome'));

export default function Index() {
  const { user } = useAuth();
  const { template } = useSiteTemplate();
  const { data: promoStrip } = usePromoStripContent();
  const { data: cmsSections = [] } = useHomepageSections();
  const { isEnabled: flagEnabled } = useFeatures();

  if (template === 'ecommerce') {
    return (
      <Suspense fallback={<div className="min-h-screen bg-background" />}>
        <EcommerceHome />
      </Suspense>
    );
  }
  if (template === 'food') {
    return (
      <Suspense fallback={<div className="min-h-screen bg-background" />}>
        <FoodHome />
      </Suspense>
    );
  }



  const sections = useMemo(() => {
    return cmsSections.map(section => ({
      ...section,
      type: sectionAliases[section.type] || section.type
    }));
  }, [cmsSections]);

  const getSectionSettings = (type: string) => {
    const section = sections.find(s => s.type === type);
    return section?.settings || {};
  };

  const getSectionTitle = (type: string, defaultTitle: string) => {
    const section = sections.find(s => s.type === type);
    return section?.title || defaultTitle;
  };

  const isSectionActive = (type: string) => {
    // Admin feature flag is an additional kill-switch on top of CMS isActive
    const flagKey = sectionFlagMap[type];
    if (flagKey && !flagEnabled(flagKey)) return false;
    const section = sections.find(s => s.type === type);
    if (!section) return true;
    return section.isActive;
  };

  // First two carousel sections (trending, featured) load eagerly; deeper ones are deferred
  const eagerlySections = new Set(['trending', 'featured']);

  const renderCarouselSection = (type: string, defaultTitle: string, defaultSubtitle: string) => {
    if (!isSectionActive(type)) return null;

    const settings = getSectionSettings(type);
    const title = getSectionTitle(type, defaultTitle);
    const defaults = defaultCarouselConfigs[type] || defaultCarouselConfigs['trending'];
    
    const carousel = (
      <Suspense fallback={<SectionSkeleton />}>
        <ProductCarousel 
          title={settings.title || title} 
          subtitle={settings.subtitle || defaultSubtitle}
          bgColor={settings.bgColor || defaults.bgColor}
          badge={settings.badge || defaults.badge}
          badgeColor={settings.badgeColor || defaults.badgeColor}
          viewAllLink={settings.viewAllLink || defaults.viewAllLink}
          sortBy={settings.sortBy || defaults.sortBy as any}
          featured={type === 'featured' ? (settings.featured !== false) : undefined}
          limit={settings.limit || 10}
        />
      </Suspense>
    );

    return (
      <SectionErrorBoundary key={type} fallbackTitle={`Failed to load ${defaultTitle}`}>
        {eagerlySections.has(type) ? (
          <AnimatedSection>{carousel}</AnimatedSection>
        ) : (
          <DeferredSection><AnimatedSection>{carousel}</AnimatedSection></DeferredSection>
        )}
      </SectionErrorBoundary>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <SEOHead
        title="Premium Marketplace"
        description="India's premium multi-vendor marketplace. Discover curated collections from 500+ verified vendors. Quality products, secure payments, fast delivery."
        keywords="luxury marketplace, premium products, online shopping India, curated vendors"
        jsonLd={homepageJsonLd}
      />
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-background focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg">
        Skip to main content
      </a>
      <h1 className="sr-only">Odhra — India's Premium Multi-Vendor Marketplace</h1>

      {/* Welcome Popup */}
      <Suspense fallback={null}>
        <WelcomePopup delay={3000} discountCode="WELCOME15" discountPercentage={15} />
      </Suspense>

      {/* Flash Sale Banner */}
      <Suspense fallback={null}>
        <FlashSaleBanner />
      </Suspense>

      {/* 1. Promo Strip — URGENCY (first impression) */}
      {promoStrip && promoStrip.isActive && (
        <PromoStrip
          message={promoStrip.message}
          link={promoStrip.link}
          linkText={promoStrip.linkText}
          countdownTo={promoStrip.countdownTo}
        />
      )}

      {/* Navbar */}
      <Navbar />

      {/* 2. Quick Services — CONVENIENCE (build confidence) */}
      {isSectionActive('quick-services') && <QuickServices />}

      {/* 3. Category Tabs — NAVIGATION (orient the user) */}
      {isSectionActive('category-tabs') && <CategoryTabs />}

      {/* Main Content - Psychologically ordered */}
      <main id="main-content" role="main" className="space-y-2">
        {/* Personalized Greeting */}
        {user && (
          <PersonalizedGreeting userName={user.user_metadata?.full_name || user.email?.split('@')[0] || 'there'} />
        )}
        {/* 4. Hero Slider — ASPIRATION (emotional hook) */}
        {isSectionActive('hero') && (
          <div className="px-4 pt-4">
            <div className="max-w-7xl mx-auto">
              <HeroSlider />
            </div>
          </div>
        )}

        {/* 5. Deal Banners — SCARCITY (create urgency) */}
        <AnimatedSection>
          <Suspense fallback={<SectionSkeleton />}>
            <DealBannerSection />
          </Suspense>
        </AnimatedSection>

        {/* 6. Deals Carousel — SCARCITY (limited time offers) */}
        {isSectionActive('deals') && (
          <AnimatedSection>
            <Suspense fallback={<SectionSkeleton />}>
              <DealsCarousel 
                title="Today's Deals"
                subtitle="Limited time offers"
                limit={getSectionSettings('deals').limit || 10}
              />
            </Suspense>
          </AnimatedSection>
        )}

        {/* 7. Trending Products — SOCIAL PROOF (what everyone's buying) */}
        {renderCarouselSection('trending', 'Trending Now', "What everyone's buying")}

        {/* 8. Featured Products — AUTHORITY (expert-curated) */}
        {renderCarouselSection('featured', 'Featured Products', 'Handpicked for you')}

        {/* 9. Trust Badges — REASSURANCE (reduce anxiety after seeing products) */}
        {isSectionActive('trust-badges') && (
          <AnimatedSection>
            <Suspense fallback={<SectionSkeleton />}>
              <TrustBadges />
            </Suspense>
          </AnimatedSection>
        )}

        {/* 10. Previously Purchased — FAMILIARITY (returning users) */}
        {user && (
          <SectionErrorBoundary fallbackTitle="Failed to load previously purchased">
            <Suspense fallback={<SectionSkeleton />}>
              <AnimatedSection>
                <PreviouslyPurchased />
              </AnimatedSection>
            </Suspense>
          </SectionErrorBoundary>
        )}

        {/* 11. New Arrivals — NOVELTY (fresh content) */}
        {renderCarouselSection('new-arrivals', 'New Arrivals', 'Fresh from our vendors')}

        {/* 12. Best Sellers — CONSENSUS (validated by many) */}
        {renderCarouselSection('bestsellers', 'Best Sellers', 'Top rated by customers')}

        {/* 13. Spin Wheel — GAMIFICATION (delight & engagement) */}
        {isSectionActive('spinwheel') && (
          <SectionErrorBoundary fallbackTitle="Failed to load spin wheel">
            <Suspense fallback={<SectionSkeleton />}>
              <AnimatedSection>
                <ConditionalSpinWheel 
                  minOrderAmount={getSectionSettings('spinwheel').minOrderAmount || 1499} 
                  showForNewUsers={getSectionSettings('spinwheel').showForNewUsers !== false} 
                />
              </AnimatedSection>
            </Suspense>
          </SectionErrorBoundary>
        )}

        {/* 14. Category Showcase — EXPLORATION (browse by category) */}
        {isSectionActive('categories') && (
          <DeferredSection>
            <Suspense fallback={<SectionSkeleton />}>
              <AnimatedSection>
                <CategoryShowcase />
              </AnimatedSection>
            </Suspense>
          </DeferredSection>
        )}

        {/* 15. Recommended Products — PERSONALIZATION */}
        {isSectionActive('recommended') && (
          <DeferredSection>
            <Suspense fallback={<SectionSkeleton />}>
              <AnimatedSection>
                <RecommendedProducts />
              </AnimatedSection>
            </Suspense>
          </DeferredSection>
        )}

        {/* 15b. Trending now — DISCOVERY (social-proof) */}
        <DeferredSection>
          <Suspense fallback={<SectionSkeleton />}>
            <SectionErrorBoundary>
              <TrendingNowCarousel />
            </SectionErrorBoundary>
          </Suspense>
        </DeferredSection>

        {/* 16. Customer Stories — TRUST (social proof deep) */}
        {isSectionActive('stories') && (
          <DeferredSection>
            <Suspense fallback={<SectionSkeleton />}>
              <AnimatedSection>
                <CustomerStories />
              </AnimatedSection>
            </Suspense>
          </DeferredSection>
        )}

        {/* 17. Delivery Reviews — REASSURANCE (logistics trust) */}
        {isSectionActive('reviews') && (
          <DeferredSection>
            <Suspense fallback={<SectionSkeleton />}>
              <AnimatedSection>
                <DeliveryReviews />
              </AnimatedSection>
            </Suspense>
          </DeferredSection>
        )}

        {/* 18. Vendor CTA — GROWTH (post-trust conversion) */}
        {isSectionActive('vendor-cta') && <VendorCTA />}

        {/* Recently Viewed Widget */}
        <DeferredSection fallback={null}>
          <Suspense fallback={null}>
            <RecentlyViewedWidget />
          </Suspense>
        </DeferredSection>
      </main>

      <Suspense fallback={null}>
        <Footer />
      </Suspense>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}
