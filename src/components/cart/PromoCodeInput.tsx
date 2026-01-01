import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Tag, X, CheckCircle, AlertCircle } from 'lucide-react';

interface PromoCodeInputProps {
  promoCode: string;
  setPromoCode: (code: string) => void;
  isValidating: boolean;
  validation: {
    isValid: boolean;
    promotion: {
      name: string;
      discount_type: string;
      discount_value: number;
    } | null;
    discount: number;
    error: string | null;
  };
  onApply: () => void;
  onClear: () => void;
}

export function PromoCodeInput({
  promoCode,
  setPromoCode,
  isValidating,
  validation,
  onApply,
  onClear,
}: PromoCodeInputProps) {
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (promoCode.trim() && !validation.isValid) {
      onApply();
    }
  };

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Enter promo code"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            className="pl-10 uppercase"
            disabled={validation.isValid}
          />
        </div>
        {validation.isValid ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onClear}
            className="shrink-0"
          >
            <X className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            type="submit"
            variant="secondary"
            disabled={!promoCode.trim() || isValidating}
            className="shrink-0"
          >
            {isValidating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Apply'
            )}
          </Button>
        )}
      </form>

      <AnimatePresence mode="wait">
        {validation.isValid && validation.promotion && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-between p-3 rounded-lg bg-success/10 border border-success/20"
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-success shrink-0" />
              <div>
                <p className="text-sm font-medium text-success">
                  {validation.promotion.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {validation.promotion.discount_type === 'percentage'
                    ? `${validation.promotion.discount_value}% off`
                    : `${formatPrice(validation.promotion.discount_value)} off`}
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-success/20 text-success border-0">
              -{formatPrice(validation.discount)}
            </Badge>
          </motion.div>
        )}

        {validation.error && !validation.isValid && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20"
          >
            <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
            <p className="text-sm text-destructive">{validation.error}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
