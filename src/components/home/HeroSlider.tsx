import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';

// Track whether the very first render has happened (used to skip animations for LCP)
let isFirstRender = true;
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useHomepageBanners, CMSBanner } from '@/hooks/useHomepageCMS';

interface Slide {
  id: string;
  title: string;
  subtitle: string;
  price?: string;
  feature?: string;
  ctaText: string;
  ctaLink: string;
  bgColor: string;
  imageUrl?: string;
  badge?: string;
  badgeColor?: string;
  offerText?: string;
  imageOnly?: boolean;
}

// Semantic color palettes for banners
const bannerColors = [
  { bg: 'bg-gradient-to-br from-primary to-primary/80', text: 'text-primary-foreground' },
  { bg: 'bg-gradient-to-br from-accent to-accent/80', text: 'text-accent-foreground' },
  { bg: 'bg-gradient-to-br from-primary/90 to-accent/90', text: 'text-primary-foreground' },
  { bg: 'bg-gradient-to-br from-success to-success/80', text: 'text-success-foreground' },
  { bg: 'bg-gradient-to-br from-destructive to-destructive/80', text: 'text-destructive-foreground' },
  { bg: 'bg-gradient-to-br from-warning to-warning/80', text: 'text-warning-foreground' },
];

// Fallback slides when CMS has no banners
const fallbackSlides: Slide[] = [
  {
    id: 'fallback-1',
    title: 'Premium Collection',
    subtitle: 'Exclusive Designs',
    price: 'Starting ₹999',
    feature: 'Free Shipping on Orders Above ₹499',
    ctaText: 'Shop Now',
    ctaLink: '/shop',
    bgColor: 'bg-gradient-to-br from-primary to-primary/80',
    badge: 'SALE',
    badgeColor: 'bg-accent text-accent-foreground',
    offerText: 'Up to 50% OFF on selected items',
  },
  {
    id: 'fallback-2',
    title: 'New Arrivals',
    subtitle: 'Fresh Styles Just In',
    price: 'Starting ₹599',
    feature: 'Trending this season',
    ctaText: 'Explore Now',
    ctaLink: '/shop?sort=newest',
    bgColor: 'bg-gradient-to-br from-accent to-accent/80',
    badge: 'NEW',
    badgeColor: 'bg-success text-success-foreground',
    offerText: 'Extra 10% OFF on first order',
  },
  {
    id: 'fallback-3',
    title: 'Best Sellers',
    subtitle: "Customer Favorites",
    price: 'Starting ₹799',
    feature: 'Rated 4.5+ Stars',
    ctaText: 'View Collection',
    ctaLink: '/shop?sort=popular',
    bgColor: 'bg-gradient-to-br from-primary/90 to-accent/90',
    badge: 'POPULAR',
    badgeColor: 'bg-destructive text-destructive-foreground',
    offerText: 'Buy 2 Get 1 Free',
  },
];

export function HeroSlider() {
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

    return cmsBanners.map((banner: CMSBanner, index: number) => {
      const colorPalette = bannerColors[index % bannerColors.length];
      
      // Use custom bgColor if provided, then CMS bgColor, otherwise use color palette
      let bgColorClass: string;
      if (banner.customBgColor) {
        bgColorClass = `bg-gradient-to-br ${banner.customBgColor}`;
      } else if (banner.bgColor) {
        bgColorClass = `bg-gradient-to-br ${banner.bgColor}`;
      } else {
        bgColorClass = colorPalette.bg;
      }
      
      return {
        id: banner.id,
        title: banner.title || 'Featured Product',
        subtitle: banner.subtitle || 'Exclusive Offer',
        price: banner.price || '',
        ctaText: banner.ctaText || 'Shop Now',
        ctaLink: banner.ctaLink || '/shop',
        bgColor: bgColorClass,
        imageUrl: banner.imageUrl,
        badge: banner.badge || '',
        badgeColor: banner.badgeColor || 'bg-accent text-accent-foreground',
        offerText: banner.offerText || '',
        imageOnly: banner.imageOnly || false,
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
    const interval = setInterval(nextSlide, 5000);
    return () => clearInterval(interval);
  }, [isAutoPlaying, nextSlide, slides.length]);

  // Reset current slide when slides change
  useEffect(() => {
    if (currentSlide >= slides.length) {
      setCurrentSlide(0);
    }
  }, [slides.length, currentSlide]);

  // Prefetch the NEXT slide's image during idle so swipes/auto-rotate are instant.
  // The first slide already uses fetchpriority="high" via the <img> below.
  useEffect(() => {
    if (slides.length <= 1) return;
    const nextIdx = (currentSlide + 1) % slides.length;
    const nextUrl = slides[nextIdx]?.imageUrl;
    if (!nextUrl) return;

    const schedule =
      'requestIdleCallback' in window
        ? (cb: () => void) =>
            (window as unknown as { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback(cb)
        : (cb: () => void) => window.setTimeout(cb, 200);

    let cleanupLink: HTMLLinkElement | null = null;
    const handle = schedule(() => {
      // Use Image() to warm the browser cache without head pollution if possible
      const img = new Image();
      img.decoding = 'async';
      img.src = nextUrl;
      // Fallback: also add a <link rel="prefetch"> so HTTP cache is primed even if GC'd
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.as = 'image';
      link.href = nextUrl;
      document.head.appendChild(link);
      cleanupLink = link;
    });

    return () => {
      if (typeof handle === 'number') {
        if ('cancelIdleCallback' in window) {
          (window as unknown as { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(handle);
        } else {
          clearTimeout(handle);
        }
      }
      if (cleanupLink && cleanupLink.parentNode) cleanupLink.parentNode.removeChild(cleanupLink);
    };
  }, [currentSlide, slides]);

  const slide = slides[currentSlide] || slides[0];

  // On mount, mark first render done so subsequent slides animate
  const skipInitialAnimation = useRef(isFirstRender);
  useEffect(() => { isFirstRender = false; }, []);

  // Optimized slide animation variants
  const slideVariants = {
    enter: (direction: number) => (skipInitialAnimation.current
      ? { x: 0, opacity: 1 }
      : { x: direction > 0 ? 200 : -200, opacity: 0 }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 200 : -200,
      opacity: 0,
    }),
  };

  // Spring transition for fluid iOS-like motion
  const slideTransition = skipInitialAnimation.current
    ? { duration: 0 }
    : {
        x: { type: 'spring' as const, stiffness: 400, damping: 35 },
        opacity: { duration: 0.15 },
      };

  // After first transition, re-enable animations
  useEffect(() => {
    if (skipInitialAnimation.current) {
      skipInitialAnimation.current = false;
    }
  }, [currentSlide]);

  if (isLoading) {
    return (
      <div className="w-full aspect-[16/9] sm:aspect-[2.5/1] rounded-2xl overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/95 to-primary/80" />
        <div className="relative h-full flex items-center p-6 sm:p-10">
          <div className="space-y-3 animate-pulse">
             <div className="h-3 w-16 bg-primary-foreground/20 rounded-full" />
            <div className="h-8 w-56 bg-primary-foreground/15 rounded-lg" />
            <div className="h-5 w-36 bg-primary-foreground/10 rounded-lg" />
            <div className="h-9 w-28 bg-primary-foreground/20 rounded-lg mt-4" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full touch-pan-y"
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured promotions"
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
    >
      {/* Main Banner */}
      <motion.div
        className="relative w-full aspect-[16/9] sm:aspect-[2.5/1] rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing"
        aria-live={isAutoPlaying ? 'off' : 'polite'}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={slide.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`Slide ${currentSlide + 1} of ${slides.length}: ${slide.title}`}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={slideTransition}
            className={`absolute inset-0 will-change-transform ${slide.imageOnly ? 'bg-foreground' : slide.bgColor}`}
            onClick={() => slide.imageOnly && handleCtaClick(slide.ctaLink)}
          >
            {/* Image Only Mode - Full width image */}
            {slide.imageOnly && slide.imageUrl && (
               <img
                 src={slide.imageUrl}
                 alt={slide.title}
                 width={1200}
                 height={480}
                 fetchPriority={currentSlide === 0 ? 'high' : 'auto'}
                 loading={currentSlide === 0 ? 'eager' : 'lazy'}
                 className="w-full h-full object-cover cursor-pointer"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}

            {/* Standard Mode */}
            {!slide.imageOnly && (
              <>
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 right-0 w-1/2 h-full">
                    <svg className="w-full h-full" viewBox="0 0 200 200" fill="none">
                      <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="0.5" className="text-primary-foreground" />
                      <circle cx="100" cy="100" r="60" stroke="currentColor" strokeWidth="0.5" className="text-primary-foreground" />
                      <circle cx="100" cy="100" r="40" stroke="currentColor" strokeWidth="0.5" className="text-primary-foreground" />
                    </svg>
                  </div>
                </div>

                {/* Content Grid */}
                <div className="relative h-full flex">
                  {/* Left Content */}
                  <div className="flex-1 flex flex-col justify-center p-4 sm:p-6 md:p-8 lg:p-10 text-primary-foreground z-10">
                    {/* Badge */}
                    {slide.badge && (
                      <motion.span
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`inline-flex self-start px-3 py-1 rounded-full text-xs font-bold mb-2 sm:mb-3 ${slide.badgeColor || 'bg-accent text-accent-foreground'}`}
                      >
                        {slide.badge}
                      </motion.span>
                    )}

                    {/* Title */}
                    <motion.h2
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold leading-tight mb-1 sm:mb-2"
                    >
                      {slide.title}
                    </motion.h2>

                    {/* Subtitle/Price */}
                    <motion.p
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 }}
                      className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold mb-1"
                    >
                      {slide.price || slide.subtitle}
                    </motion.p>

                    {/* Feature */}
                    {slide.feature && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-xs sm:text-sm text-primary-foreground/80 mb-3 sm:mb-4"
                      >
                        {slide.feature}
                      </motion.p>
                    )}

                    {/* Offer Card */}
                    {slide.offerText && (
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.25 }}
                        className="hidden sm:flex items-center gap-2 bg-background rounded-lg px-3 py-2 max-w-fit shadow-lg mb-3"
                      >
                        <span className="text-xs sm:text-sm font-semibold text-foreground">
                          {slide.offerText}
                        </span>
                      </motion.div>
                    )}

                    {/* CTA Button */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <Button
                        size="sm"
                        onClick={() => handleCtaClick(slide.ctaLink)}
                        className="bg-background text-foreground hover:bg-secondary font-semibold px-4 sm:px-6 h-8 sm:h-10 text-xs sm:text-sm rounded-lg shadow-md"
                      >
                        {slide.ctaText}
                      </Button>
                    </motion.div>

                    {/* Terms */}
                    <p className="text-[10px] text-primary-foreground/50 mt-2 hidden sm:block">
                      *T&C apply. Limited period offer.
                    </p>
                  </div>

                  {/* Right Image */}
                  <div className="flex-1 relative flex items-center justify-center">
                  {slide.imageUrl && (
                      <img
                        src={slide.imageUrl}
                        alt={slide.title}
                        width={600}
                        height={600}
                        fetchPriority={currentSlide === 0 ? 'high' : 'auto'}
                        loading={currentSlide === 0 ? 'eager' : 'lazy'}
                        className="max-h-full max-w-full object-contain drop-shadow-2xl"
                        style={{ opacity: 1, transform: 'none' }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    
                    {/* Decorative elements when no image */}
                    {!slide.imageUrl && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.3 }}
                        className="w-32 h-32 sm:w-48 sm:h-48 md:w-64 md:h-64 rounded-full bg-primary-foreground/10 backdrop-blur-sm"
                      />
                    )}
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows - Desktop only */}
        <button
          onClick={(e) => { e.stopPropagation(); prevSlide(); }}
          aria-label="Previous slide"
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary-foreground/20 backdrop-blur-sm flex items-center justify-center hover:bg-primary-foreground/30 transition-colors opacity-0 group-hover:opacity-100 sm:opacity-100"
        >
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); nextSlide(); }}
          aria-label="Next slide"
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary-foreground/20 backdrop-blur-sm flex items-center justify-center hover:bg-primary-foreground/30 transition-colors opacity-0 group-hover:opacity-100 sm:opacity-100"
        >
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
        </button>
      </motion.div>

      {/* Navigation Dots */}
      <nav aria-label="Hero slides" className="flex justify-center gap-2 mt-3">
        {slides.map((s, index) => (
          <button
            key={s.id}
            onClick={() => {
              setDirection(index > currentSlide ? 1 : -1);
              setCurrentSlide(index);
            }}
            aria-label={`Go to slide ${index + 1}`}
            aria-current={index === currentSlide ? 'true' : undefined}
            className="p-1"
          >
            <span
              className={`block h-2 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? 'bg-foreground w-6'
                  : 'bg-muted-foreground/30 w-2 hover:bg-muted-foreground/50'
              }`}
            />
          </button>
        ))}
      </nav>
    </div>
  );
}
