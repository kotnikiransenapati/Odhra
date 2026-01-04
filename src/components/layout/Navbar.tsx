import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { MegaMenu } from '@/components/layout/MegaMenu';
import { MiniCartDropdown } from '@/components/cart/MiniCartDropdown';
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
  Package
} from 'lucide-react';
import { useWishlistCount } from '@/hooks/useWishlist';

export function Navbar() {
  const { user, isAdmin, isVendor, signOut } = useAuth();
  const { data: wishlistCount } = useWishlistCount();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    <motion.nav 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="nav-float"
    >
      <div className="flex items-center justify-between gap-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <Sparkles className="w-6 h-6 text-accent transition-transform group-hover:rotate-12" />
          <span className="text-xl font-bold tracking-tight">Odhra</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          <Link to="/shop" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Shop
          </Link>
          <MegaMenu />
          
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
          {user && !isAdmin && !isVendor && (
            <Link to="/become-vendor" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Become a Seller
            </Link>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          
          <Button variant="ghost" size="icon" className="hidden md:flex">
            <Search className="w-5 h-5" />
          </Button>

          {/* Wishlist */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative"
            onClick={() => navigate('/wishlist')}
          >
            <Heart className="w-5 h-5" />
            {wishlistCount && wishlistCount > 0 && (
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
              >
                {wishlistCount > 99 ? '99+' : wishlistCount}
              </motion.span>
            )}
          </Button>
          
          {/* Mini Cart Dropdown */}
          <MiniCartDropdown />

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-9 w-9 border-2 border-accent/20">
                    <AvatarImage src={user.user_metadata?.avatar_url} />
                    <AvatarFallback className="bg-accent/10 text-accent font-semibold">
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
                    <p className="text-xs leading-none text-muted-foreground">
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
                  <DropdownMenuItem onClick={() => navigate('/vendor')}>
                    <Store className="mr-2 h-4 w-4" />
                    Vendor Dashboard
                  </DropdownMenuItem>
                )}
                
                <DropdownMenuItem onClick={() => navigate('/account')}>
                  <User className="mr-2 h-4 w-4" />
                  My Account
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={() => navigate('/orders')}>
                  <Package className="mr-2 h-4 w-4" />
                  My Orders
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
            <Button onClick={() => navigate('/auth')} className="btn-press">
              Sign In
            </Button>
          )}

          {/* Mobile Menu Toggle */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden mt-4 pt-4 border-t border-border/50"
          >
            <div className="flex flex-col gap-2">
              <Link 
                to="/shop" 
                className="px-3 py-2 rounded-lg text-sm font-medium hover:bg-secondary transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Shop
              </Link>
              
              {/* Role-based Dashboard Links for Mobile */}
              {isAdmin && (
                <Link 
                  to="/admin" 
                  className="px-3 py-2 rounded-lg text-sm font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors flex items-center gap-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Admin Dashboard
                </Link>
              )}
              {isVendor && (
                <Link 
                  to="/vendor" 
                  className="px-3 py-2 rounded-lg text-sm font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors flex items-center gap-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Store className="w-4 h-4" />
                  Vendor Dashboard
                </Link>
              )}
              {user && (
                <Link 
                  to="/account" 
                  className="px-3 py-2 rounded-lg text-sm font-medium hover:bg-secondary transition-colors flex items-center gap-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User className="w-4 h-4" />
                  My Account
                </Link>
              )}
              {user && !isVendor && (
                <Link 
                  to="/become-vendor" 
                  className="px-3 py-2 rounded-lg text-sm font-medium hover:bg-secondary transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Become a Seller
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
