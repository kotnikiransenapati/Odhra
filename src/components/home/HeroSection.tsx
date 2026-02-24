import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Play, ShieldCheck, Truck, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

// Psychology: Live activity indicator — pure CSS
function LiveActivityIndicator() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const base = 127 + Math.floor(Math.random() * 50);
    setCount(base);
    const interval = setInterval(() => {
      setCount(c => c + (Math.random() > 0.5 ? 1 : 0));
    }, 5000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/20 text-success text-sm font-medium animate-fade-in">
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success"></span>
      </span>
      {count} people shopping now
    </div>
  );
}

export function HeroSection() {
  const { user, isVendor, isAdmin } = useAuth();

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Background — pure CSS, no JS animations */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-secondary/30" />
        
        {/* CSS-animated orbs instead of framer-motion */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] animate-float-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] animate-float-slow-reverse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[150px] animate-pulse-slow" />

        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 text-center">
        {/* Live activity */}
        <div className="mb-6 animate-fade-in">
          <LiveActivityIndicator />
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent/10 border border-accent/20 backdrop-blur-sm mb-8 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <Sparkles className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium text-accent">India's Premium Multi-Vendor Marketplace</span>
        </div>

        {/* Main Heading */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
          <span className="block">Discover</span>
          <span className="block" style={{ color: 'hsl(var(--accent))' }}>Extraordinary</span>
        </h1>

        {/* Subheading */}
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-6 leading-relaxed animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          Curated collections from 500+ verified vendors. 
          From artisanal fashion to cutting-edge tech — find what inspires you.
        </p>

        {/* Trust indicators */}
        <div className="flex flex-wrap justify-center gap-4 mb-10 animate-fade-in-up" style={{ animationDelay: '250ms' }}>
          <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-success" />
            Verified Vendors
          </Badge>
          <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs">
            <Truck className="w-3.5 h-3.5 text-accent" />
            Free Shipping ₹999+
          </Badge>
          <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs">
            <Award className="w-3.5 h-3.5 text-warning" />
            Money-Back Guarantee
          </Badge>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <Button 
            size="lg" 
            className="h-14 px-8 text-lg font-semibold btn-press gap-2 shadow-lg hover:shadow-xl transition-shadow"
            asChild
          >
            <Link to="/shop">
              Explore Collection
              <ArrowRight className="w-5 h-5" />
            </Link>
          </Button>
          
          {!user && (
            <Button 
              size="lg" 
              variant="outline" 
              className="h-14 px-8 text-lg font-semibold btn-press gap-2"
              asChild
            >
              <Link to="/auth">
                <Play className="w-5 h-5" />
                Watch Story
              </Link>
            </Button>
          )}
          
          {user && !isVendor && !isAdmin && (
            <Button 
              size="lg" 
              variant="outline" 
              className="h-14 px-8 text-lg font-semibold btn-press"
              asChild
            >
              <Link to="/vendor/onboarding">Become a Seller</Link>
            </Button>
          )}
        </div>

        {/* Stats Row */}
        <div className="flex flex-wrap justify-center gap-8 md:gap-16 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
          {[
            { value: '10K+', label: 'Products' },
            { value: '500+', label: 'Vendors' },
            { value: '50K+', label: 'Happy Customers' },
            { value: '4.9', label: 'Average Rating' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-accent">{stat.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll Indicator — pure CSS */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-fade-in" style={{ animationDelay: '1.5s' }}>
        <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-1.5">
          <div className="w-1.5 h-2.5 bg-accent rounded-full animate-scroll-dot" />
        </div>
      </div>
    </section>
  );
}
