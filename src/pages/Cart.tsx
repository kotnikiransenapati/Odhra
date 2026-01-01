import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/contexts/CartContext';
import { usePromoCode } from '@/hooks/usePromoCode';
import { PromoCodeInput } from '@/components/cart/PromoCodeInput';
import {
  ShoppingBag,
  Minus,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Loader2,
} from 'lucide-react';

export default function Cart() {
  const { items, isLoading, updateQuantity, removeItem, clearCart, itemCount, subtotal } = useCart();
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
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-24 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-display-sm md:text-display-md font-bold mb-2">
              Shopping Cart
            </h1>
            <p className="text-muted-foreground">
              {itemCount === 0
                ? 'Your cart is empty'
                : `${itemCount} item${itemCount > 1 ? 's' : ''} in your cart`}
            </p>
          </motion.div>

          {items.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                <ShoppingBag className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
              <p className="text-muted-foreground mb-8">
                Discover our products and add them to your cart.
              </p>
              <Button size="lg" asChild>
                <Link to="/shop" className="gap-2">
                  <ArrowLeft className="w-4 h-4" /> Continue Shopping
                </Link>
              </Button>
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
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => removeItem(item.product_id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="flex items-end justify-between mt-4">
                          {/* Quantity Controls */}
                          <div className="flex items-center border border-border rounded-lg">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9"
                              onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                            <span className="w-10 text-center font-medium">
                              {item.quantity}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9"
                              onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                              disabled={(item.stock || 0) <= item.quantity}
                            >
                              <Plus className="w-4 h-4" />
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

                {/* Clear Cart */}
                <div className="flex justify-between items-center pt-4">
                  <Button variant="ghost" asChild>
                    <Link to="/shop" className="gap-2">
                      <ArrowLeft className="w-4 h-4" /> Continue Shopping
                    </Link>
                  </Button>
                  <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={clearCart}>
                    Clear Cart
                  </Button>
                </div>
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="glass rounded-xl p-6 sticky top-24"
                >
                  <h2 className="text-lg font-semibold mb-4">Order Summary</h2>

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
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-success">
                        <span>Discount</span>
                        <span>-{formatPrice(discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shipping</span>
                      <span className="text-green-500">Free</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax</span>
                      <span>Calculated at checkout</span>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <div className="flex justify-between items-center mb-6">
                    <span className="font-semibold">Total</span>
                    <span className="text-2xl font-bold text-accent">
                      {formatPrice(total)}
                    </span>
                  </div>

                  <Button size="lg" className="w-full gap-2" asChild>
                    <Link to={`/checkout${validation.isValid ? `?promo=${validation.promotion?.code}` : ''}`}>
                      Proceed to Checkout <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>

                  <p className="text-xs text-muted-foreground text-center mt-4">
                    Secure checkout powered by Razorpay
                  </p>
                </motion.div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
