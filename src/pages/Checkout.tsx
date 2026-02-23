import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useCart } from '@/contexts/CartContext';
import { useCheckout, ShippingAddress, PromoInfo } from '@/hooks/useCheckout';
import { CheckoutProgress } from '@/components/ui/ProgressBar';
import { useStockValidation } from '@/hooks/useStockValidation';
import { useAuth } from '@/contexts/AuthContext';
import { usePromoCode } from '@/hooks/usePromoCode';
import { PromoCodeInput } from '@/components/cart/PromoCodeInput';
import { AddressBookPicker } from '@/components/checkout/AddressBookPicker';
import { useShippingCost, getEstimatedDeliveryDate, formatDeliveryDate } from '@/hooks/useShippingCost';
import {
  ArrowLeft,
  CreditCard,
  Loader2,
  MapPin,
  Package,
  ShieldCheck,
  ChevronDown,
  BookMarked,
  AlertTriangle,
  CheckCircle2,
  Gift,
  Users,
  Clock,
  Zap,
  Truck,
  Banknote,
  Wallet,
  CalendarDays,
} from 'lucide-react';
import { toast } from 'sonner';

const addressSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit phone number'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  address_line1: z.string().min(5, 'Address must be at least 5 characters'),
  address_line2: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  pincode: z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit pincode'),
  country: z.string().default('India'),
  customer_note: z.string().optional(),
});

type AddressFormValues = z.infer<typeof addressSchema>;

export default function Checkout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { items, isLoading: cartLoading, removeItem } = useCart();
  const { initiatePayment, isLoading, subtotal, tax, total: baseTotal, orderNumber } = useCheckout();
  const { validateStock, isValidating: isValidatingStock } = useStockValidation();
  const [selectedAddressId, setSelectedAddressId] = useState<string | undefined>();
  const [showManualForm, setShowManualForm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cod'>('online');
  const [stockErrors, setStockErrors] = useState<Array<{
    product_id: string;
    title: string;
    requested: number;
    available: number;
  }>>([]);
  
  const {
    promoCode,
    setPromoCode,
    isValidating,
    validation,
    applyPromoCode,
    clearPromoCode,
  } = usePromoCode(subtotal);

  const form = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      full_name: '',
      phone: '',
      email: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
      customer_note: '',
    },
  });

  const watchedPincode = form.watch('pincode');
  const { estimate: shippingEstimate, isLoading: shippingLoading } = useShippingCost(watchedPincode, subtotal);

  // Auto-apply promo from URL
  useEffect(() => {
    const urlPromo = searchParams.get('promo');
    if (urlPromo && !promoCode) {
      setPromoCode(urlPromo);
      setTimeout(() => applyPromoCode(), 100);
    }
  }, [searchParams, promoCode, setPromoCode, applyPromoCode]);

  const discount = validation.isValid ? validation.discount : 0;
  const shippingCost = shippingEstimate?.rate || 0;
  const discountedSubtotal = subtotal - discount;
  const adjustedTax = Math.round(discountedSubtotal * 0.18);
  const total = discountedSubtotal + adjustedTax + shippingCost;
  const codExtraCharge = paymentMethod === 'cod' ? Math.round(total * 0.02) : 0;
  const finalTotal = total + codExtraCharge;

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const onSubmit = async (data: AddressFormValues) => {
    // Validate stock before payment
    const stockValidation = await validateStock(items);
    
    if (!stockValidation.isValid) {
      setStockErrors(stockValidation.invalidItems);
      toast.error('Some items are out of stock or have insufficient quantity');
      return;
    }
    
    setStockErrors([]);

    const shippingAddress: ShippingAddress = {
      full_name: data.full_name,
      phone: data.phone,
      address_line1: data.address_line1,
      address_line2: data.address_line2,
      city: data.city,
      state: data.state,
      pincode: data.pincode,
      country: data.country,
    };

    // Build promo info if a valid promo code is applied
    let promoInfo: PromoInfo | undefined;
    if (validation.isValid && validation.promotion) {
      promoInfo = {
        promotion_id: validation.promotion.id,
        promotion_code: validation.promotion.code,
        discount_amount: discount,
      };
    }

    // Guest checkout info
    const guestInfo = !user ? {
      email: data.email || '',
      phone: data.phone,
    } : undefined;

    const result = await initiatePayment(shippingAddress, data.customer_note, promoInfo, guestInfo);
    if (result.success && result.orderId) {
      // Redirect to order success page
      navigate(`/order-success/${result.orderId}?order_number=${result.orderNumber}`);
    }
  };

  const handleRemoveUnavailableItem = async (productId: string) => {
    await removeItem(productId);
    setStockErrors(prev => prev.filter(e => e.product_id !== productId));
    toast.success('Item removed from cart');
  };

  const handleSelectSavedAddress = (address: Omit<ShippingAddress, never>) => {
    form.setValue('full_name', address.full_name, { shouldValidate: true });
    form.setValue('phone', address.phone, { shouldValidate: true });
    form.setValue('address_line1', address.address_line1, { shouldValidate: true });
    form.setValue('address_line2', address.address_line2 || '', { shouldValidate: true });
    form.setValue('city', address.city, { shouldValidate: true });
    form.setValue('state', address.state, { shouldValidate: true });
    form.setValue('pincode', address.pincode, { shouldValidate: true });
    form.setValue('country', address.country, { shouldValidate: true });
    setShowManualForm(false);
    // Trigger form submission after address is selected
    form.trigger();
  };

  // Redirect to cart if empty
  if (!cartLoading && items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center h-[60vh] px-4">
          <Package className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
          <p className="text-muted-foreground mb-6">Add some products to checkout</p>
          <Button asChild>
            <Link to="/shop">Continue Shopping</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isGuest = !user;

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
            <Button variant="ghost" asChild className="mb-4">
              <Link to="/cart" className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Back to Cart
              </Link>
            </Button>
            <h1 className="text-display-sm md:text-display-md font-bold">Checkout</h1>
            <div className="mt-4">
              <CheckoutProgress currentStep="shipping" />
            </div>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Checkout Form */}
            <div className="lg:col-span-2">
              {/* Stock Validation Errors */}
              <AnimatePresence>
                {stockErrors.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-6"
                  >
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Stock Issues Detected</AlertTitle>
                      <AlertDescription>
                        <ul className="mt-2 space-y-2">
                          {stockErrors.map((error) => (
                            <li key={error.product_id} className="flex items-center justify-between">
                              <span>
                                <strong>{error.title}</strong>: 
                                {error.available === 0 
                                  ? ' Out of stock' 
                                  : ` Only ${error.available} available (you requested ${error.requested})`
                                }
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveUnavailableItem(error.product_id)}
                              >
                                Remove
                              </Button>
                            </li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  </motion.div>
                )}
              </AnimatePresence>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Shipping Address */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="w-5 h-5" /> Shipping Address
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Guest checkout banner */}
                      {isGuest && (
                        <Alert>
                          <ShieldCheck className="h-4 w-4" />
                          <AlertTitle>Guest Checkout</AlertTitle>
                          <AlertDescription className="flex items-center justify-between">
                            <span>You're checking out as a guest.</span>
                            <Button variant="link" size="sm" asChild className="p-0 h-auto">
                              <Link to="/auth?redirect=/checkout">Sign in instead</Link>
                            </Button>
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Address Book Picker (logged-in users only) */}
                      {!isGuest && (
                        <>
                          <div className="mb-4">
                            <div className="flex items-center gap-2 mb-3">
                              <BookMarked className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm font-medium">Saved Addresses</span>
                            </div>
                            <AddressBookPicker
                              selectedAddressId={selectedAddressId}
                              onAddressIdChange={setSelectedAddressId}
                              onSelectAddress={handleSelectSavedAddress}
                            />
                          </div>
                          <Separator />
                        </>
                      )}

                      {/* Manual Address Entry */}
                      <Collapsible open={showManualForm || !selectedAddressId} onOpenChange={setShowManualForm}>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" className="w-full justify-between p-0 h-auto py-2 hover:bg-transparent">
                            <span className="text-sm font-medium">
                              {selectedAddressId ? 'Edit address details' : 'Enter address manually'}
                            </span>
                            <ChevronDown className={`w-4 h-4 transition-transform ${showManualForm || !selectedAddressId ? 'rotate-180' : ''}`} />
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-4 pt-4">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="full_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name</FormLabel>
                              <FormControl>
                                <Input placeholder="John Doe" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone Number</FormLabel>
                              <FormControl>
                                <Input placeholder="9876543210" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Guest email field */}
                      {isGuest && (
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email Address</FormLabel>
                              <FormControl>
                                <Input placeholder="you@example.com" type="email" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      <FormField
                        control={form.control}
                        name="address_line1"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address Line 1</FormLabel>
                            <FormControl>
                              <Input placeholder="House/Flat No, Building Name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="address_line2"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address Line 2 (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Street, Locality" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid sm:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>City</FormLabel>
                              <FormControl>
                                <Input placeholder="Mumbai" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="state"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>State</FormLabel>
                              <FormControl>
                                <Input placeholder="Maharashtra" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="pincode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Pincode</FormLabel>
                              <FormControl>
                                <Input placeholder="400001" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="customer_note"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Order Notes (Optional)</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Any special instructions for delivery..."
                                className="resize-none"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                        </CollapsibleContent>
                      </Collapsible>
                    </CardContent>
                  </Card>

                  {/* Payment Method Selection */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Wallet className="w-5 h-5" /> Payment Method
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as 'online' | 'cod')} className="space-y-3">
                        <div className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-colors cursor-pointer ${paymentMethod === 'online' ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/40'}`}>
                          <RadioGroupItem value="online" id="online" />
                          <Label htmlFor="online" className="flex-1 cursor-pointer">
                            <div className="flex items-center gap-2">
                              <CreditCard className="w-5 h-5 text-accent" />
                              <div>
                                <p className="font-medium">Pay Online</p>
                                <p className="text-xs text-muted-foreground">UPI, Cards, Net Banking, Wallets</p>
                              </div>
                            </div>
                          </Label>
                          <CheckCircle2 className={`w-5 h-5 ${paymentMethod === 'online' ? 'text-accent' : 'text-transparent'}`} />
                        </div>
                        <div className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-colors cursor-pointer ${paymentMethod === 'cod' ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/40'}`}>
                          <RadioGroupItem value="cod" id="cod" />
                          <Label htmlFor="cod" className="flex-1 cursor-pointer">
                            <div className="flex items-center gap-2">
                              <Banknote className="w-5 h-5 text-success" />
                              <div>
                                <p className="font-medium">Cash on Delivery</p>
                                <p className="text-xs text-muted-foreground">Pay when you receive your order (+2% COD fee)</p>
                              </div>
                            </div>
                          </Label>
                          <CheckCircle2 className={`w-5 h-5 ${paymentMethod === 'cod' ? 'text-accent' : 'text-transparent'}`} />
                        </div>
                      </RadioGroup>

                      {/* Estimated Delivery */}
                      {shippingEstimate && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-4 p-3 rounded-lg bg-success/5 border border-success/20 flex items-center gap-3"
                        >
                          <CalendarDays className="w-5 h-5 text-success shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-success">
                              Estimated Delivery: {formatDeliveryDate(getEstimatedDeliveryDate(shippingEstimate.estimatedDaysMin, shippingEstimate.estimatedDaysMax).from)} - {formatDeliveryDate(getEstimatedDeliveryDate(shippingEstimate.estimatedDaysMin, shippingEstimate.estimatedDaysMax).to)}
                            </p>
                            <p className="text-xs text-muted-foreground">{shippingEstimate.rateName}</p>
                          </div>
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Order Items Preview */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="w-5 h-5" /> Order Items ({items.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {items.map((item) => (
                          <div key={item.product_id} className="flex gap-3">
                            <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                              <img
                                src={item.image_url || '/placeholder.svg'}
                                alt={item.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{item.title}</p>
                              <p className="text-sm text-muted-foreground">
                                Qty: {item.quantity}
                              </p>
                            </div>
                            <p className="font-semibold shrink-0">
                              {formatPrice((item.price || 0) * item.quantity)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Mobile Order Summary */}
                  <div className="lg:hidden">
                    <OrderSummary
                      subtotal={subtotal}
                      tax={adjustedTax}
                      total={finalTotal}
                      discount={discount}
                      shippingCost={shippingCost}
                      codCharge={codExtraCharge}
                      formatPrice={formatPrice}
                      promoCode={promoCode}
                      setPromoCode={setPromoCode}
                      isValidating={isValidating}
                      validation={validation}
                      onApply={applyPromoCode}
                      onClear={clearPromoCode}
                    />
                  </div>

                  {/* Submit Button (Mobile) */}
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full lg:hidden gap-2"
                    disabled={isLoading || isValidatingStock || stockErrors.length > 0}
                  >
                    {isLoading || isValidatingStock ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : paymentMethod === 'cod' ? (
                      <Banknote className="w-4 h-4" />
                    ) : (
                      <CreditCard className="w-4 h-4" />
                    )}
                    {isValidatingStock ? 'Checking Stock...' : paymentMethod === 'cod' ? `Place COD Order • ${formatPrice(finalTotal)}` : `Pay ${formatPrice(finalTotal)}`}
                  </Button>
                </form>
              </Form>
            </div>

            {/* Order Summary Sidebar (Desktop) */}
            <div className="hidden lg:block">
              <div className="sticky top-24">
                <OrderSummary
                  subtotal={subtotal}
                  tax={adjustedTax}
                  total={finalTotal}
                  discount={discount}
                  shippingCost={shippingCost}
                  codCharge={codExtraCharge}
                  formatPrice={formatPrice}
                  promoCode={promoCode}
                  setPromoCode={setPromoCode}
                  isValidating={isValidating}
                  validation={validation}
                  onApply={applyPromoCode}
                  onClear={clearPromoCode}
                />
                <Button
                  type="submit"
                  size="lg"
                  className="w-full mt-4 h-14 text-base font-semibold gap-2 shadow-lg hover:shadow-xl transition-shadow"
                  disabled={isLoading || isValidatingStock || stockErrors.length > 0}
                  onClick={form.handleSubmit(onSubmit)}
                >
                  {isLoading || isValidatingStock ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : paymentMethod === 'cod' ? (
                    <Banknote className="w-5 h-5" />
                  ) : (
                    <Zap className="w-5 h-5" />
                  )}
                  {isValidatingStock ? 'Checking Stock...' : paymentMethod === 'cod' ? `Place COD Order • ${formatPrice(finalTotal)}` : `Complete Order • ${formatPrice(finalTotal)}`}
                </Button>
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-4">
                  <ShieldCheck className="w-4 h-4" />
                  Secure checkout powered by Razorpay
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderSummary({
  subtotal,
  tax,
  total,
  discount,
  shippingCost = 0,
  codCharge = 0,
  formatPrice,
  promoCode,
  setPromoCode,
  isValidating,
  validation,
  onApply,
  onClear,
}: {
  subtotal: number;
  tax: number;
  total: number;
  discount: number;
  shippingCost?: number;
  codCharge?: number;
  formatPrice: (amount: number) => string;
  promoCode: string;
  setPromoCode: (code: string) => void;
  isValidating: boolean;
  validation: {
    isValid: boolean;
    promotion: { name: string; discount_type: string; discount_value: number } | null;
    discount: number;
    error: string | null;
  };
  onApply: () => void;
  onClear: () => void;
}) {
  return (
    <Card className="border-border/50 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Order Summary
          </CardTitle>
          <div className="flex items-center gap-1.5 text-xs text-success font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Secure
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Psychology: Urgency indicator */}
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-warning/10 border border-warning/20 text-sm">
          <Clock className="w-4 h-4 text-warning" />
          <span className="text-warning font-medium">Complete order within 15 min</span>
        </div>

        {/* Promo Code Input */}
        <PromoCodeInput
          promoCode={promoCode}
          setPromoCode={setPromoCode}
          isValidating={isValidating}
          validation={validation}
          onApply={onApply}
          onClear={onClear}
        />

        <Separator className="my-3" />

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium">{formatPrice(subtotal)}</span>
        </div>
        {discount > 0 && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex justify-between text-sm text-success font-medium"
          >
            <span className="flex items-center gap-1.5">
              <Gift className="w-3.5 h-3.5" /> Discount Applied
            </span>
            <span>-{formatPrice(discount)}</span>
          </motion.div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Shipping</span>
          {shippingCost > 0 ? (
            <span>{formatPrice(shippingCost)}</span>
          ) : (
            <span className="text-success font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> FREE
            </span>
          )}
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">GST (18%)</span>
          <span>{formatPrice(tax)}</span>
        </div>
        {codCharge > 0 && (
          <div className="flex justify-between text-sm text-warning">
            <span>COD Fee (2%)</span>
            <span>+{formatPrice(codCharge)}</span>
          </div>
        )}
        <Separator />
        <div className="flex justify-between items-baseline">
          <span className="font-semibold">Total</span>
          <div className="text-right">
            <span className="text-2xl font-bold text-accent">{formatPrice(total)}</span>
            {discount > 0 && (
              <p className="text-xs text-success font-medium">
                You're saving {formatPrice(discount)}!
              </p>
            )}
          </div>
        </div>

        {/* Psychology: Trust signals */}
        <div className="mt-4 p-3 rounded-xl bg-secondary/50 space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-success" />
            <span>256-bit SSL encrypted payment</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <span>100% money-back guarantee</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="w-4 h-4 text-accent" />
            <span>Trusted by 50,000+ customers</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
