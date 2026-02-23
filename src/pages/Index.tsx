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
import { Sparkles, ChevronRight, Shield, Truck, Award } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { SEOHead, organizationJsonLd } from '@/components/SEOHead';
import { SectionErrorBoundary } from '@/components/ui/SectionErrorBoundary';

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

// Scroll-triggered section wrapper
function AnimatedSection({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
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
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/15 text-accent text-sm font-semibold mb-5 backdrop-blur-sm border border-accent/20"
              >
                <Sparkles className="w-4 h-4" />
                Join 500+ Verified Vendors
              </motion.span>

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
                  className="border-white/30 text-white hover:bg-white/10 font-semibold"
                  asChild
                >
                  <Link to="/about">Learn More</Link>
                </Button>
              </div>

              {/* Trust row */}
              <div className="flex items-center justify-center gap-6 mt-8 text-primary-foreground/50 text-xs">
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
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 py-3"
          >
            <div className="text-2xl">👋</div>
            <div>
              <h2 className="text-lg font-bold">
                {greeting}, <span className="text-accent">{userName}</span>!
              </h2>
              <p className="text-sm text-muted-foreground">Here's what's new for you today</p>
            </div>
          </motion.div>
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

export default function Index() {
  const { user } = useAuth();
  const { data: promoStrip } = usePromoStripContent();
  const { data: cmsSections = [] } = useHomepageSections();

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
    const section = sections.find(s => s.type === type);
    if (!section) return true;
    return section.isActive;
  };

  const renderCarouselSection = (type: string, defaultTitle: string, defaultSubtitle: string) => {
    if (!isSectionActive(type)) return null;

    const settings = getSectionSettings(type);
    const title = getSectionTitle(type, defaultTitle);
    const defaults = defaultCarouselConfigs[type] || defaultCarouselConfigs['trending'];
    
    return (
      <SectionErrorBoundary key={type} fallbackTitle={`Failed to load ${defaultTitle}`}>
        <AnimatedSection>
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
        </AnimatedSection>
      </SectionErrorBoundary>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <SEOHead
        title="Premium Marketplace"
        description="India's premium multi-vendor marketplace. Discover curated collections from 500+ verified vendors. Quality products, secure payments, fast delivery."
        keywords="luxury marketplace, premium products, online shopping India, curated vendors"
        jsonLd={organizationJsonLd}
      />
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
            <HeroSlider />
          </div>
        )}

        {/* 5. Deal Banners — SCARCITY (create urgency) */}
        <AnimatedSection>
          <DealBannerSection />
        </AnimatedSection>

        {/* 6. Deals Carousel — SCARCITY (limited time offers) */}
        {isSectionActive('deals') && (
          <AnimatedSection>
            <DealsCarousel 
              title="Today's Deals"
              subtitle="Limited time offers"
              limit={getSectionSettings('deals').limit || 10}
            />
          </AnimatedSection>
        )}

        {/* 7. Trending Products — SOCIAL PROOF (what everyone's buying) */}
        {renderCarouselSection('trending', 'Trending Now', "What everyone's buying")}

        {/* 8. Featured Products — AUTHORITY (expert-curated) */}
        {renderCarouselSection('featured', 'Featured Products', 'Handpicked for you')}

        {/* 9. Trust Badges — REASSURANCE (reduce anxiety after seeing products) */}
        {isSectionActive('trust-badges') && (
          <AnimatedSection>
            <TrustBadges />
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
          <Suspense fallback={<SectionSkeleton />}>
            <AnimatedSection>
              <CategoryShowcase />
            </AnimatedSection>
          </Suspense>
        )}

        {/* 15. Recommended Products — PERSONALIZATION */}
        {isSectionActive('recommended') && (
          <Suspense fallback={<SectionSkeleton />}>
            <AnimatedSection>
              <RecommendedProducts />
            </AnimatedSection>
          </Suspense>
        )}

        {/* 16. Customer Stories — TRUST (social proof deep) */}
        {isSectionActive('stories') && (
          <Suspense fallback={<SectionSkeleton />}>
            <AnimatedSection>
              <CustomerStories />
            </AnimatedSection>
          </Suspense>
        )}

        {/* 17. Delivery Reviews — REASSURANCE (logistics trust) */}
        {isSectionActive('reviews') && (
          <Suspense fallback={<SectionSkeleton />}>
            <AnimatedSection>
              <DeliveryReviews />
            </AnimatedSection>
          </Suspense>
        )}

        {/* 18. Vendor CTA — GROWTH (post-trust conversion) */}
        {isSectionActive('vendor-cta') && <VendorCTA />}

        {/* Recently Viewed Widget */}
        <Suspense fallback={null}>
          <RecentlyViewedWidget />
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-14 px-4 bg-primary/[0.02]" role="contentinfo">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
            {/* Brand */}
            <div className="col-span-2 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="text-lg font-display font-bold tracking-tight">Odhra</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                India's premium multi-vendor marketplace. Curated quality, trusted sellers, and seamless shopping.
              </p>
              {/* Newsletter */}
              <div className="flex gap-2 max-w-sm">
                <input
                  type="email"
                  placeholder="Enter your email"
                  aria-label="Email for newsletter"
                  className="flex-1 h-9 px-3 rounded-lg border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
                <Button size="sm" className="h-9 px-4 text-xs font-semibold">Subscribe</Button>
              </div>
              <p className="text-[10px] text-muted-foreground/60 mt-2">Get exclusive deals & new arrivals. No spam, ever.</p>
            </div>
            <nav>
              <h3 className="font-display font-semibold mb-4 text-sm tracking-wide uppercase text-foreground/70">Shop</h3>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><Link to="/shop" className="hover:text-accent transition-colors">All Products</Link></li>
                <li><Link to="/shop?filter=new" className="hover:text-accent transition-colors">New Arrivals</Link></li>
                <li><Link to="/shop?filter=featured" className="hover:text-accent transition-colors">Featured</Link></li>
                <li><Link to="/flash-sales" className="hover:text-accent transition-colors">Flash Sales</Link></li>
              </ul>
            </nav>
            <nav>
              <h3 className="font-display font-semibold mb-4 text-sm tracking-wide uppercase text-foreground/70">Support</h3>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><Link to="/faq" className="hover:text-accent transition-colors">FAQ</Link></li>
                <li><Link to="/contact" className="hover:text-accent transition-colors">Contact</Link></li>
                <li><Link to="/about" className="hover:text-accent transition-colors">About Us</Link></li>
                <li><Link to="/support" className="hover:text-accent transition-colors">Help Center</Link></li>
              </ul>
            </nav>
            <nav>
              <h3 className="font-display font-semibold mb-4 text-sm tracking-wide uppercase text-foreground/70">Legal</h3>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><Link to="/privacy" className="hover:text-accent transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-accent transition-colors">Terms of Service</Link></li>
                <li><Link to="/become-vendor" className="hover:text-accent transition-colors">Sell on Odhra</Link></li>
              </ul>
            </nav>
          </div>
          {/* Payment & Trust */}
          <div className="py-6 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-muted-foreground/50 text-xs">
              <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Secure Payments</span>
              <span className="flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" /> Fast Delivery</span>
              <span className="flex items-center gap-1.5"><Award className="w-3.5 h-3.5" /> Quality Assured</span>
            </div>
            <p className="text-xs text-muted-foreground/60 tracking-wide">
              © {new Date().getFullYear()} Odhra. Crafted with precision in India.
            </p>
          </div>
        </div>
      </footer>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}
