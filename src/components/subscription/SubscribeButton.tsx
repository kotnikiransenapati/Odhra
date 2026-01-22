import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Check, ChevronDown, Sparkles, Truck, Percent, Gift } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useProductSubscriptionPlans, useCreateSubscription, formatInterval } from '@/hooks/useSubscriptions';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SubscribeButtonProps {
  productId: string;
  productTitle: string;
  vendorId: string;
  basePrice: number;
  className?: string;
}

export function SubscribeButton({
  productId,
  productTitle,
  vendorId,
  basePrice,
  className,
}: SubscribeButtonProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>();
  const [quantity, setQuantity] = useState(1);

  const { data: plans = [], isLoading } = useProductSubscriptionPlans(productId);
  const createSubscription = useCreateSubscription();

  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleSubscribe = async () => {
    if (!user) {
      toast.error('Please login to subscribe');
      navigate('/auth');
      return;
    }

    if (!selectedPlan) {
      toast.error('Please select a subscription plan');
      return;
    }

    // For now, use a default address - in production this would open address selection
    const defaultAddress = {
      full_name: user.user_metadata?.full_name || 'Customer',
      address_line1: 'Address will be confirmed',
      city: 'City',
      state: 'State',
      pincode: '000000',
      country: 'India',
    };

    try {
      await createSubscription.mutateAsync({
        planId: selectedPlan.id,
        productId,
        vendorId,
        quantity,
        shippingAddress: defaultAddress,
      });
      setIsOpen(false);
      navigate('/account/subscriptions');
    } catch {
      // Error handled by mutation
    }
  };

  // Don't show button if no plans available
  if (!isLoading && plans.length === 0) {
    return null;
  }

  return (
    <>
      <Button
        variant="outline"
        className={cn(
          'relative overflow-hidden group border-accent/30 hover:border-accent',
          className
        )}
        onClick={() => setIsOpen(true)}
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-accent/10 to-primary/10"
          initial={{ x: '-100%' }}
          whileHover={{ x: '100%' }}
          transition={{ duration: 0.5 }}
        />
        <RefreshCw className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-500" />
        Subscribe & Save
        {plans.length > 0 && plans[0].discount_percentage > 0 && (
          <Badge className="ml-2 bg-accent text-accent-foreground text-xs">
            {plans[0].discount_percentage}% OFF
          </Badge>
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-accent" />
              Subscribe to {productTitle}
            </DialogTitle>
            <DialogDescription>
              Get regular deliveries and save on every order.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Benefits */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Percent, label: 'Save up to 15%' },
                { icon: Truck, label: 'Free Shipping' },
                { icon: Gift, label: 'Flexible Plans' },
              ].map((benefit, i) => (
                <motion.div
                  key={benefit.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex flex-col items-center p-3 rounded-lg bg-secondary/50 text-center"
                >
                  <benefit.icon className="w-5 h-5 text-accent mb-1" />
                  <span className="text-xs text-muted-foreground">{benefit.label}</span>
                </motion.div>
              ))}
            </div>

            {/* Plan Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Delivery Frequency</label>
              <div className="grid gap-2">
                {plans.map((plan) => {
                  const isSelected = selectedPlanId === plan.id;
                  const finalPrice = plan.price;
                  const savings = basePrice - finalPrice;

                  return (
                    <motion.button
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        'relative flex items-center justify-between p-4 rounded-xl border-2 text-left transition-all',
                        isSelected
                          ? 'border-accent bg-accent/5 ring-2 ring-accent/20'
                          : 'border-border hover:border-accent/50'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                            isSelected ? 'border-accent bg-accent' : 'border-muted-foreground'
                          )}
                        >
                          {isSelected && <Check className="w-3 h-3 text-accent-foreground" />}
                        </div>
                        <div>
                          <p className="font-medium">
                            {formatInterval(plan.interval, plan.interval_count)}
                          </p>
                          {plan.description && (
                            <p className="text-xs text-muted-foreground">{plan.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-accent">{formatPrice(finalPrice)}</p>
                        {savings > 0 && (
                          <p className="text-xs text-green-600">Save {formatPrice(savings)}</p>
                        )}
                      </div>
                      {plan.discount_percentage > 0 && (
                        <Badge className="absolute -top-2 -right-2 bg-accent text-xs">
                          {plan.discount_percentage}% OFF
                        </Badge>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Quantity */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Quantity per delivery</label>
              <Select value={quantity.toString()} onValueChange={(v) => setQuantity(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6].map((q) => (
                    <SelectItem key={q} value={q.toString()}>
                      {q} {q === 1 ? 'item' : 'items'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Summary */}
            {selectedPlan && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-gradient-to-br from-accent/10 to-primary/5 border border-accent/20"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Per delivery</span>
                  <span className="font-semibold">{formatPrice(selectedPlan.price * quantity)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {formatInterval(selectedPlan.interval, selectedPlan.interval_count)}
                  </span>
                  <div className="flex items-center gap-1 text-green-600 text-sm">
                    <Sparkles className="w-3 h-3" />
                    Save {formatPrice((basePrice - selectedPlan.price) * quantity)}
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSubscribe}
              disabled={!selectedPlan || createSubscription.isPending}
              className="flex-1 gap-2"
            >
              {createSubscription.isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Start Subscription
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
