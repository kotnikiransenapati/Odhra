import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOrdersCount } from '@/hooks/useOrders';
import { useWishlistCount } from '@/hooks/useWishlist';
import { Navbar } from '@/components/layout/Navbar';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LoyaltyCard } from '@/components/loyalty/LoyaltyCard';
import { 
  User, 
  ShoppingBag, 
  Heart, 
  MapPin, 
  CreditCard, 
  Bell, 
  Settings,
  ChevronRight,
  Package,
  Store,
  Trophy,
  Gift,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';

const menuItems = [
  { label: 'My Orders', desc: 'Track, return, or buy things again', icon: ShoppingBag, href: '/orders' },
  { label: 'My Returns', desc: 'Track return & refund requests', icon: RotateCcw, href: '/account/returns' },
  { label: 'My Subscriptions', desc: 'Manage recurring deliveries', icon: RefreshCw, href: '/account/subscriptions' },
  { label: 'Rewards Center', desc: 'Loyalty points, badges & referrals', icon: Trophy, href: '/account/rewards' },
  { label: 'My Wallet', desc: 'Coupons & spin wheel rewards', icon: CreditCard, href: '/wallet' },
  { label: 'My Analytics', desc: 'Shopping insights & spending trends', icon: Package, href: '/analytics' },
  { label: 'Wishlist', desc: 'Your saved items', icon: Heart, href: '/wishlist' },
  { label: 'Addresses', desc: 'Manage your delivery addresses', icon: MapPin, href: '/addresses' },
  { label: 'Notifications', desc: 'Manage your preferences', icon: Bell, href: '/account/notifications' },
  { label: 'Account Settings', desc: 'Password, security & more', icon: Settings, href: '/settings' },
];

export default function CustomerAccount() {
  const { user, isVendor, isAdmin } = useAuth();
  const { data: ordersCount = 0 } = useOrdersCount();
  const { data: wishlistCount = 0 } = useWishlistCount();

  const getInitials = (name?: string | null, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email?.charAt(0).toUpperCase() || 'U';
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 pt-28 pb-16">
        {/* Profile Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6 mb-8"
        >
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <Avatar className="w-24 h-24 border-4 border-accent/20">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="text-2xl font-bold bg-accent/10 text-accent">
                {getInitials(user?.user_metadata?.full_name, user?.email)}
              </AvatarFallback>
            </Avatar>
            <div className="text-center sm:text-left flex-1">
              <h1 className="text-2xl font-bold mb-1">
                {user?.user_metadata?.full_name || 'User'}
              </h1>
              <p className="text-muted-foreground mb-4">{user?.email}</p>
              <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                <Button variant="outline" size="sm" className="btn-press" asChild>
                  <Link to="/settings">
                    <Settings className="w-4 h-4 mr-2" /> Edit Profile
                  </Link>
                </Button>
                {!isVendor && !isAdmin && (
                  <Button variant="outline" size="sm" className="btn-press" asChild>
                    <Link to="/become-vendor">
                      <Store className="w-4 h-4 mr-2" /> Become a Seller
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Loyalty Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <LoyaltyCard compact />
        </motion.div>

        {/* Quick Stats */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-4 gap-3 mb-8"
        >
          {[
            { label: 'Orders', value: ordersCount.toString(), icon: Package, href: '/orders' },
            { label: 'Wishlist', value: wishlistCount.toString(), icon: Heart, href: '/wishlist' },
            { label: 'Rewards', value: '→', icon: Trophy, href: '/account/rewards' },
            { label: 'Wallet', value: '→', icon: Gift, href: '/wallet' },
          ].map((stat) => (
            <Link key={stat.label} to={stat.href} className="glass rounded-xl p-3 text-center hover:bg-secondary/50 transition-colors">
              <stat.icon className="w-5 h-5 text-accent mx-auto mb-1" />
              <p className="text-lg font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </Link>
          ))}
        </motion.div>

        {/* Menu Items */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          {menuItems.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              className="glass rounded-xl p-4 flex items-center gap-4 hover:bg-secondary/50 transition-colors group"
            >
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <item.icon className="w-6 h-6 text-accent" />
              </div>
              <div className="flex-1">
                <p className="font-medium">{item.label}</p>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </Link>
          ))}
        </motion.div>

        {/* Vendor/Admin Quick Access */}
        {(isVendor || isAdmin) && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 glass rounded-2xl p-6"
          >
            <h3 className="font-semibold mb-4">Quick Access</h3>
            <div className="flex flex-wrap gap-3">
              {isVendor && (
                <Button className="btn-press gap-2" asChild>
                  <Link to="/vendor">
                    <Store className="w-4 h-4" /> Vendor Dashboard
                  </Link>
                </Button>
              )}
              {isAdmin && (
                <Button className="btn-press gap-2" asChild>
                  <Link to="/admin">
                    <User className="w-4 h-4" /> Admin Dashboard
                  </Link>
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
}
