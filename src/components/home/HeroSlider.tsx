import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Sparkles, Play, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

interface Slide {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  imageUrl: string;
  ctaText: string;
  ctaLink: string;
  gradient: string;
}

const slides: Slide[] = [
  {
    id: '1',
    title: 'Discover Extraordinary',
    subtitle: 'India\'s Premium Marketplace',
    description: 'Curated collections from 500+ verified vendors. From artisanal fashion to cutting-edge tech.',
    imageUrl: '',
    ctaText: 'Explore Collection',
    ctaLink: '/shop',
    gradient: 'from-accent/20 via-accent/5 to-transparent',
  },
  {
    id: '2',
    title: 'New Season Arrivals',
    subtitle: 'Fashion Collection',
    description: 'Up to 50% off on the latest fashion trends. Shop now and redefine your style.',
    imageUrl: '',
    ctaText: 'Shop Fashion',
    ctaLink: '/shop?category=fashion',
    gradient: 'from-rose-500/20 via-pink-500/5 to-transparent',
  },
  {
    id: '3',
    title: 'Tech Deals',
    subtitle: 'Electronics Sale',
    description: 'Latest gadgets at unbeatable prices. Free shipping on orders above ₹999.',
    imageUrl: '',
    ctaText: 'View Deals',
    ctaLink: '/shop?category=electronics',
    gradient: 'from-blue-500/20 via-cyan-500/5 to-transparent',
  },
];

const stats = [
  { value: '10K+', label: 'Products' },
  { value: '500+', label: 'Vendors' },
  { value: '50K+', label: 'Happy Customers' },
  { value: '4.9', label: 'Average Rating' },
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
    const interval = setInterval(nextSlide, 5000);
    return () => clearInterval(interval);
  }, [isAutoPlaying, nextSlide]);

  const slide = slides[currentSlide];

  return (
    <section 
      className="relative min-h-[90vh] flex items-center justify-center overflow-hidden"
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
          transition={{ duration: 0.5 }}
          className="absolute inset-0 -z-10"
        >
          {/* Gradient base */}
          <div className={`absolute inset-0 bg-gradient-to-br ${slide.gradient}`} />
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-background/80" />
          
          {/* Floating orbs */}
          <motion.div
            className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px]"
            animate={{
              x: [0, 50, 0],
              y: [0, -30, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px]"
            animate={{
              x: [0, -40, 0],
              y: [0, 40, 0],
              scale: [1.1, 1, 1.1],
            }}
            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          />

          {/* Grid pattern */}
          <div 
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
              backgroundSize: '60px 60px',
            }}
          />
        </motion.div>
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent/10 border border-accent/20 backdrop-blur-sm mb-8"
        >
          <Sparkles className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium text-accent">{slide.subtitle}</span>
        </motion.div>

        {/* Main Heading */}
        <AnimatePresence mode="wait">
          <motion.h1
            key={`title-${slide.id}`}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6"
          >
            {slide.title.split(' ').map((word, i) => (
              <span key={i} className={i === slide.title.split(' ').length - 1 ? 'text-accent' : ''}>
                {word}{' '}
              </span>
            ))}
          </motion.h1>
        </AnimatePresence>

        {/* Description */}
        <AnimatePresence mode="wait">
          <motion.p
            key={`desc-${slide.id}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            {slide.description}
          </motion.p>
        </AnimatePresence>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
        >
          <Button 
            size="lg" 
            className="h-14 px-8 text-lg font-semibold gap-2 shadow-lg hover:shadow-xl transition-shadow"
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
              className="h-14 px-8 text-lg font-semibold gap-2"
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
              className="h-14 px-8 text-lg font-semibold"
              asChild
            >
              <Link to="/vendor/onboarding">Become a Seller</Link>
            </Button>
          )}
        </motion.div>

        {/* Slide Navigation Dots */}
        <div className="flex justify-center gap-2 mb-12">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                index === currentSlide 
                  ? 'bg-accent w-8' 
                  : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
              }`}
            />
          ))}
        </div>

        {/* Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-wrap justify-center gap-8 md:gap-16"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
              className="text-center"
            >
              <p className="text-3xl md:text-4xl font-bold text-accent">{stat.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center hover:bg-background transition-colors"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center hover:bg-background transition-colors"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-1.5"
        >
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5], y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-1.5 h-2.5 bg-accent rounded-full"
          />
        </motion.div>
      </motion.div>
    </section>
  );
}
