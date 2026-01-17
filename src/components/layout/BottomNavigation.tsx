import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Search, ShoppingBag, Heart, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useWishlistCount } from '@/hooks/useWishlist';
import { cn } from '@/lib/utils';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  badge?: number;
  requiresAuth?: boolean;
}

// Haptic feedback utility
const triggerHaptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
  if ('vibrate' in navigator) {
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30],
    };
    navigator.vibrate(patterns[style]);
  }
};

export function BottomNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { items } = useCart();
  const { data: wishlistCount } = useWishlistCount();

  const cartItemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const navItems: NavItem[] = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Search, label: 'Shop', path: '/shop' },
    { icon: ShoppingBag, label: 'Cart', path: '/cart', badge: cartItemCount },
    { icon: Heart, label: 'Wishlist', path: '/wishlist', badge: wishlistCount || 0, requiresAuth: true },
    { icon: User, label: 'Account', path: user ? '/account' : '/auth' },
  ];

  const handleNavigation = (item: NavItem) => {
    // Trigger haptic feedback on tap
    triggerHaptic('light');
    
    if (item.requiresAuth && !user) {
      navigate('/auth');
    } else {
      navigate(item.path);
    }
  };

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  // Hide on certain pages
  const hiddenPaths = ['/auth', '/checkout', '/reset-password'];
  if (hiddenPaths.some(path => location.pathname.startsWith(path))) {
    return null;
  }

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
      aria-label="Main navigation"
    >
      {/* Frosted glass backdrop with premium shadow */}
      <div className="absolute inset-0 bg-background/85 backdrop-blur-xl border-t border-border/40 shadow-[0_-4px_30px_rgba(0,0,0,0.1)]" />
      
      {/* Safe area padding for iOS */}
      <div className="relative flex items-center justify-around px-2 h-[72px] pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          
          return (
            <motion.button
              key={item.path}
              onClick={() => handleNavigation(item)}
              whileTap={{ scale: 0.95 }}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1',
                'min-w-[48px] min-h-[48px] w-[64px] h-full',
                'transition-all duration-200 rounded-xl',
                active ? 'text-accent' : 'text-muted-foreground hover:text-foreground'
              )}
              aria-label={`${item.label}${item.badge && item.badge > 0 ? `, ${item.badge} items` : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              {/* Active indicator - pill shape */}
              {active && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute -top-1 left-1/2 -translate-x-1/2 w-10 h-1 bg-gradient-to-r from-accent to-accent/80 rounded-full shadow-[0_0_10px_hsl(var(--accent))]"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  aria-hidden="true"
                />
              )}
              
              {/* Icon container with glow effect */}
              <div className="relative">
                <motion.div
                  animate={active ? { scale: 1.1 } : { scale: 1 }}
                  className={cn(
                    'p-2 rounded-xl transition-colors duration-200',
                    active && 'bg-accent/10'
                  )}
                >
                  <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} aria-hidden="true" />
                </motion.div>
                
                {/* Badge with pulse animation */}
                {item.badge !== undefined && item.badge > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg"
                    aria-hidden="true"
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </motion.span>
                )}
              </div>
              
              {/* Label with font weight change */}
              <span className={cn(
                'text-[10px] transition-all duration-200',
                active ? 'font-semibold text-accent' : 'font-medium text-muted-foreground'
              )} aria-hidden="true">
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </motion.nav>
  );
}
