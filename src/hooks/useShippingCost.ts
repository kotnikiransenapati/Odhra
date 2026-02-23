import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ShippingRate {
  id: string;
  name: string;
  description: string | null;
  base_rate: number;
  per_kg_rate: number | null;
  free_above_amount: number | null;
  estimated_days_min: number | null;
  estimated_days_max: number | null;
}

interface ShippingEstimate {
  rate: number;
  isFree: boolean;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  rateName: string;
}

export function useShippingCost(pincode: string, subtotal: number) {
  const [estimate, setEstimate] = useState<ShippingEstimate | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!pincode || pincode.length !== 6) {
      setEstimate(null);
      return;
    }

    const calculateShipping = async () => {
      setIsLoading(true);
      try {
        // Find matching zone by state (derive from pincode first 2 digits)
        // Fallback: get default shipping rate
        const { data: rates, error } = await supabase
          .from('shipping_rates')
          .select('*')
          .eq('is_active', true)
          .order('base_rate', { ascending: true })
          .limit(1);

        if (error || !rates || rates.length === 0) {
          // Default: free shipping above ₹999, else ₹49
          const isFree = subtotal >= 999;
          setEstimate({
            rate: isFree ? 0 : 49,
            isFree,
            estimatedDaysMin: 3,
            estimatedDaysMax: 7,
            rateName: isFree ? 'Free Delivery' : 'Standard Delivery',
          });
          return;
        }

        const rate = rates[0];
        const isFree = rate.free_above_amount ? subtotal >= rate.free_above_amount : false;

        setEstimate({
          rate: isFree ? 0 : rate.base_rate,
          isFree,
          estimatedDaysMin: rate.estimated_days_min || 3,
          estimatedDaysMax: rate.estimated_days_max || 7,
          rateName: isFree ? 'Free Delivery' : (rate.name || 'Standard Delivery'),
        });
      } catch (err) {
        // Fallback
        const isFree = subtotal >= 999;
        setEstimate({
          rate: isFree ? 0 : 49,
          isFree,
          estimatedDaysMin: 3,
          estimatedDaysMax: 7,
          rateName: isFree ? 'Free Delivery' : 'Standard Delivery',
        });
      } finally {
        setIsLoading(false);
      }
    };

    calculateShipping();
  }, [pincode, subtotal]);

  return { estimate, isLoading };
}

export function getEstimatedDeliveryDate(daysMin: number, daysMax: number): { from: Date; to: Date } {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() + daysMin);
  const to = new Date(now);
  to.setDate(to.getDate() + daysMax);
  return { from, to };
}

export function formatDeliveryDate(date: Date): string {
  return date.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
}
