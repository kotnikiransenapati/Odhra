import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOrders, useOrdersCount } from '@/hooks/useOrders';
import { useWishlistCount } from '@/hooks/useWishlist';
import { useLoyaltyPoints } from '@/hooks/useLoyalty';
import { Navbar } from '@/components/layout/Navbar';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { haptic } from '@/lib/haptics';
import { CustomerInsightsPulse } from '@/components/customer/CustomerInsightsPulse';
import { PriceWatchPanel } from '@/components/customer/PriceWatchPanel';
import { SavedSearchesPanel } from '@/components/customer/SavedSearchesPanel';
import { DefaultAddressQuickSwitcher } from '@/components/customer/DefaultAddressQuickSwitcher';
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
  Truck,
  Share2,
  Sparkles,
  ShieldCheck,
  LogOut,
  HelpCircle,
} from 'lucide-react';

const TIER_THRESHOLDS: Record<string, number> = {
  bronze: 0,
  silver: 500,
  gold: 2000,
  platinum: 5000,
  diamond: 10000,
};

const TIER_NEXT: Record<string, string | null> = {
  bronze: 'silver',
  silver: 'gold',
  gold: 'platinum',
  platinum: 'diamond',
  diamond: null,
};

const TIER_STYLES: Record<string, string> = {
  bronze: 'from-amber-700/20 to-amber-500/10 text-amber-700 dark:text-amber-300',
  silver: 'from-slate-400/20 to-slate-300/10 text-slate-700 dark:text-slate-200',
  gold: 'from-yellow-500/20 to-amber-300/10 text-yellow-700 dark:text-yellow-300',
  platinum: 'from-cyan-400/20 to-indigo-300/10 text-cyan-700 dark:text-cyan-300',
  diamond: 'from-fuchsia-500/20 to-violet-400/10 text-fuchsia-700 dark:text-fuchsia-300',
};

interface MenuItem {
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

const MENU_GROUPS: MenuGroup[] = [
  {
    title: 'Orders & Returns',
    items: [
      { label: 'My Orders', desc: 'Track, return, or buy again', icon: ShoppingBag, href: '/orders' },
      { label: 'My Returns', desc: 'Track refund & return requests', icon: RotateCcw, href: '/account/returns' },
      { label: 'My Subscriptions', desc: 'Manage recurring deliveries', icon: RefreshCw, href: '/account/subscriptions' },
    ],
  },
  {
    title: 'Rewards & Wallet',
    items: [
      { label: 'Rewards Center', desc: 'Points, badges & referrals', icon: Trophy, href: '/account/rewards' },
      { label: 'My Wallet', desc: 'Coupons & spin wheel rewards', icon: CreditCard, href: '/wallet' },
      { label: 'Wishlist', desc: 'Your saved items', icon: Heart, href: '/wishlist' },
      { label: 'My Analytics', desc: 'Shopping insights & trends', icon: Package, href: '/analytics' },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { label: 'Addresses', desc: 'Manage delivery addresses', icon: MapPin, href: '/addresses' },
      { label: 'Notifications', desc: 'Email, push & WhatsApp prefs', icon: Bell, href: '/account/notifications' },
      { label: 'Help & Support', desc: 'Chat with us or raise a ticket', icon: HelpCircle, href: '/account/support' },
    ],
  },
  {
    title: 'Account & Security',
    items: [
      { label: 'Account Settings', desc: 'Profile, password & privacy', icon: Settings, href: '/settings' },
      { label: 'Security & 2FA', desc: 'Two-factor & active sessions', icon: ShieldCheck, href: '/settings?tab=security' },
    ],
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 400, damping: 30 } },
};

export default function CustomerAccount() {
  const { user, isVendor, isAdmin, signOut } = useAuth();
  const { data: ordersCount = 0 } = useOrdersCount();
  const { data: wishlistCount = 0 } = useWishlistCount();
  const { data: loyalty } = useLoyaltyPoints();
  const { data: orders = [] } = useOrders();

  const latestOrder = orders[0];
  const latestActive = useMemo(
    () => orders.find((o) => ['pending', 'paid', 'processing', 'shipped', 'out_for_delivery'].includes(o.status)),
    [orders]
  );

  const tier = loyalty?.tier || 'bronze';
  const points = loyalty?.points ?? 0;
  const nextTier = TIER_NEXT[tier];
  const nextThreshold = nextTier ? TIER_THRESHOLDS[nextTier] : TIER_THRESHOLDS[tier];
  const currentThreshold = TIER_THRESHOLDS[tier];
  const tierProgress = nextTier
    ? Math.min(100, Math.max(0, ((points - currentThreshold) / (nextThreshold - currentThreshold)) * 100))
    : 100;
  const pointsToNext = nextTier ? Math.max(0, nextThreshold - points) : 0;

  const getInitials = (name?: string | null, email?: string) => {
    if (name) return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
    return email?.charAt(0).toUpperCase() || 'U';
  };

  const fullName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there';
  const memberSince = user?.created_at ? new Date(user.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : null;

  return (
    <div className="min-h-dvh bg-background">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 pt-24 pb-24 sm:pt-28">
        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 px-1"
        >
          <p className="text-sm text-muted-foreground">Welcome back,</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Hi, {fullName.split(' ')[0]} 👋</h1>
        </motion.div>

        {/* Hero card with tier + points */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className={`relative overflow-hidden rounded-3xl p-5 sm:p-6 mb-6 bg-gradient-to-br ${TIER_STYLES[tier]} border border-border/40`}
          aria-label="Membership summary"
        >
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <div className="relative">
              <Avatar className="w-20 h-20 sm:w-24 sm:h-24 border-4 border-background/60 shadow-lg">
                <AvatarImage src={user?.user_metadata?.avatar_url} alt={fullName} />
                <AvatarFallback className="text-xl font-bold bg-accent/10 text-accent">
                  {getInitials(user?.user_metadata?.full_name, user?.email)}
                </AvatarFallback>
              </Avatar>
              <Badge className="absolute -bottom-1 left-1/2 -translate-x-1/2 capitalize text-[10px] px-2 py-0.5 bg-background/90 text-foreground border border-border/50 shadow-sm">
                <Sparkles className="w-3 h-3 mr-1" /> {tier}
              </Badge>
            </div>

            <div className="flex-1 text-center sm:text-left w-full">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-1">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold leading-tight">{fullName}</h2>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
                <div className="text-center sm:text-right">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Points</p>
                  <p className="text-2xl font-bold tabular-nums">{points.toLocaleString('en-IN')}</p>
                </div>
              </div>

              {nextTier ? (
                <div className="mt-3" aria-label={`${pointsToNext} points to ${nextTier}`}>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                    <span className="capitalize">{tier}</span>
                    <span>{pointsToNext.toLocaleString('en-IN')} pts to <span className="capitalize font-medium text-foreground">{nextTier}</span></span>
                  </div>
                  <Progress value={tierProgress} className="h-2" />
                </div>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">You've reached the top tier ✨</p>
              )}

              <div className="flex flex-wrap gap-2 justify-center sm:justify-start mt-4">
                <Button variant="outline" size="sm" className="btn-press h-9" asChild onClick={() => haptic('light')}>
                  <Link to="/settings">
                    <Settings className="w-4 h-4 mr-1.5" aria-hidden /> Edit profile
                  </Link>
                </Button>
                <Button variant="outline" size="sm" className="btn-press h-9" asChild onClick={() => haptic('light')}>
                  <Link to="/account/rewards">
                    <Trophy className="w-4 h-4 mr-1.5" aria-hidden /> View rewards
                  </Link>
                </Button>
                {!isVendor && !isAdmin && (
                  <Button variant="outline" size="sm" className="btn-press h-9" asChild onClick={() => haptic('light')}>
                    <Link to="/become-vendor">
                      <Store className="w-4 h-4 mr-1.5" aria-hidden /> Become a seller
                    </Link>
                  </Button>
                )}
              </div>
              {memberSince && (
                <p className="mt-3 text-[11px] text-muted-foreground">Member since {memberSince}</p>
              )}
            </div>
          </div>
        </motion.section>

        {/* Smart action row */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8"
          aria-label="Quick actions"
        >
          {latestActive ? (
            <motion.div variants={itemVariants}>
              <Link
                to={`/account/orders/${latestActive.id}/tracking`}
                onClick={() => haptic('selection')}
                className="card-interactive glass rounded-2xl p-4 flex flex-col gap-1.5 h-full group"
              >
                <Truck className="w-5 h-5 text-accent group-hover:scale-110 transition-transform" />
                <p className="text-xs text-muted-foreground">Track order</p>
                <p className="text-sm font-semibold truncate">#{latestActive.order_number}</p>
                <p className="text-[11px] text-accent capitalize">{latestActive.status.replace('_', ' ')}</p>
              </Link>
            </motion.div>
          ) : (
            <motion.div variants={itemVariants}>
              <Link to="/shop" onClick={() => haptic('selection')} className="card-interactive glass rounded-2xl p-4 flex flex-col gap-1.5 h-full">
                <ShoppingBag className="w-5 h-5 text-accent" />
                <p className="text-xs text-muted-foreground">Start shopping</p>
                <p className="text-sm font-semibold">Explore deals</p>
              </Link>
            </motion.div>
          )}

          {latestOrder && (
            <motion.div variants={itemVariants}>
              <Link
                to={`/account/orders/${latestOrder.id}`}
                onClick={() => haptic('selection')}
                className="card-interactive glass rounded-2xl p-4 flex flex-col gap-1.5 h-full group"
              >
                <RefreshCw className="w-5 h-5 text-accent group-hover:rotate-180 transition-transform duration-500" />
                <p className="text-xs text-muted-foreground">Buy again</p>
                <p className="text-sm font-semibold truncate">Last order</p>
                <p className="text-[11px] text-muted-foreground">₹{latestOrder.total_amount.toLocaleString('en-IN')}</p>
              </Link>
            </motion.div>
          )}

          <motion.div variants={itemVariants}>
            <Link to="/account/rewards" onClick={() => haptic('selection')} className="card-interactive glass rounded-2xl p-4 flex flex-col gap-1.5 h-full">
              <Share2 className="w-5 h-5 text-accent" />
              <p className="text-xs text-muted-foreground">Refer & earn</p>
              <p className="text-sm font-semibold">Invite friends</p>
              <p className="text-[11px] text-accent">+100 pts</p>
            </Link>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Link to="/spin-to-win" onClick={() => haptic('selection')} className="card-interactive glass rounded-2xl p-4 flex flex-col gap-1.5 h-full">
              <Gift className="w-5 h-5 text-accent" />
              <p className="text-xs text-muted-foreground">Daily reward</p>
              <p className="text-sm font-semibold">Spin to win</p>
              <p className="text-[11px] text-accent">Free spin</p>
            </Link>
          </motion.div>
        </motion.section>

        {/* Stats strip */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-4 gap-2 sm:gap-3 mb-8"
          aria-label="Account stats"
        >
          {[
            { label: 'Orders', value: ordersCount, icon: Package, href: '/orders' },
            { label: 'Wishlist', value: wishlistCount, icon: Heart, href: '/wishlist' },
            { label: 'Points', value: points, icon: Trophy, href: '/account/rewards' },
            { label: 'Wallet', value: '→', icon: Gift, href: '/wallet' },
          ].map((stat) => (
            <motion.div key={stat.label} variants={itemVariants}>
              <Link
                to={stat.href}
                onClick={() => haptic('light')}
                className="card-interactive glass rounded-xl p-3 text-center block group"
                aria-label={`${stat.label}: ${stat.value}`}
              >
                <stat.icon className="w-5 h-5 text-accent mx-auto mb-1 group-hover:scale-110 transition-transform" aria-hidden />
                <p className="text-base sm:text-lg font-bold tabular-nums">
                  {typeof stat.value === 'number' ? stat.value.toLocaleString('en-IN') : stat.value}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">{stat.label}</p>
              </Link>
            </motion.div>
          ))}
        </motion.section>

        {/* Pulse + Price drop watch */}
        <div className="space-y-6 mb-8">
          <CustomerInsightsPulse />
          <PriceWatchPanel />
        </div>

        {/* Grouped menu */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-6"
        >
          {MENU_GROUPS.map((group) => (
            <section key={group.title} aria-labelledby={`grp-${group.title}`}>
              <h2
                id={`grp-${group.title}`}
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-2"
              >
                {group.title}
              </h2>
              <div className="space-y-2">
                {group.items.map((item) => (
                  <motion.div key={item.label} variants={itemVariants}>
                    <Link
                      to={item.href}
                      onClick={() => haptic('light')}
                      className="card-interactive glass rounded-xl p-3.5 flex items-center gap-3 group min-h-[64px]"
                    >
                      <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors shrink-0">
                        <item.icon className="w-5 h-5 text-accent group-hover:scale-110 transition-transform" aria-hidden />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium group-hover:text-accent transition-colors">{item.label}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.desc}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0" aria-hidden />
                    </Link>
                  </motion.div>
                ))}
              </div>
            </section>
          ))}
        </motion.div>

        {/* Vendor / Admin quick access */}
        {(isVendor || isAdmin) && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8 glass rounded-2xl p-5"
            aria-label="Staff quick access"
          >
            <h2 className="font-semibold mb-3">Staff Quick Access</h2>
            <div className="flex flex-wrap gap-2">
              {isVendor && (
                <Button className="btn-press gap-2" asChild onClick={() => haptic('medium')}>
                  <Link to="/vendor"><Store className="w-4 h-4" aria-hidden /> Vendor Dashboard</Link>
                </Button>
              )}
              {isAdmin && (
                <Button className="btn-press gap-2" asChild onClick={() => haptic('medium')}>
                  <Link to="/admin"><User className="w-4 h-4" aria-hidden /> Admin Dashboard</Link>
                </Button>
              )}
            </div>
          </motion.section>
        )}

        {/* Sign out */}
        <div className="mt-8 flex justify-center">
          <Button
            variant="ghost"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => {
              haptic('warning');
              signOut();
            }}
          >
            <LogOut className="w-4 h-4 mr-2" aria-hidden /> Sign out
          </Button>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}
