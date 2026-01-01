import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { HeroSlider } from '@/components/home/HeroSlider';
import { TrustBadges } from '@/components/home/TrustBadges';
import { TrendingProducts } from '@/components/home/TrendingProducts';
import { RecommendedProducts } from '@/components/home/RecommendedProducts';
import { PreviouslyPurchased } from '@/components/home/PreviouslyPurchased';
import { CategoryShowcase } from '@/components/home/CategoryShowcase';
import { ConditionalSpinWheel } from '@/components/home/ConditionalSpinWheel';
import { FeaturedProducts } from '@/components/home/FeaturedProducts';
import { CustomerStories } from '@/components/home/CustomerStories';
import { DeliveryReviews } from '@/components/home/DeliveryReviews';
import { FlashSaleBanner } from '@/components/marketing/FlashSaleBanner';
import { WelcomePopup } from '@/components/marketing/WelcomePopup';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Sparkles, ChevronRight } from 'lucide-react';

export default function Index() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Welcome Popup for new visitors */}
      <WelcomePopup delay={3000} discountCode="WELCOME15" discountPercentage={15} />

      {/* Flash Sale Banner - Top of page */}
      <FlashSaleBanner />

      <Navbar />

      {/* 1. Hero Slider - First impression */}
      <HeroSlider />

      {/* 2. Trust Badges - Build confidence */}
      <TrustBadges />

      {/* 3. Trending Products - Social proof & urgency */}
      <TrendingProducts />

      {/* 4. Recommended Products - Personalization */}
      <RecommendedProducts />

      {/* 5. Previously Purchased - Repurchase convenience (logged in users only) */}
      <PreviouslyPurchased />

      {/* 6. Categories - Easy navigation */}
      <CategoryShowcase />

      {/* 7. Conditional Spin Wheel - Gamification (new users & orders above ₹1499) */}
      <ConditionalSpinWheel minOrderAmount={1499} showForNewUsers={true} />

      {/* 8. Featured Products - Curated selection */}
      <FeaturedProducts />

      {/* 9. Customer Stories - Social proof & trust */}
      <CustomerStories />

      {/* 10. Delivery Reviews - Logistics trust */}
      <DeliveryReviews />

      {/* 11. Vendor CTA */}
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

              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
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
                  <Link to={user ? "/vendor/onboarding" : "/auth"}>
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
                  <Link to="/vendor-info">Learn More</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-16 px-4 bg-secondary/20">
        <div className="max-w-7xl mx-auto">
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
            <div>
              <h4 className="font-semibold mb-4">Shop</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/shop" className="hover:text-foreground transition-colors">All Products</Link></li>
                <li><Link to="/shop?filter=new" className="hover:text-foreground transition-colors">New Arrivals</Link></li>
                <li><Link to="/shop?filter=featured" className="hover:text-foreground transition-colors">Featured</Link></li>
                <li><Link to="/vendors" className="hover:text-foreground transition-colors">Our Vendors</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/faq" className="hover:text-foreground transition-colors">FAQ</Link></li>
                <li><Link to="/contact" className="hover:text-foreground transition-colors">Contact Us</Link></li>
                <li><Link to="/about" className="hover:text-foreground transition-colors">About Us</Link></li>
                <li><Link to="/spin-to-win" className="hover:text-foreground transition-colors">Spin & Win</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
                <li><Link to="/refund" className="hover:text-foreground transition-colors">Refund Policy</Link></li>
              </ul>
            </div>
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
    </div>
  );
}
