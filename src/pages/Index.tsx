import React, { Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { HeroSlider } from '@/components/home/HeroSlider';
import { TrustBadges } from '@/components/home/TrustBadges';
import { PromoStrip } from '@/components/home/PromoStrip';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useHomepageSections, usePromoStripContent } from '@/hooks/useHomepageCMS';
import { Sparkles, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load below-the-fold components to reduce main-thread work
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

// Loading fallback for lazy components
const SectionSkeleton = () => (
  <div className="py-16 px-4">
    <div className="max-w-7xl mx-auto">
      <Skeleton className="h-8 w-48 mb-8" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-64 rounded-lg" />
        ))}
      </div>
    </div>
  </div>
);

// Component map for dynamic rendering (canonical type keys)
const sectionComponents: Record<string, React.ComponentType<any>> = {
  hero: HeroSlider,
  'trust-badges': TrustBadges,
  trending: TrendingProducts,
  recommended: RecommendedProducts,
  categories: CategoryShowcase,
  featured: FeaturedProducts,
  stories: CustomerStories,
  reviews: DeliveryReviews,
};

// Backward-compatible CMS slug aliases -> canonical type keys used by the homepage
const CMS_SECTION_TYPE_ALIASES: Record<string, string> = {
  'hero-slider': 'hero',
  'trending-products': 'trending',
  'recommended-products': 'recommended',
  'featured-products': 'featured',
  'customer-stories': 'stories',
  'delivery-reviews': 'reviews',
  'spin-wheel': 'spinwheel',
  'promo-strip': 'promo-strip',
};

function normalizeSectionType(type: string) {
  return CMS_SECTION_TYPE_ALIASES[type] ?? type;
}

// Vendor CTA Section Component
function VendorCTA() {
  const { user } = useAuth();
  
  return (
    <section className="py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative glass rounded-3xl p-10 md:p-16 text-center overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-primary/5" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" />
                Join 500+ Successful Vendors
              </span>
            </motion.div>

            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4">
              Ready to Grow Your Business?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-8 text-lg">
              Join India's fastest-growing marketplace. Low commission rates, 
              powerful analytics, and millions of potential customers await.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="h-14 px-8 text-lg font-semibold gap-2 shadow-lg"
                asChild
              >
                <Link to={user ? "/become-vendor" : "/auth"}>
                  Start Selling Today
                  <ChevronRight className="w-5 h-5" />
                </Link>
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="h-14 px-8 text-lg font-semibold"
                asChild
              >
                <Link to="/about">Learn More About Odhra</Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// Previously Purchased with visibility check
function PreviouslyPurchasedSection() {
  return <PreviouslyPurchased />;
}

// Spin Wheel Section with settings
function SpinWheelSection({ settings }: { settings?: Record<string, any> }) {
  return (
    <ConditionalSpinWheel 
      minOrderAmount={settings?.minOrderAmount ?? 1499} 
      showForNewUsers={settings?.showForNewUsers ?? true} 
    />
  );
}

export default function Index() {
  const { user } = useAuth();
  const { data: cmsSections = [] } = useHomepageSections();
  const { data: promoStrip } = usePromoStripContent();

  // Default section order if CMS is empty or loading
  const defaultSections = [
    { type: 'hero', settings: {} },
    { type: 'trust-badges', settings: {} },
    { type: 'trending', settings: { limit: 8 } },
    { type: 'recommended', settings: { limit: 8 } },
    { type: 'previously-purchased', settings: {} },
    { type: 'categories', settings: { limit: 5 } },
    { type: 'spinwheel', settings: { showForNewUsers: true, minOrderAmount: 1499 } },
    { type: 'featured', settings: { limit: 8 } },
    { type: 'stories', settings: { limit: 6 } },
    { type: 'reviews', settings: { limit: 4 } },
    { type: 'vendor-cta', settings: {} },
  ];

  // Normalize CMS section types (the CMS currently stores slugs like "recommended-products")
  const normalizedCmsSections = cmsSections.map((s) => ({
    ...s,
    type: normalizeSectionType(s.type),
  }));

  // Ensure system sections don't disappear when CMS data exists
  // (e.g. "previously-purchased" isn't stored in cms_content but is a core homepage feature)
  const cmsHasPreviouslyPurchased = normalizedCmsSections.some((s) => s.type === 'previously-purchased');
  const normalizedCmsWithSystem = cmsHasPreviouslyPurchased
    ? normalizedCmsSections
    : (() => {
        const insert = { id: 'system-previously-purchased', type: 'previously-purchased', settings: {} };
        const idx = normalizedCmsSections.findIndex((s) => s.type === 'recommended');
        const copy = [...normalizedCmsSections];
        copy.splice(idx >= 0 ? idx + 1 : 0, 0, insert as any);
        return copy;
      })();

  // Use CMS sections if available, otherwise use defaults
  const sectionsToRender = normalizedCmsWithSystem.length > 0
    ? normalizedCmsWithSystem
    : (defaultSections.map((s, i) => ({
        ...s,
        id: `default-${i}`,
        isActive: true,
        order: i,
        title: s.type,
      })) as Array<{ id: string; type: string; settings: Record<string, any>; isActive: boolean; order: number; title: string }>);

  const renderSection = (section: { type: string; settings?: Record<string, any> }) => {
    const rawType = section.type;
    const type = normalizeSectionType(rawType);
    const settings = section.settings ?? {};

    // Special handling for sections that need auth or custom logic
    if (type === 'previously-purchased') {
      return (
        <Suspense fallback={<SectionSkeleton />}>
          <PreviouslyPurchasedSection />
        </Suspense>
      );
    }

    if (type === 'spinwheel') {
      return (
        <Suspense fallback={<SectionSkeleton />}>
          <SpinWheelSection settings={settings} />
        </Suspense>
      );
    }

    if (type === 'vendor-cta') {
      return <VendorCTA />;
    }

    // Promo strip is rendered separately at the top
    if (type === 'promo-strip') {
      return null;
    }

    // Dynamic component rendering for standard sections
    const Component = sectionComponents[type];
    if (Component) {
      return (
        <Suspense fallback={<SectionSkeleton />}>
          <Component {...settings} />
        </Suspense>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      {/* Welcome Popup for new visitors */}
      <Suspense fallback={null}>
        <WelcomePopup delay={3000} discountCode="WELCOME15" discountPercentage={15} />
      </Suspense>

      {/* Flash Sale Banner - Fixed at top, above everything */}
      <Suspense fallback={null}>
        <FlashSaleBanner />
      </Suspense>

      {/* CMS Promo Strip - Between FlashSale and Navbar */}
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

      {/* Dynamic Sections from CMS */}
      {sectionsToRender.map((section) => (
        <React.Fragment key={section.id || section.type}>
          {renderSection(section)}
        </React.Fragment>
      ))}

      {/* Recently Viewed Widget */}
      <Suspense fallback={null}>
        <RecentlyViewedWidget />
      </Suspense>

      {/* Footer */}
      <footer className="border-t border-border py-16 px-4 bg-secondary/20">
        <div className="max-w-7xl mx-auto">
          <h2 className="sr-only">Footer</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-6 h-6 text-accent" />
                <span className="text-xl font-bold">Odhra</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                India's premium multi-vendor marketplace. Discover extraordinary products from verified sellers.
              </p>
            </div>
            <nav aria-label="Shop navigation">
              <h3 className="font-semibold mb-4">Shop</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/shop" className="hover:text-foreground transition-colors inline-block min-h-[44px] flex items-center">Browse All Products</Link></li>
                <li><Link to="/shop?filter=new" className="hover:text-foreground transition-colors inline-block min-h-[44px] flex items-center">Shop New Arrivals</Link></li>
                <li><Link to="/shop?filter=featured" className="hover:text-foreground transition-colors inline-block min-h-[44px] flex items-center">View Featured Items</Link></li>
                <li><Link to="/vendors" className="hover:text-foreground transition-colors inline-block min-h-[44px] flex items-center">Explore Our Vendors</Link></li>
              </ul>
            </nav>
            <nav aria-label="Support navigation">
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/faq" className="hover:text-foreground transition-colors inline-block min-h-[44px] flex items-center">Frequently Asked Questions</Link></li>
                <li><Link to="/contact" className="hover:text-foreground transition-colors inline-block min-h-[44px] flex items-center">Contact Our Team</Link></li>
                <li><Link to="/about" className="hover:text-foreground transition-colors inline-block min-h-[44px] flex items-center">Learn About Us</Link></li>
                <li><Link to="/spin-to-win" className="hover:text-foreground transition-colors inline-block min-h-[44px] flex items-center">Play Spin and Win</Link></li>
              </ul>
            </nav>
            <nav aria-label="Legal navigation">
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/privacy" className="hover:text-foreground transition-colors inline-block min-h-[44px] flex items-center">Read Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-foreground transition-colors inline-block min-h-[44px] flex items-center">View Terms of Service</Link></li>
                <li><Link to="/support" className="hover:text-foreground transition-colors inline-block min-h-[44px] flex items-center">Visit Support Center</Link></li>
              </ul>
            </nav>
          </div>
          <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Odhra. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <span>Made with ❤️ in India</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Bottom Navigation for Mobile */}
      <BottomNavigation />
    </div>
  );
}
