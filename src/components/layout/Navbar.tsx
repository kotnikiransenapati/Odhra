import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { MegaMenu } from '@/components/layout/MegaMenu';
import { CurrencySelector } from '@/components/layout/CurrencySelector';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { MiniCartDropdown } from '@/components/cart/MiniCartDropdown';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { GlobalSearchModal } from '@/components/search/GlobalSearchModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Sparkles, 
  Search,
  User, 
  Store, 
  Settings, 
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  Heart,
  Package,
  Wallet,
  TrendingUp,
  ShoppingBag,
  Gift,
  Zap
} from 'lucide-react';
import { useWishlistCount } from '@/hooks/useWishlist';

export function Navbar() {
  const { user, isAdmin, isVendor, signOut } = useAuth();
  const { data: wishlistCount } = useWishlistCount();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Handle scroll for navbar styling
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getInitials = (name?: string | null, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email?.charAt(0).toUpperCase() || 'U';
  };

  return (
    <>
      {/* Skip to main content - accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-accent focus:text-accent-foreground focus:rounded-md focus:outline-none"
      >
        Skip to main content
      </a>
      <header 
        role="banner"
        className={`sticky top-[var(--banner-height,0px)] z-50 transition-all duration-300 ${
          isScrolled 
            ? 'bg-background/95 backdrop-blur-xl shadow-md border-b border-border/50' 
            : 'bg-background/80 backdrop-blur-md'
        }`}
      >
      <nav aria-label="Main navigation" className="w-full max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between gap-2 sm:gap-4 lg:gap-8 h-14 sm:h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-1.5 sm:gap-2 group flex-shrink-0">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-accent transition-transform group-hover:rotate-12 flex-shrink-0" />
            <span className="text-base sm:text-lg lg:text-xl font-bold tracking-tight">Odhra</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-4 xl:gap-6">
            <Link to="/shop" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4" />
              Shop All
            </Link>
            <MegaMenu />
            
            {/* Deals - Psychology: Creates urgency */}
            <Link to="/shop?sort=discount" className="text-sm font-medium text-destructive hover:text-destructive/80 transition-colors flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              Hot Deals
            </Link>
            
            {/* Flash Sales */}
            <Link to="/flash-sales" className="text-sm font-medium text-warning hover:text-warning/80 transition-colors flex items-center gap-1">
              <Zap className="w-4 h-4" />
              Flash Sale
            </Link>
            
            {/* Role-based Dashboard Links */}
            {isAdmin && (
              <Link to="/admin" className="text-sm font-medium text-accent hover:text-accent/80 transition-colors flex items-center gap-1">
                <LayoutDashboard className="w-4 h-4" />
                Admin
              </Link>
            )}
            {isVendor && !isAdmin && (
              <Link to="/vendor" className="text-sm font-medium text-accent hover:text-accent/80 transition-colors flex items-center gap-1">
                <Store className="w-4 h-4" />
                Vendor
              </Link>
            )}
            {!user && (
              <Link to="/become-vendor" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                <Store className="w-4 h-4" />
                Sell on Odhra
              </Link>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-2">
            {/* Language Switcher */}
            <div className="hidden md:block">
              <LanguageSwitcher />
            </div>

            {/* Currency Selector */}
            <div className="hidden md:block">
              <CurrencySelector />
            </div>
            
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>
            
            {/* Search Button */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 sm:h-9 sm:w-9"
              onClick={() => setSearchOpen(true)}
              aria-label="Search products, orders, and more"
            >
              <Search className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>

            {/* Spin to Win - Psychology: Gamification drives engagement */}
            <Link to="/spin-to-win" className="hidden lg:flex">
              <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 text-accent hover:text-accent/80" aria-label="Spin to Win rewards">
                <Gift className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
              </Button>
            </Link>

            {/* Notification Center */}
            {user && <div className="hidden sm:block"><NotificationCenter /></div>}

            {/* Wishlist */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative h-8 w-8 sm:h-9 sm:w-9 hidden sm:flex"
              onClick={() => navigate('/wishlist')}
              aria-label="View wishlist"
            >
              <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
              {wishlistCount && wishlistCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 sm:w-5 sm:h-5 bg-destructive text-destructive-foreground text-[10px] sm:text-xs font-bold rounded-full flex items-center justify-center">
                  {wishlistCount > 99 ? '99+' : wishlistCount}
                </span>
              )}
            </Button>
            
            {/* Mini Cart Dropdown */}
            <MiniCartDropdown />

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 sm:h-9 sm:w-9 rounded-full p-0 flex-shrink-0">
                    <Avatar className="h-7 w-7 sm:h-8 sm:w-8 border-2 border-accent/20">
                      <AvatarImage src={user.user_metadata?.avatar_url} />
                      <AvatarFallback className="bg-accent/10 text-accent font-semibold text-xs sm:text-sm">
                        {getInitials(user.user_metadata?.full_name, user.email)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 glass" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user.user_metadata?.full_name || 'User'}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate('/admin')}>
                      <LayoutDashboard className="mr-2 h-4 w-4 text-accent" />
                      Admin Dashboard
                    </DropdownMenuItem>
                  )}
                  
                  {isVendor && (
                    <>
                      <DropdownMenuItem onClick={() => navigate('/vendor')}>
                        <Store className="mr-2 h-4 w-4" />
                        Vendor Dashboard
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/vendor/wallet')}>
                        <Wallet className="mr-2 h-4 w-4" />
                        Vendor Wallet
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/vendor/analytics')}>
                        <TrendingUp className="mr-2 h-4 w-4" />
                        Vendor Analytics
                      </DropdownMenuItem>
                    </>
                  )}
                  
                  <DropdownMenuItem onClick={() => navigate('/account')}>
                    <User className="mr-2 h-4 w-4" />
                    My Account
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={() => navigate('/orders')}>
                    <Package className="mr-2 h-4 w-4" />
                    My Orders
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => navigate('/wallet')}>
                    <Wallet className="mr-2 h-4 w-4" />
                    My Wallet
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => navigate('/wishlist')}>
                    <Heart className="mr-2 h-4 w-4" />
                    My Wishlist
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button onClick={() => navigate('/auth')} className="btn-press h-8 sm:h-9 px-3 sm:px-4 text-xs sm:text-sm flex-shrink-0">
                Sign In
              </Button>
            )}

            {/* Mobile Menu Toggle */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl"
          >
            <div className="container mx-auto px-4 py-4">
              <div className="flex flex-col gap-2">
                <Link 
                  to="/shop" 
                  className="px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-secondary transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Shop
                </Link>
                
                {/* Role-based Dashboard Links for Mobile */}
                {isAdmin && (
                  <Link 
                    to="/admin" 
                    className="px-3 py-2.5 rounded-lg text-sm font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors flex items-center gap-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Admin Dashboard
                  </Link>
                )}
                {isVendor && (
                  <>
                    <Link 
                      to="/vendor" 
                      className="px-3 py-2.5 rounded-lg text-sm font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors flex items-center gap-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Store className="w-4 h-4" />
                      Vendor Dashboard
                    </Link>
                    <Link 
                      to="/vendor/wallet" 
                      className="px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-secondary transition-colors flex items-center gap-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Wallet className="w-4 h-4" />
                      Vendor Wallet
                    </Link>
                  </>
                )}
                {user && (
                  <>
                    <Link 
                      to="/account" 
                      className="px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-secondary transition-colors flex items-center gap-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <User className="w-4 h-4" />
                      My Account
                    </Link>
                    <Link 
                      to="/wallet" 
                      className="px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-secondary transition-colors flex items-center gap-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Wallet className="w-4 h-4" />
                      My Wallet
                    </Link>
                    <Link 
                      to="/orders" 
                      className="px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-secondary transition-colors flex items-center gap-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Package className="w-4 h-4" />
                      My Orders
                    </Link>
                  </>
                )}
                {user && !isVendor && (
                  <Link 
                    to="/become-vendor" 
                    className="px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-secondary transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Become a Seller
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Global Search Modal */}
      <GlobalSearchModal open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
    </>
  );
}
