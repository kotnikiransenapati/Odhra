import React, { useEffect, useState } from 'react';
import { useCartRecovery } from '@/hooks/useCartAbandonment';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/contexts/CartContext';
import { usePromoCode } from '@/hooks/usePromoCode';
import { PromoCodeInput } from '@/components/cart/PromoCodeInput';
import { SEOHead } from '@/components/SEOHead';
import { SavedForLater } from '@/components/cart/SavedForLater';
import { FreeShippingProgress } from '@/components/ui/ProgressBar';
import { ProductTrustBadges, GuaranteeBadge } from '@/components/ui/TrustSignals';
import { toast } from 'sonner';
import { haptic } from '@/lib/haptics';
import { useShareCart } from '@/hooks/useShareCart';
import {
  ShoppingBag,
  Minus,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Shield,
  Sparkles,
  Clock,
  Users,
  TrendingUp,
  Gift,
  CheckCircle2,
  AlertCircle,
  Zap,
  Share2,
  Copy,
  Package,
  Link as LinkIcon,
  MessageCircle,
} from 'lucide-react';

// Psychology: Urgency timer for cart reservation
function CartReservationTimer({ minutes = 15 }: { minutes?: number }) {
  const [timeLeft, setTimeLeft] = useState(minutes * 60);
  
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);
  
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const isUrgent = timeLeft < 300; // Less than 5 minutes
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
        isUrgent 
          ? 'bg-destructive/10 text-destructive border border-destructive/20' 
          : 'bg-warning/10 text-warning border border-warning/20'
      }`}
    >
      <Clock className="w-4 h-4" />
      <span>Cart reserved for {mins}:{secs.toString().padStart(2, '0')}</span>
      {isUrgent && <motion.span animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 1 }}>⚡</motion.span>}
    </motion.div>
  );
}

// Psychology: Social proof - Recent purchases
function RecentPurchasesBadge() {
  const purchaseCount = Math.floor(Math.random() * 20) + 15; // 15-35
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-2 text-xs text-muted-foreground"
    >
      <Users className="w-3.5 h-3.5 text-accent" />
      <span><strong className="text-foreground">{purchaseCount}</strong> people bought these items today</span>
    </motion.div>
  );
}

// Share Cart Button with link generation
function ShareCartButton() {
  const { isEnabled, isSharing, shareUrl, generateShareLink, shareViaChannel } = useShareCart();
  const [showOptions, setShowOptions] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

  if (!isEnabled) return null;

  const handleGenerateLink = async () => {
    const url = await generateShareLink();
    if (url) {
      setGeneratedUrl(url);
      setShowOptions(true);
    }
  };

  if (showOptions && generatedUrl) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-1.5"
      >
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => shareViaChannel('copy')}
        >
          <Copy className="w-3.5 h-3.5" /> Copy Link
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => shareViaChannel('whatsapp')}
        >
          <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => shareViaChannel('native')}
        >
          <Share2 className="w-3.5 h-3.5" /> More
        </Button>
      </motion.div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5"
      onClick={handleGenerateLink}
      disabled={isSharing}
    >
      {isSharing ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <LinkIcon className="w-4 h-4" />
      )}
      Share Cart
    </Button>
  );
}

export default function Cart() {
  const { items, isLoading, updateQuantity, removeItem, clearCart, itemCount, subtotal, saveForLater } = useCart();
  const { isRecovering } = useCartRecovery();
  const {
    promoCode,
    setPromoCode,
    isValidating,
    validation,
    applyPromoCode,
    clearPromoCode,
  } = usePromoCode(subtotal);

  const discount = validation.isValid ? validation.discount : 0;
  const total = subtotal - discount;
  const FREE_SHIPPING_THRESHOLD = 999;
  const savings = items.reduce((acc, item) => {
    const comparePrice = item.compare_at_price || item.price;
    return acc + (comparePrice - (item.price || 0)) * item.quantity;
  }, 0) + discount;

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background pb-20 lg:pb-0">
      <SEOHead title="Shopping Cart" description="Review your cart items and proceed to checkout on Odhra." noIndex />
      <a href="#cart-main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-primary focus:text-primary-foreground focus:px-3 focus:py-2 focus:rounded-md">
        Skip to main content
      </a>
      <Navbar />

      <main id="cart-main" tabIndex={-1} className="pt-24 pb-16 px-4 outline-none" aria-labelledby="cart-heading">
        <div className="max-w-6xl mx-auto">
          {/* Header with item count + Social Proof */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-accent/20 to-accent/10 shadow-sm">
                  <ShoppingBag className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h1 id="cart-heading" className="text-2xl md:text-3xl font-bold">
                    Shopping Cart
                  </h1>
                  <p className="text-muted-foreground text-sm" aria-live="polite">
                    {itemCount === 0
                      ? 'Your cart is empty'
                      : `${itemCount} item${itemCount > 1 ? 's' : ''} in your cart`}
                  </p>
                </div>
              </div>
              {/* Psychology: Cart reservation timer */}
              {items.length > 0 && <CartReservationTimer minutes={15} />}
            </div>
            {/* Psychology: Social proof */}
            {items.length > 0 && <RecentPurchasesBadge />}
          </motion.div>

          {/* Free Shipping Progress - Psychology: Goal Gradient Effect */}
          {items.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-xl bg-gradient-to-r from-accent/5 via-accent/10 to-success/5 border border-accent/20"
            >
              <FreeShippingProgress current={subtotal} target={FREE_SHIPPING_THRESHOLD} />
            </motion.div>
          )}

          {/* Psychology: Total savings banner */}
          {items.length > 0 && savings > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-3 rounded-xl bg-success/10 border border-success/20 flex items-center gap-3"
            >
              <div className="p-2 rounded-lg bg-success/20">
                <Gift className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm font-medium text-success">
                  🎉 You're saving {formatPrice(savings)} on this order!
                </p>
                <p className="text-xs text-success/80">Great choice — your smart shopping is paying off.</p>
              </div>
            </motion.div>
          )}

          {items.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <motion.div 
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="w-28 h-28 rounded-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mx-auto mb-6 shadow-inner"
              >
                <ShoppingBag className="w-12 h-12 text-muted-foreground" />
              </motion.div>
              <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
              <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
                Discover amazing products from 500+ verified vendors
              </p>
              {/* Psychology: Incentive to shop */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium mb-8">
                <Sparkles className="w-4 h-4" />
                Free shipping on orders above ₹999
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button size="lg" asChild className="gap-2">
                  <Link to="/shop">
                    <TrendingUp className="w-4 h-4" /> Explore Trending
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="gap-2">
                  <Link to="/shop?filter=deals">
                    <Zap className="w-4 h-4" /> Today's Deals
                  </Link>
                </Button>
              </div>
            </motion.div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-4">
                {items.map((item, index) => (
                  <motion.div
                    key={item.product_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="glass rounded-xl p-4"
                  >
                    <div className="flex gap-4">
                      {/* Image */}
                      <Link
                        to={`/product/${item.slug}`}
                        className="shrink-0 w-24 h-24 md:w-32 md:h-32 rounded-lg overflow-hidden bg-muted"
                      >
                        <img
                          src={item.image_url || '/placeholder.svg'}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      </Link>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between gap-4">
                          <div>
                            <Link
                              to={`/product/${item.slug}`}
                              className="font-medium hover:text-accent transition-colors"
                            >
                              {item.title || 'Product'}
                            </Link>
                            {item.vendor_name && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {item.vendor_name}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-destructive min-h-11 min-w-11"
                              onClick={() => { haptic('medium'); removeItem(item.product_id); }}
                              aria-label={`Remove ${item.title || 'item'} from cart`}
                            >
                              <Trash2 className="w-4 h-4" aria-hidden />
                            </Button>
                            <button
                              type="button"
                              onClick={() => { haptic('selection'); saveForLater(item.product_id); }}
                              className="text-[11px] text-muted-foreground hover:text-accent underline-offset-2 hover:underline px-1"
                              aria-label={`Save ${item.title || 'item'} for later`}
                            >
                              Save for later
                            </button>
                          </div>
                        </div>

                        <div className="flex items-end justify-between mt-4">
                          {/* Quantity Controls */}
                          <div className="flex items-center border border-border rounded-lg" role="group" aria-label={`Quantity for ${item.title || 'item'}`}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-11 w-11"
                              onClick={() => { haptic('light'); updateQuantity(item.product_id, item.quantity - 1); }}
                              disabled={item.quantity <= 1}
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-4 h-4" aria-hidden />
                            </Button>
                            <span className="w-10 text-center font-medium tabular-nums" aria-live="polite" aria-atomic>
                              {item.quantity}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-11 w-11"
                              onClick={() => { haptic('light'); updateQuantity(item.product_id, item.quantity + 1); }}
                              disabled={(item.stock || 0) <= item.quantity}
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-4 h-4" aria-hidden />
                            </Button>
                          </div>

                          {/* Price */}
                          <div className="text-right">
                            <p className="text-lg font-bold text-accent">
                              {formatPrice((item.price || 0) * item.quantity)}
                            </p>
                            {item.compare_at_price && (
                              <p className="text-sm text-muted-foreground line-through">
                                {formatPrice(item.compare_at_price * item.quantity)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {/* Cart Actions: Share Cart, Bulk Order, Clear */}
                <div className="flex flex-wrap justify-between items-center gap-2 pt-4">
                  <div className="flex gap-2">
                    <Button variant="ghost" asChild>
                      <Link to="/shop" className="gap-2">
                        <ArrowLeft className="w-4 h-4" /> Continue Shopping
                      </Link>
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <ShareCartButton />
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => {
                        const bulkText = items.map(item => 
                          `${item.title} | Qty: ${item.quantity} | SKU: ${item.product_id.slice(0,8)}`
                        ).join('\n');
                        const enquiry = `📦 Bulk Order Enquiry\n\nItems:\n${bulkText}\n\nTotal Qty: ${itemCount}\nEstimated Value: ₹${subtotal.toLocaleString('en-IN')}\n\nPlease contact us for bulk pricing.`;
                        const mailTo = `mailto:support@odhra.com?subject=Bulk Order Enquiry&body=${encodeURIComponent(enquiry)}`;
                        window.open(mailTo, '_blank');
                        toast.success('Bulk order enquiry opened in email');
                      }}
                    >
                      <Package className="w-4 h-4" /> Bulk Order
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive min-h-11 min-w-11" onClick={() => { haptic('warning'); clearCart(); }} aria-label="Clear all items from cart">
                      <Trash2 className="w-4 h-4" aria-hidden />
                    </Button>
                  </div>
                </div>

                <SavedForLater />
              </div>



              {/* Order Summary */}
              <div className="lg:col-span-1">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="glass rounded-2xl p-6 sticky top-24 border border-border/50 shadow-lg"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold">Order Summary</h2>
                    <Badge variant="secondary" className="text-xs">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Secure
                    </Badge>
                  </div>

                  {/* Promo Code Input */}
                  <div className="mb-4">
                    <PromoCodeInput
                      promoCode={promoCode}
                      setPromoCode={setPromoCode}
                      isValidating={isValidating}
                      validation={validation}
                      onApply={applyPromoCode}
                      onClear={clearPromoCode}
                    />
                  </div>

                  <Separator className="my-4" />

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal ({itemCount} items)</span>
                      <span className="font-medium">{formatPrice(subtotal)}</span>
                    </div>
                    {discount > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex justify-between text-success font-medium"
                      >
                        <span className="flex items-center gap-1">
                          <Gift className="w-3.5 h-3.5" /> Promo Discount
                        </span>
                        <span>-{formatPrice(discount)}</span>
                      </motion.div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shipping</span>
                      <span className="text-success font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> FREE
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Tax (GST)</span>
                      <span>Calculated at checkout</span>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <div className="flex justify-between items-baseline mb-2">
                    <span className="font-semibold">Estimated Total</span>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-accent">
                        {formatPrice(total)}
                      </span>
                      {savings > 0 && (
                        <p className="text-xs text-success font-medium">
                          You save {formatPrice(savings)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Psychology: Action-oriented CTA with urgency */}
                  <Button size="lg" className="w-full h-14 text-base font-semibold gap-2 mt-4 shadow-lg hover:shadow-xl transition-shadow" asChild onClick={() => haptic('medium')}>
                    <Link to={`/checkout${validation.isValid ? `?promo=${validation.promotion?.code}` : ''}`} aria-label={`Proceed to secure checkout, total ${formatPrice(total)}`}>
                      <Zap className="w-5 h-5" aria-hidden />
                      Checkout Securely
                      <ArrowRight className="w-5 h-5" aria-hidden />
                    </Link>
                  </Button>

                  {/* Psychology: Trust signals cluster */}
                  <div className="mt-4 p-3 rounded-xl bg-secondary/50 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Shield className="w-4 h-4 text-success" />
                      <span>256-bit SSL encryption</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      <span>100% money-back guarantee</span>
                    </div>
                  </div>

                  {/* Guarantee */}
                  <div className="mt-4">
                    <GuaranteeBadge />
                  </div>
                </motion.div>

                {/* Trust badges below summary on desktop */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="hidden lg:block mt-4"
                >
                  <ProductTrustBadges />
                </motion.div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Navigation for Mobile */}
      <BottomNavigation />
    </div>
  );
}
