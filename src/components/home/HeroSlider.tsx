import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Sparkles, ArrowRight, Star, ShoppingBag, Verified } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

interface Slide {
  id: string;
  title: string;
  highlight: string;
  subtitle: string;
  description: string;
  ctaText: string;
  ctaLink: string;
  accentColor: string;
}

const slides: Slide[] = [
  {
    id: '1',
    title: 'Discover',
    highlight: 'Extraordinary',
    subtitle: 'India\'s Premium Marketplace',
    description: 'Curated collections from 500+ verified vendors. From artisanal fashion to cutting-edge tech.',
    ctaText: 'Start Shopping',
    ctaLink: '/shop',
    accentColor: 'from-amber-500/30 via-orange-400/20',
  },
  {
    id: '2',
    title: 'New Season',
    highlight: 'Collection',
    subtitle: 'Up to 50% OFF Fashion',
    description: 'Refresh your wardrobe with the latest trends. Limited time offers on premium brands.',
    ctaText: 'Shop Fashion',
    ctaLink: '/shop?category=fashion',
    accentColor: 'from-rose-500/30 via-pink-400/20',
  },
  {
    id: '3',
    title: 'Tech',
    highlight: 'Deals',
    subtitle: 'Electronics Sale Live',
    description: 'Latest gadgets at unbeatable prices. Free shipping on orders above ₹999.',
    ctaText: 'View Deals',
    ctaLink: '/shop?category=electronics',
    accentColor: 'from-blue-500/30 via-cyan-400/20',
  },
];

const stats = [
  { value: '10K+', label: 'Products', icon: ShoppingBag },
  { value: '500+', label: 'Verified Vendors', icon: Verified },
  { value: '50K+', label: 'Happy Customers', icon: Star },
  { value: '4.9★', label: 'Average Rating', icon: Star },
];

export function HeroSlider() {
  const { user, isVendor, isAdmin } = useAuth();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  }, []);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(nextSlide, 6000);
    return () => clearInterval(interval);
  }, [isAutoPlaying, nextSlide]);

  const slide = slides[currentSlide];

  return (
    <section 
      className="relative min-h-[92vh] flex items-center justify-center overflow-hidden"
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
    >
      {/* Animated Background */}
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0 -z-10"
        >
          {/* Base gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-secondary/50" />
          
          {/* Dynamic color accent */}
          <motion.div
            className={`absolute top-0 right-0 w-[60%] h-[70%] bg-gradient-to-bl ${slide.accentColor} to-transparent rounded-full blur-[100px]`}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1 }}
          />
          
          {/* Floating orbs - psychology: premium & dynamic */}
          <motion.div
            className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-accent/15 rounded-full blur-[120px]"
            animate={{
              x: [0, 40, 0],
              y: [0, -30, 0],
              scale: [1, 1.15, 1],
            }}
            transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/3 w-[300px] h-[300px] bg-primary/8 rounded-full blur-[80px]"
            animate={{
              x: [0, -30, 0],
              y: [0, 30, 0],
              scale: [1.1, 1, 1.1],
            }}
            transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
          />

          {/* Subtle pattern overlay */}
          <div 
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)`,
              backgroundSize: '40px 40px',
            }}
          />
        </motion.div>
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 py-16 text-center relative z-10">
        {/* Badge - Social Proof */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent/10 border border-accent/30 backdrop-blur-sm mb-8 shadow-sm"
        >
          <Sparkles className="w-4 h-4 text-accent" />
          <span className="text-sm font-semibold text-accent tracking-wide">{slide.subtitle}</span>
        </motion.div>

        {/* Main Heading - Psychology: Large, Bold, Clear Value */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`title-${slide.id}`}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-2 leading-[0.95]">
              <span className="text-foreground">{slide.title}</span>
            </h1>
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-6 leading-[0.95]">
              <span className="bg-gradient-to-r from-accent via-warning to-accent bg-clip-text text-transparent">
                {slide.highlight}
              </span>
            </h1>
          </motion.div>
        </AnimatePresence>

        {/* Description - Psychology: Benefits focused */}
        <AnimatePresence mode="wait">
          <motion.p
            key={`desc-${slide.id}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed font-medium"
          >
            {slide.description}
          </motion.p>
        </AnimatePresence>

        {/* CTA Buttons - Psychology: Clear Primary Action + Alternative */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-4 justify-center mb-14"
        >
          <Button 
            size="lg" 
            className="h-14 px-10 text-lg font-bold gap-2 shadow-accent rounded-xl btn-press"
            asChild
          >
            <Link to={slide.ctaLink}>
              {slide.ctaText}
              <ArrowRight className="w-5 h-5" />
            </Link>
          </Button>
          
          {!user && (
            <Button 
              size="lg" 
              variant="outline" 
              className="h-14 px-8 text-lg font-semibold gap-2 rounded-xl border-2 hover:bg-accent/5"
              asChild
            >
              <Link to="/auth">
                Create Free Account
              </Link>
            </Button>
          )}
          
          {user && !isVendor && !isAdmin && (
            <Button 
              size="lg" 
              variant="outline" 
              className="h-14 px-8 text-lg font-semibold rounded-xl border-2 hover:bg-accent/5"
              asChild
            >
              <Link to="/vendor/onboarding">Start Selling</Link>
            </Button>
          )}
        </motion.div>

        {/* Slide Navigation Dots */}
        <div className="flex justify-center gap-3 mb-14">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2.5 rounded-full transition-all duration-400 ease-out-expo ${
                index === currentSlide 
                  ? 'bg-accent w-10 shadow-sm' 
                  : 'bg-muted-foreground/25 w-2.5 hover:bg-muted-foreground/40'
              }`}
            />
          ))}
        </div>

        {/* Stats Row - Psychology: Social Proof & Trust */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-wrap justify-center gap-6 md:gap-10 lg:gap-14"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.5 + index * 0.08 }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card/60 backdrop-blur-sm border border-border/50 shadow-sm"
            >
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <stat.icon className="w-5 h-5 text-accent" />
              </div>
              <div className="text-left">
                <p className="text-xl md:text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-xl bg-card/80 backdrop-blur-md border border-border/50 flex items-center justify-center hover:bg-card hover:shadow-lg transition-all duration-200"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-xl bg-card/80 backdrop-blur-md border border-border/50 flex items-center justify-center hover:bg-card hover:shadow-lg transition-all duration-200"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          className="w-7 h-11 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2"
        >
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4], y: [0, 10, 0] }}
            transition={{ duration: 1.8, repeat: Infinity }}
            className="w-1.5 h-3 bg-accent rounded-full"
          />
        </motion.div>
      </motion.div>
    </section>
  );
}