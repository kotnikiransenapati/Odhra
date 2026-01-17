import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { ChevronLeft, ChevronRight, Sparkles, ArrowRight, Star, ShoppingBag, Verified, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useHomepageBanners, CMSBanner } from '@/hooks/useHomepageCMS';

interface Slide {
  id: string;
  title: string;
  highlight: string;
  subtitle: string;
  description: string;
  ctaText: string;
  ctaLink: string;
  accentColor: string;
  imageUrl?: string;
}

// Fallback slides when CMS has no banners
const fallbackSlides: Slide[] = [
  {
    id: 'fallback-1',
    title: 'Discover',
    highlight: 'Extraordinary',
    subtitle: 'India\'s Premium Marketplace',
    description: 'Curated collections from 500+ verified vendors. From artisanal fashion to cutting-edge tech.',
    ctaText: 'Start Shopping',
    ctaLink: '/shop',
    accentColor: 'from-amber-500/30 via-orange-400/20',
  },
  {
    id: 'fallback-2',
    title: 'New Season',
    highlight: 'Collection',
    subtitle: 'Up to 50% OFF Fashion',
    description: 'Refresh your wardrobe with the latest trends. Limited time offers on premium brands.',
    ctaText: 'Shop Fashion',
    ctaLink: '/shop?category=fashion',
    accentColor: 'from-rose-500/30 via-pink-400/20',
  },
  {
    id: 'fallback-3',
    title: 'Tech',
    highlight: 'Deals',
    subtitle: 'Electronics Sale Live',
    description: 'Latest gadgets at unbeatable prices. Free shipping on orders above ₹999.',
    ctaText: 'View Deals',
    ctaLink: '/shop?category=electronics',
    accentColor: 'from-blue-500/30 via-cyan-400/20',
  },
];

// Color accents for dynamic banners
const accentColors = [
  'from-amber-500/30 via-orange-400/20',
  'from-rose-500/30 via-pink-400/20',
  'from-blue-500/30 via-cyan-400/20',
  'from-emerald-500/30 via-green-400/20',
  'from-purple-500/30 via-violet-400/20',
];

const stats = [
  { value: '10K+', label: 'Products', icon: ShoppingBag },
  { value: '500+', label: 'Verified Vendors', icon: Verified },
  { value: '50K+', label: 'Happy Customers', icon: Star },
  { value: '4.9★', label: 'Average Rating', icon: Star },
];

export function HeroSlider() {
  const { user, isVendor, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { data: cmsBanners, isLoading } = useHomepageBanners();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [direction, setDirection] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Convert CMS banners to slides format
  const slides = useMemo(() => {
    if (!cmsBanners || cmsBanners.length === 0) {
      return fallbackSlides;
    }

    // Filter to only include banners with valid image URLs (http/https)
    // Relative paths like /hero-banner-1.jpg don't exist in our storage
    const validBanners = cmsBanners.filter((banner: CMSBanner) => {
      // Must have a valid absolute URL for the image
      if (!banner.imageUrl) return false;
      return banner.imageUrl.startsWith('http://') || banner.imageUrl.startsWith('https://');
    });

    // If no valid banners after filtering, use fallbacks
    if (validBanners.length === 0) {
      return fallbackSlides;
    }

    return validBanners.map((banner: CMSBanner, index: number) => {
      // Split title into title and highlight if contains space
      const titleParts = banner.title.trim().split(' ');
      const title = titleParts.length > 1 ? titleParts.slice(0, -1).join(' ') : titleParts[0];
      const highlight = titleParts.length > 1 ? titleParts[titleParts.length - 1] : '';

      return {
        id: banner.id,
        title: title,
        highlight: highlight || 'Now',
        subtitle: banner.subtitle || 'Exclusive Offer',
        description: banner.subtitle || 'Discover amazing deals and exclusive offers.',
        ctaText: banner.ctaText || 'Shop Now',
        ctaLink: banner.ctaLink || '/shop',
        accentColor: accentColors[index % accentColors.length],
        imageUrl: banner.imageUrl,
      } as Slide;
    });
  }, [cmsBanners]);

  const nextSlide = useCallback(() => {
    setDirection(1);
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setDirection(-1);
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  // Handle swipe/drag
  const handleDragEnd = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.x > threshold) {
      prevSlide();
    } else if (info.offset.x < -threshold) {
      nextSlide();
    }
  }, [nextSlide, prevSlide]);

  // Handle CTA click
  const handleCtaClick = useCallback((link: string) => {
    if (link.startsWith('http')) {
      window.open(link, '_blank', 'noopener,noreferrer');
    } else {
      navigate(link);
    }
  }, [navigate]);

  useEffect(() => {
    if (!isAutoPlaying || slides.length <= 1) return;
    const interval = setInterval(nextSlide, 6000);
    return () => clearInterval(interval);
  }, [isAutoPlaying, nextSlide, slides.length]);

  // Reset current slide when slides change
  useEffect(() => {
    if (currentSlide >= slides.length) {
      setCurrentSlide(0);
    }
  }, [slides.length, currentSlide]);

  const slide = slides[currentSlide] || slides[0];

  // Swipe animation variants
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  if (isLoading) {
    return (
      <section className="relative min-h-[92vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </section>
    );
  }

  return (
    <section 
      ref={containerRef}
      className="relative min-h-[92vh] flex items-center justify-center overflow-hidden touch-pan-y"
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
          {/* Banner Image Background (from CMS) */}
          {slide.imageUrl && (
            <div className="absolute inset-0">
              <img 
                src={slide.imageUrl} 
                alt={`${slide.title} ${slide.highlight}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Hide broken images
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              {/* Lighter overlay to show more of the uploaded banner image */}
              <div className="absolute inset-0 bg-gradient-to-r from-background/60 via-background/30 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-background/50 via-transparent to-background/10" />
            </div>
          )}
          
          {/* Base gradient (fallback when no image) */}
          {!slide.imageUrl && (
            <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-secondary/50" />
          )}
          
          {/* Dynamic color accent */}
          <motion.div
            className={`absolute top-0 right-0 w-[60%] h-[70%] bg-gradient-to-bl ${slide.accentColor} to-transparent rounded-full blur-[100px]`}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: slide.imageUrl ? 0.5 : 1 }}
            transition={{ duration: 1 }}
          />
          
          {/* Floating orbs - psychology: premium & dynamic */}
          {!slide.imageUrl && (
            <>
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
            </>
          )}

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

      {/* Swipeable Content */}
      <motion.div 
        className="max-w-7xl mx-auto px-4 py-16 text-center relative z-10 cursor-grab active:cursor-grabbing"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
      >
        {/* Badge - Social Proof */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent/20 border border-accent/30 backdrop-blur-sm mb-8 shadow-sm"
        >
          <Sparkles className="w-4 h-4 text-accent" />
          <span className="text-sm font-bold text-foreground tracking-wide">{slide.subtitle}</span>
        </motion.div>

        {/* Main Heading - Psychology: Large, Bold, Clear Value */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={`title-${slide.id}`}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.4 }}
          >
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-6 leading-[0.95]">
              <span className="text-foreground">{slide.title}</span>
              <br />
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
            onClick={() => handleCtaClick(slide.ctaLink)}
          >
            {slide.ctaText}
            <ArrowRight className="w-5 h-5" />
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
        <nav aria-label="Hero slides" className="flex justify-center gap-3 mb-14">
          {slides.map((s, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              aria-label={`Go to slide ${index + 1}: ${s.title} ${s.highlight}`}
              aria-current={index === currentSlide ? 'true' : undefined}
              className={`min-h-[44px] min-w-[44px] flex items-center justify-center transition-all duration-400 ease-out-expo`}
            >
              <span className={`h-2.5 rounded-full transition-all duration-400 ${
                index === currentSlide 
                  ? 'bg-accent w-10 shadow-sm' 
                  : 'bg-muted-foreground/25 w-2.5 hover:bg-muted-foreground/40'
              }`} />
            </button>
          ))}
        </nav>

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
      </motion.div>

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        aria-label="Previous slide"
        className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 min-w-[48px] min-h-[48px] w-12 h-12 rounded-xl bg-card/80 backdrop-blur-md border border-border/50 flex items-center justify-center hover:bg-card hover:shadow-lg transition-all duration-200"
      >
        <ChevronLeft className="w-6 h-6" aria-hidden="true" />
      </button>
      <button
        onClick={nextSlide}
        aria-label="Next slide"
        className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 min-w-[48px] min-h-[48px] w-12 h-12 rounded-xl bg-card/80 backdrop-blur-md border border-border/50 flex items-center justify-center hover:bg-card hover:shadow-lg transition-all duration-200"
      >
        <ChevronRight className="w-6 h-6" aria-hidden="true" />
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