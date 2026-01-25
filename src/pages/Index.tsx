import React, { Suspense, lazy, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { HeroSlider } from '@/components/home/HeroSlider';
import { TrustBadges } from '@/components/home/TrustBadges';
import { PromoStrip } from '@/components/home/PromoStrip';
import { QuickServices } from '@/components/home/QuickServices';
import { CategoryTabs } from '@/components/home/CategoryTabs';
import { DealBannerSection } from '@/components/home/DealBanner';
import { ProductCarousel } from '@/components/home/ProductCarousel';
import { DealsCarousel } from '@/components/home/DealsCarousel';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useHomepageSections, usePromoStripContent } from '@/hooks/useHomepageCMS';
import { Sparkles, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load below-the-fold components
const TrendingProducts = lazy(() => import('@/components/home/TrendingProducts').then(m => ({ default: m.TrendingProducts })));
const RecommendedProducts = lazy(() => import('@/components/home/RecommendedProducts').then(m => ({ default: m.RecommendedProducts })));
const PreviouslyPurchased = lazy(() => import('@/components/home/PreviouslyPurchased').then(m => ({ default: m.PreviouslyPurchased })));
const CategoryShowcase = lazy(() => import('@/components/home/CategoryShowcase').then(m => ({ default: m.CategoryShowcase })));
const ConditionalSpinWheel = lazy(() => import('@/components/home/ConditionalSpinWheel').then(m => ({ default: m.ConditionalSpinWheel })));
const FeaturedProducts = lazy(() => import('@/components/home/FeaturedProducts').then(m => ({ default: m.FeaturedProducts })));
const CustomerStories = lazy(() => import('@/components/home/CustomerStories').then(m => ({ default: m.CustomerStories })));
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

// Vendor CTA Section
function VendorCTA() {
  const { user } = useAuth();
  
  return (
    <section className="py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative glass rounded-2xl p-6 md:p-10 text-center overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-primary/5" />
          <div className="absolute top-0 right-0 w-48 h-48 bg-accent/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

          <div className="relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
                <Sparkles className="w-4 h-4" />
                Join 500+ Vendors
              </span>
            </motion.div>

            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold mb-3">
              Start Selling Today
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-6 text-sm md:text-base">
              Join India's fastest-growing marketplace with low commission rates and powerful analytics.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                size="lg" 
                className="font-semibold gap-2"
                asChild
              >
                <Link to={user ? "/become-vendor" : "/auth"}>
                  Start Selling
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="font-semibold"
                asChild
              >
                <Link to="/about">About Odhra</Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// Map section types to their default configurations
const defaultCarouselConfigs: Record<string, { sortBy: string; badge: string; badgeColor: string; bgColor: string; viewAllLink: string }> = {
  'trending': { 
    sortBy: 'trending', 
    badge: '🔥 Hot', 
    badgeColor: 'bg-orange-500 text-white', 
    bgColor: 'bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20',
    viewAllLink: '/shop?sort=trending'
  },
  'bestsellers': { 
    sortBy: 'popular', 
    badge: '🏆 Top', 
    badgeColor: 'bg-blue-500 text-white', 
    bgColor: 'bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20',
    viewAllLink: '/shop?sort=popular'
  },
  'new-arrivals': { 
    sortBy: 'newest', 
    badge: '✨ New', 
    badgeColor: 'bg-emerald-500 text-white', 
    bgColor: 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20',
    viewAllLink: '/shop?sort=newest'
  },
  'featured': { 
    sortBy: 'newest', 
    badge: '⭐ Premium', 
    badgeColor: 'bg-purple-500 text-white', 
    bgColor: 'bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20',
    viewAllLink: '/shop?filter=featured'
  },
};

// Section aliases for backward compatibility
const sectionAliases: Record<string, string> = {
  'trending-products': 'trending',
  'featured-products': 'featured',
  'recommended-products': 'recommended',
  'best-sellers': 'bestsellers',
};

export default function Index() {
  const { user } = useAuth();
  const { data: promoStrip } = usePromoStripContent();
  const { data: cmsSections = [] } = useHomepageSections();

  // Normalize section types
  const sections = useMemo(() => {
    return cmsSections.map(section => ({
      ...section,
      type: sectionAliases[section.type] || section.type
    }));
  }, [cmsSections]);

  // Helper to get section settings
  const getSectionSettings = (type: string) => {
    const section = sections.find(s => s.type === type);
    return section?.settings || {};
  };

  // Helper to get section title from CMS
  const getSectionTitle = (type: string, defaultTitle: string) => {
    const section = sections.find(s => s.type === type);
    return section?.title || defaultTitle;
  };

  // Helper to check if section is active
  const isSectionActive = (type: string) => {
    // Find section in CMS - check both the type and aliases
    const section = sections.find(s => s.type === type);
    // If section is not configured in CMS, show by default
    // Only hide if explicitly set to inactive in CMS
    if (!section) return true;
    return section.isActive;
  };

  // Render a product carousel section based on CMS settings
  const renderCarouselSection = (type: string, defaultTitle: string, defaultSubtitle: string) => {
    if (!isSectionActive(type)) return null;

    const settings = getSectionSettings(type);
    const title = getSectionTitle(type, defaultTitle);
    const defaults = defaultCarouselConfigs[type] || defaultCarouselConfigs['trending'];
    
    return (
      <ProductCarousel 
        key={type}
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
    );
  };

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-background focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg">
        Skip to main content
      </a>

      {/* Welcome Popup */}
      <Suspense fallback={null}>
        <WelcomePopup delay={3000} discountCode="WELCOME15" discountPercentage={15} />
      </Suspense>

      {/* Flash Sale Banner */}
      <Suspense fallback={null}>
        <FlashSaleBanner />
      </Suspense>

      {/* Promo Strip */}
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

      {/* Quick Services - Flipkart style icons */}
      {isSectionActive('quick-services') && <QuickServices />}

      {/* Category Tabs - Horizontal scrollable */}
      {isSectionActive('category-tabs') && <CategoryTabs />}

      {/* Main Content */}
      <main id="main-content" role="main">
        {/* Hero Slider */}
        {isSectionActive('hero') && (
          <div className="px-4 pt-4">
            <HeroSlider />
          </div>
        )}

        {/* Deal Banners */}
        <DealBannerSection />

        {/* Trust Badges - Compact version */}
        {isSectionActive('trust-badges') && <TrustBadges />}

      {/* Trust Badges - Compact version */}
      {isSectionActive('trust-badges') && <TrustBadges />}

      {/* Deals Carousel - Auto-shows discounted products */}
      {isSectionActive('deals') && (
        <DealsCarousel 
          title="Today's Deals"
          subtitle="Limited time offers"
          limit={getSectionSettings('deals').limit || 10}
        />
      )}

      {/* Trending Products Carousel - Based on view count */}
      {renderCarouselSection('trending', 'Trending Now', "What everyone's buying")}

      {/* Previously Purchased */}
      {user && (
        <Suspense fallback={<SectionSkeleton />}>
          <PreviouslyPurchased />
        </Suspense>
      )}

      {/* Featured Products Carousel - Admin controlled via is_featured flag */}
      {renderCarouselSection('featured', 'Featured Products', 'Handpicked for you')}

      {/* Best Sellers - Based on sold_count */}
      {renderCarouselSection('bestsellers', 'Best Sellers', 'Top rated by customers')}

      {/* New Arrivals - Based on created_at */}
      {renderCarouselSection('new-arrivals', 'New Arrivals', 'Fresh from our vendors')}

      {/* Spin Wheel Section */}
      {isSectionActive('spinwheel') && (
        <Suspense fallback={<SectionSkeleton />}>
          <ConditionalSpinWheel 
            minOrderAmount={getSectionSettings('spinwheel').minOrderAmount || 1499} 
            showForNewUsers={getSectionSettings('spinwheel').showForNewUsers !== false} 
          />
        </Suspense>
      )}

      {/* Category Showcase - Full grid version */}
      {isSectionActive('categories') && (
        <Suspense fallback={<SectionSkeleton />}>
          <CategoryShowcase />
        </Suspense>
      )}

      {/* Recommended Products */}
      {isSectionActive('recommended') && (
        <Suspense fallback={<SectionSkeleton />}>
          <RecommendedProducts />
        </Suspense>
      )}

      {/* Customer Stories */}
      {isSectionActive('stories') && (
        <Suspense fallback={<SectionSkeleton />}>
          <CustomerStories />
        </Suspense>
      )}

      {/* Delivery Reviews */}
      {isSectionActive('reviews') && (
        <Suspense fallback={<SectionSkeleton />}>
          <DeliveryReviews />
        </Suspense>
      )}

      {/* Vendor CTA */}
      {isSectionActive('vendor-cta') && <VendorCTA />}

        {/* Recently Viewed Widget */}
        <Suspense fallback={null}>
          <RecentlyViewedWidget />
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-4 bg-secondary/20" role="contentinfo">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-accent" />
                <span className="text-lg font-bold">Odhra</span>
              </div>
              <p className="text-sm text-muted-foreground">
                India's premium multi-vendor marketplace.
              </p>
            </div>
            <nav>
              <h3 className="font-semibold mb-3 text-sm">Shop</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/shop" className="hover:text-foreground transition-colors">All Products</Link></li>
                <li><Link to="/shop?filter=new" className="hover:text-foreground transition-colors">New Arrivals</Link></li>
                <li><Link to="/shop?filter=featured" className="hover:text-foreground transition-colors">Featured</Link></li>
              </ul>
            </nav>
            <nav>
              <h3 className="font-semibold mb-3 text-sm">Support</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/faq" className="hover:text-foreground transition-colors">FAQ</Link></li>
                <li><Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
                <li><Link to="/about" className="hover:text-foreground transition-colors">About Us</Link></li>
              </ul>
            </nav>
            <nav>
              <h3 className="font-semibold mb-3 text-sm">Legal</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link></li>
                <li><Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link></li>
              </ul>
            </nav>
          </div>
          <div className="pt-6 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Odhra. Made with ❤️ in India
            </p>
          </div>
        </div>
      </footer>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}
