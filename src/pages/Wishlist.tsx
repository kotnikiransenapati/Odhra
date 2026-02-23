import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Loader2, ArrowLeft, ShoppingBag, Sparkles, Gift, TrendingDown, Share2, Copy, Check } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { Button } from '@/components/ui/button';
import { WishlistCard } from '@/components/wishlist/WishlistCard';
import { useWishlist } from '@/hooks/useWishlist';
import { useWishlistPriceDrops } from '@/hooks/usePriceAlerts';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function Wishlist() {
  const { user } = useAuth();
  const { data: wishlistItems, isLoading } = useWishlist();
  const { data: priceDrops } = useWishlistPriceDrops();
  const [copied, setCopied] = useState(false);

  const handleShareWishlist = async () => {
    if (!wishlistItems || wishlistItems.length === 0) return;
    const itemNames = wishlistItems.slice(0, 5).map(i => `• ${(i as any).products?.title || 'Product'}`).join('\n');
    const text = `Check out my wishlist on Odhra!\n\n${itemNames}${wishlistItems.length > 5 ? `\n...and ${wishlistItems.length - 5} more` : ''}\n\nhttps://odhra1.lovable.app/shop`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'My Odhra Wishlist', text });
      } catch {}
    } else {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Wishlist link copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-20 lg:pb-0">
        <Navbar />
        <div className="pt-24 pb-16 px-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-lg mx-auto text-center"
          >
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 bg-destructive/20 rounded-full blur-xl animate-pulse" />
              <div className="relative w-full h-full rounded-full bg-gradient-to-br from-destructive/10 to-accent/10 flex items-center justify-center">
                <Heart className="w-12 h-12 text-destructive" />
              </div>
            </div>
            <h1 className="text-2xl font-bold mb-4">Sign in to view your wishlist</h1>
            <p className="text-muted-foreground mb-6">
              Save your favorite products and access them from any device. Never miss a deal!
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg" className="gap-2 btn-press">
                <Link to="/auth">
                  <Sparkles className="w-4 h-4" />
                  Sign In
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="btn-press">
                <Link to="/shop">
                  Explore Products
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <Navbar />

      <div className="pt-24 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header with back button */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Button variant="ghost" asChild className="mb-4 btn-press">
              <Link to="/shop" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Continue Shopping
              </Link>
            </Button>
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-destructive/20 to-accent/20 flex items-center justify-center">
                  <Heart className="w-7 h-7 text-destructive" />
                </div>
                {wishlistItems && wishlistItems.length > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-accent-foreground text-xs font-bold rounded-full flex items-center justify-center">
                    {wishlistItems.length}
                  </div>
                )}
              </div>
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">Your Collection</h1>
                <p className="text-muted-foreground">
                  {wishlistItems?.length || 0} saved item{(wishlistItems?.length || 0) !== 1 ? 's' : ''} • Reserved just for you
                </p>
              </div>
              {wishlistItems && wishlistItems.length > 0 && (
                <Button variant="outline" size="sm" className="gap-2 ml-auto" onClick={handleShareWishlist}>
                  {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Share'}
                </Button>
              )}
            </div>
            </div>
          </motion.div>

          {/* Content */}
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
          ) : wishlistItems && wishlistItems.length > 0 ? (
            <>
              {/* Price drop alerts */}
              {priceDrops && priceDrops.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 rounded-xl bg-success/10 border border-success/20"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="w-5 h-5 text-success" />
                    <h3 className="text-sm font-bold text-success">
                      Price Drops on {priceDrops.length} item{priceDrops.length > 1 ? 's' : ''}!
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {priceDrops.slice(0, 3).map(drop => (
                      <Link
                        key={drop.productId}
                        to={`/product/${drop.slug}`}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-success/10 transition-colors"
                      >
                        <img src={drop.imageUrl} alt={drop.title} className="w-10 h-10 rounded-lg object-cover" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{drop.title}</p>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-bold text-accent">₹{drop.currentPrice.toLocaleString()}</span>
                            <span className="line-through text-muted-foreground">₹{drop.previousPrice.toLocaleString()}</span>
                            <span className="text-success font-semibold">-{drop.dropPercent}%</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Psychology: Incentive to buy */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 rounded-xl bg-gradient-to-r from-accent/5 to-accent/10 border border-accent/20 flex items-center gap-3"
              >
                <Gift className="w-5 h-5 text-accent shrink-0" />
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">These items are reserved for you!</span> Add to cart before they sell out.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-3"
              >
                <AnimatePresence>
                  {wishlistItems.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <WishlistCard item={item} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 bg-muted rounded-full blur-xl" />
                <div className="relative w-full h-full rounded-full bg-muted flex items-center justify-center">
                  <Heart className="w-10 h-10 text-muted-foreground/30" />
                </div>
              </div>
              <h2 className="text-xl font-semibold mb-3">Your wishlist is empty</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Start adding products you love by clicking the heart icon on any product. We'll keep them safe for you!
              </p>
              <Button asChild size="lg" className="gap-2 btn-press">
                <Link to="/shop">
                  <ShoppingBag className="w-5 h-5" />
                  Explore Products
                </Link>
              </Button>
            </motion.div>
          )}
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
}
