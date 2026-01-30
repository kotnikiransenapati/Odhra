import React, { useState, useEffect, useCallback, memo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Search, ShoppingBag, Heart, User, Gift, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useWishlistCount } from '@/hooks/useWishlist';
import { cn } from '@/lib/utils';
import { haptic, type HapticStyle } from '@/lib/haptics';
import { SPRING } from '@/lib/animations';

interface NavItem {
  icon: React.ElementType;
  activeIcon?: React.ElementType;
  label: string;
  path: string;
  badge?: number;
  requiresAuth?: boolean;
  highlight?: boolean;
  hapticStyle?: HapticStyle;
}

function BottomNavigationComponent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { items } = useCart();
  const { data: wishlistCount } = useWishlistCount();
  const [showRewards, setShowRewards] = useState(false);

  const cartItemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  // Show rewards indicator periodically for logged-in users
  useEffect(() => {
    if (user) {
      const interval = setInterval(() => {
        setShowRewards(true);
        setTimeout(() => setShowRewards(false), 3000);
      }, 60000); // Every minute
      return () => clearInterval(interval);
    }
  }, [user]);

  const navItems: NavItem[] = [
    { icon: Home, label: 'Home', path: '/', hapticStyle: 'light' },
    { icon: Search, label: 'Shop', path: '/shop', hapticStyle: 'light' },
    { icon: ShoppingBag, label: 'Cart', path: '/cart', badge: cartItemCount, hapticStyle: 'medium' },
    { icon: Heart, label: 'Wishlist', path: '/wishlist', badge: wishlistCount || 0, requiresAuth: true, hapticStyle: 'light' },
    { icon: user ? Gift : User, label: user ? 'Rewards' : 'Account', path: user ? '/account/rewards' : '/auth', highlight: showRewards && !!user, hapticStyle: 'medium' },
  ];

  const handleNavigation = useCallback((item: NavItem) => {
    // Trigger appropriate haptic feedback
    haptic(item.badge && item.badge > 0 ? 'success' : item.hapticStyle || 'light');
    
    if (item.requiresAuth && !user) {
      navigate('/auth');
    } else {
      navigate(item.path);
    }
  }, [navigate, user]);

  const isActive = useCallback((path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  }, [location.pathname]);

  // Hide on certain pages
  const hiddenPaths = ['/auth', '/checkout', '/reset-password'];
  if (hiddenPaths.some(path => location.pathname.startsWith(path))) {
    return null;
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
      aria-label="Main navigation"
    >
      {/* Frosted glass backdrop with premium shadow */}
      <div className="absolute inset-0 bg-background/90 backdrop-blur-2xl border-t border-border/30 shadow-[0_-8px_40px_rgba(0,0,0,0.08)]" />
      
      {/* Safe area padding for iOS */}
      <div className="relative flex items-center justify-around px-2 h-[72px] pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          
          return (
            <motion.button
              key={item.path}
              onClick={() => handleNavigation(item)}
              whileTap={{ scale: 0.85 }}
              transition={SPRING.stiff}
              className={cn(
                'relative flex flex-col items-center justify-center gap-0.5',
                'min-w-[48px] min-h-[48px] w-[64px] h-full',
                'transition-colors duration-150 rounded-2xl touch-manipulation',
                active ? 'text-accent' : 'text-muted-foreground active:text-foreground',
                item.highlight && 'animate-pulse'
              )}
              aria-label={`${item.label}${item.badge && item.badge > 0 ? `, ${item.badge} items` : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              {/* Active indicator - pill shape (CSS transition instead of layout animation for performance) */}
              <div
                className={cn(
                  "absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full transition-all duration-200",
                  active 
                    ? "opacity-100 scale-100 bg-gradient-to-r from-accent to-accent/70 shadow-[0_0_12px_hsl(var(--accent)/0.5)]" 
                    : "opacity-0 scale-75"
                )}
                aria-hidden="true"
              />
              
              {/* Icon container with glow effect */}
              <div className="relative">
                <motion.div
                  animate={active ? { scale: 1.1 } : { scale: 1 }}
                  transition={SPRING.stiff}
                  className={cn(
                    'p-2 rounded-2xl transition-colors duration-150',
                    active && 'bg-accent/10',
                    item.highlight && 'bg-accent/20'
                  )}
                >
                  <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} aria-hidden="true" />
                  
                  {/* Sparkle effect for highlighted items */}
                  <AnimatePresence mode="wait">
                    {item.highlight && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0, rotate: -45 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        exit={{ opacity: 0, scale: 0, rotate: 45 }}
                        transition={SPRING.bouncy}
                        className="absolute -top-1 -right-1"
                      >
                        <Sparkles className="w-3 h-3 text-accent" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
                
                {/* Badge with spring animation */}
                <AnimatePresence mode="wait">
                  {item.badge !== undefined && item.badge > 0 && (
                    <motion.span
                      key={item.badge}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={SPRING.bouncy}
                      className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg"
                      aria-hidden="true"
                    >
                      {item.badge > 99 ? '99+' : item.badge}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              
              {/* Label with font weight change */}
              <span className={cn(
                'text-[10px] transition-all duration-150',
                active ? 'font-semibold text-accent' : 'font-medium text-muted-foreground'
              )} aria-hidden="true">
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}

// Memoize to prevent unnecessary re-renders
export const BottomNavigation = memo(BottomNavigationComponent);
