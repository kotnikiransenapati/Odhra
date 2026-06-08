import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Truck, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useShippingCost, getEstimatedDeliveryDate, formatDeliveryDate } from '@/hooks/useShippingCost';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';

interface PincodeCheckerProps {
  subtotal: number;
}

export function PincodeChecker({ subtotal }: PincodeCheckerProps) {
  const { isEnabled } = useFeatureFlag('pincode_checker');
  const [pincode, setPincode] = useState('');
  const [checked, setChecked] = useState(false);
  const { estimate, isLoading } = useShippingCost(checked ? pincode : '', subtotal);
  if (!isEnabled) return null;

  const handleCheck = () => {
    if (/^\d{6}$/.test(pincode)) {
      setChecked(true);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPincode(val);
    if (checked) setChecked(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <MapPin className="w-4 h-4 text-muted-foreground" />
        <span>Check Delivery</span>
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="Enter pincode"
          value={pincode}
          onChange={handleChange}
          onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
          className="max-w-[160px]"
          maxLength={6}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleCheck}
          disabled={pincode.length !== 6 || isLoading}
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Check'}
        </Button>
      </div>

      <AnimatePresence>
        {checked && estimate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-1.5"
          >
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span className="text-success font-medium">Delivery available to {pincode}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Truck className="w-4 h-4" />
              <span>
                Est. delivery: {formatDeliveryDate(getEstimatedDeliveryDate(estimate.estimatedDaysMin, estimate.estimatedDaysMax).from)} - {formatDeliveryDate(getEstimatedDeliveryDate(estimate.estimatedDaysMin, estimate.estimatedDaysMax).to)}
              </span>
            </div>
            {estimate.isFree && (
              <div className="text-xs text-success font-medium">🎉 Free Delivery!</div>
            )}
            {!estimate.isFree && (
              <div className="text-xs text-muted-foreground">
                Shipping: ₹{estimate.rate} • Free above ₹999
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
