import React from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Loader2, ArrowLeft, ShoppingBag } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { WishlistCard } from '@/components/wishlist/WishlistCard';
import { useWishlist } from '@/hooks/useWishlist';
import { useAuth } from '@/contexts/AuthContext';

export default function Wishlist() {
  const { user } = useAuth();
  const { data: wishlistItems, isLoading } = useWishlist();

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-16 px-4">
          <div className="max-w-lg mx-auto text-center">
            <Heart className="w-16 h-16 mx-auto text-muted-foreground/30 mb-6" />
            <h1 className="text-2xl font-bold mb-4">Sign in to view your wishlist</h1>
            <p className="text-muted-foreground mb-6">
              Save your favorite products and access them from any device
            </p>
            <Button asChild size="lg">
              <Link to="/auth">Sign In</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-24 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Button variant="ghost" asChild className="mb-4">
              <Link to="/shop" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Continue Shopping
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                <Heart className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">My Wishlist</h1>
                <p className="text-muted-foreground">
                  {wishlistItems?.length || 0} saved item{(wishlistItems?.length || 0) !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Content */}
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
          ) : wishlistItems && wishlistItems.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              <AnimatePresence>
                {wishlistItems.map((item) => (
                  <WishlistCard key={item.id} item={item} />
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <Heart className="w-20 h-20 mx-auto text-muted-foreground/20 mb-6" />
              <h2 className="text-xl font-semibold mb-3">Your wishlist is empty</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Start adding products you love by clicking the heart icon on any product
              </p>
              <Button asChild size="lg" className="gap-2">
                <Link to="/shop">
                  <ShoppingBag className="w-5 h-5" />
                  Explore Products
                </Link>
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
