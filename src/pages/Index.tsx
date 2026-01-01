import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Sparkles, 
  ArrowRight, 
  Store, 
  Shield, 
  Truck,
  Star,
  ChevronRight
} from 'lucide-react';

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.1 } }
};

export default function Index() {
  const { user, isAdmin, isVendor } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
        </div>

        <div className="max-w-6xl mx-auto text-center">
          <motion.div {...fadeInUp} className="mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              Premium Multi-Vendor Marketplace
            </span>
          </motion.div>

          <motion.h1 
            {...fadeInUp}
            transition={{ delay: 0.1 }}
            className="text-display-xl md:text-display-2xl font-bold tracking-tight mb-6"
          >
            Discover Luxury,<br />
            <span className="text-accent">Curated for You</span>
          </motion.h1>

          <motion.p 
            {...fadeInUp}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
          >
            Shop from 500+ verified vendors offering premium products. 
            From fashion to tech, find everything at Odhra.
          </motion.p>

          <motion.div 
            {...fadeInUp}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button size="lg" className="h-14 px-8 text-lg font-semibold btn-press gap-2">
              Start Shopping <ArrowRight className="w-5 h-5" />
            </Button>
            {!user && (
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg font-semibold btn-press" asChild>
                <Link to="/auth">Become a Seller</Link>
              </Button>
            )}
            {user && !isVendor && !isAdmin && (
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg font-semibold btn-press" asChild>
                <Link to="/become-vendor">Become a Seller</Link>
              </Button>
            )}
            {isVendor && !isAdmin && (
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg font-semibold btn-press" asChild>
                <Link to="/vendor">Vendor Dashboard</Link>
              </Button>
            )}
            {isAdmin && (
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg font-semibold btn-press" asChild>
                <Link to="/admin">Admin Dashboard</Link>
              </Button>
            )}
          </motion.div>

          {/* Stats */}
          <motion.div 
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20 max-w-3xl mx-auto"
          >
            {[
              { label: 'Products', value: '10K+' },
              { label: 'Vendors', value: '500+' },
              { label: 'Customers', value: '50K+' },
              { label: 'Reviews', value: '25K+' },
            ].map((stat) => (
              <motion.div 
                key={stat.label}
                variants={fadeInUp}
                className="text-center"
              >
                <p className="text-3xl md:text-4xl font-bold text-accent">{stat.value}</p>
                <p className="text-muted-foreground text-sm mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-secondary/30">
        <div className="max-w-6xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-display-sm md:text-display-md font-bold mb-4">Why Choose Odhra?</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              We bring you the best shopping experience with premium features
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Store, title: 'Verified Vendors', desc: '500+ trusted sellers with quality products' },
              { icon: Shield, title: 'Secure Payments', desc: 'Multiple payment options with escrow protection' },
              { icon: Truck, title: 'Fast Delivery', desc: 'Quick shipping with real-time tracking' },
              { icon: Star, title: 'Quality Assured', desc: 'Every product goes through quality checks' },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass p-6 rounded-2xl hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-accent" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative glass rounded-3xl p-10 md:p-16 text-center overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent" />
            <div className="relative z-10">
              <h2 className="text-display-xs md:text-display-sm font-bold mb-4">
                Ready to Start Selling?
              </h2>
              <p className="text-muted-foreground max-w-lg mx-auto mb-8">
                Join 500+ vendors and reach thousands of customers. 
                Low commission rates and powerful tools to grow your business.
              </p>
              <Button size="lg" className="h-14 px-8 text-lg font-semibold btn-press gap-2" asChild>
                <Link to={user ? "/become-vendor" : "/auth"}>
                  Apply as Vendor <ChevronRight className="w-5 h-5" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-accent" />
              <span className="text-xl font-bold">Odhra</span>
            </div>
            <div className="flex gap-8 text-sm text-muted-foreground">
              <Link to="/about" className="hover:text-foreground transition-colors">About</Link>
              <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
              <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 Odhra. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
