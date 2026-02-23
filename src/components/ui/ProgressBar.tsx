import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Check, Gift, Truck, ShoppingBag } from 'lucide-react';

interface ProgressBarProps {
  current: number;
  target: number;
  label?: string;
  showMilestones?: boolean;
  className?: string;
}

// Cart progress towards free shipping
export function FreeShippingProgress({ 
  current, 
  target = 1000, 
  className 
}: { 
  current: number; 
  target?: number; 
  className?: string;
}) {
  const progress = Math.min((current / target) * 100, 100);
  const remaining = Math.max(target - current, 0);
  const achieved = current >= target;

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className={cn('space-y-2', className)}>
      {/* Message */}
      <div className="flex items-center justify-between text-sm">
        {achieved ? (
          <div className="flex items-center gap-2 text-success font-medium">
            <Check className="w-4 h-4" />
            You've unlocked FREE shipping! 🎉
          </div>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Truck className="w-4 h-4" />
            Add {formatPrice(remaining)} more for FREE shipping
          </div>
        )}
      </div>

      {/* Progress bar with accessibility */}
      <div 
        className="relative h-2 bg-muted rounded-full overflow-hidden"
        role="progressbar"
        aria-label={achieved ? "Free shipping unlocked" : `${formatPrice(remaining)} more for free shipping`}
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={cn(
            'absolute inset-y-0 left-0 rounded-full',
            achieved 
              ? 'bg-gradient-to-r from-success to-success/80' 
              : 'bg-gradient-to-r from-accent to-accent/80'
          )}
        />
        
        {/* Milestone marker at target */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-background border-2 border-accent shadow-sm"
          style={{ left: `calc(100% - 6px)` }}
          aria-hidden="true"
        >
          {achieved && (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Check className="w-2 h-2 text-success" />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

// Checkout progress steps
interface CheckoutStep {
  id: string;
  label: string;
  icon: React.ElementType;
}

const checkoutSteps: CheckoutStep[] = [
  { id: 'cart', label: 'Cart', icon: ShoppingBag },
  { id: 'shipping', label: 'Shipping', icon: Truck },
  { id: 'payment', label: 'Payment', icon: Gift },
];

export function CheckoutProgress({ 
  currentStep, 
  className 
}: { 
  currentStep: 'cart' | 'shipping' | 'payment' | 'complete';
  className?: string;
}) {
  const stepIndex = checkoutSteps.findIndex(s => s.id === currentStep);
  
  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      {checkoutSteps.map((step, index) => {
        const isComplete = index < stepIndex || currentStep === 'complete';
        const isCurrent = index === stepIndex;
        const Icon = step.icon;

        return (
          <React.Fragment key={step.id}>
            {/* Step circle */}
            <div className="flex flex-col items-center gap-1">
              <motion.div
                initial={false}
                animate={{
                  scale: isCurrent ? 1.1 : 1,
                  backgroundColor: isComplete ? 'var(--accent)' : isCurrent ? 'var(--accent)' : 'var(--muted)',
                }}
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center transition-colors',
                  isComplete || isCurrent ? 'text-accent-foreground' : 'text-muted-foreground'
                )}
              >
                {isComplete ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </motion.div>
              <span className={cn(
                'text-xs font-medium',
                isComplete || isCurrent ? 'text-accent' : 'text-muted-foreground'
              )}>
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {index < checkoutSteps.length - 1 && (
              <div className="w-16 h-0.5 bg-muted rounded-full overflow-hidden -mt-6">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: isComplete ? '100%' : '0%' }}
                  transition={{ duration: 0.3 }}
                  className="h-full bg-accent"
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// Generic progress bar with accessibility
export function ProgressBar({ current, target, label, showMilestones, className }: ProgressBarProps) {
  const progress = Math.min((current / target) * 100, 100);

  return (
    <div className={cn('space-y-1', className)}>
      {label && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground" id="progress-label">{label}</span>
          <span className="font-medium">{Math.round(progress)}%</span>
        </div>
      )}
      <div 
        className="h-2 bg-muted rounded-full overflow-hidden"
        role="progressbar"
        aria-label={label || "Progress"}
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="h-full bg-gradient-to-r from-accent to-accent/80 rounded-full"
        />
      </div>
    </div>
  );
}
