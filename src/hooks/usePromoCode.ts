import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PromoValidation {
  isValid: boolean;
  promotion: {
    id: string;
    name: string;
    code: string;
    discount_type: string;
    discount_value: number;
    max_discount_amount: number | null;
    min_order_amount: number | null;
    type: string;
  } | null;
  discount: number;
  error: string | null;
}

export function usePromoCode(subtotal: number) {
  const { user } = useAuth();
  const [promoCode, setPromoCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validation, setValidation] = useState<PromoValidation>({
    isValid: false,
    promotion: null,
    discount: 0,
    error: null,
  });

  const validatePromoCode = useCallback(async (code: string): Promise<PromoValidation> => {
    if (!code.trim()) {
      return { isValid: false, promotion: null, discount: 0, error: 'Please enter a promo code' };
    }

    setIsValidating(true);
    try {
      const trimmedCode = code.toUpperCase().trim();

      // 1. Check if this is a reward redemption code (RWD- prefix)
      if (trimmedCode.startsWith('RWD-') && user) {
        const { data: redemption, error: redemptionError } = await supabase
          .from('points_redemptions')
          .select('*')
          .eq('reward_code', trimmedCode)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();

        if (redemptionError) throw redemptionError;

        if (!redemption) {
          return { isValid: false, promotion: null, discount: 0, error: 'Invalid or expired reward code' };
        }

        const details = redemption.reward_details as { name: string; type: string; value: Record<string, number> };
        let discount = 0;
        let discountType = 'fixed';
        let discountValue = 0;

        if (details.type === 'discount_percentage') {
          discountType = 'percentage';
          discountValue = (details.value as any)?.percentage || 10;
          discount = (subtotal * discountValue) / 100;
        } else if (details.type === 'discount_fixed') {
          discountType = 'fixed';
          discountValue = (details.value as any)?.amount || 0;
          discount = Math.min(discountValue, subtotal);
        } else if (details.type === 'free_shipping') {
          discountType = 'fixed';
          discountValue = 0;
          discount = 0; // handled separately at checkout
        }

        return {
          isValid: true,
          promotion: {
            id: redemption.id,
            name: details.name || 'Reward Redemption',
            code: trimmedCode,
            discount_type: discountType,
            discount_value: discountValue,
            max_discount_amount: null,
            min_order_amount: null,
            type: 'reward_redemption',
          },
          discount: Math.round(discount * 100) / 100,
          error: null,
        };
      }

      // 2. Check spin wheel codes (SPIN- prefix)
      if (trimmedCode.startsWith('SPIN-') && user) {
        const { data: spinEntry, error: spinError } = await supabase
          .from('spin_wheel_entries')
          .select('*')
          .eq('code', trimmedCode)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();

        if (spinError) throw spinError;

        if (!spinEntry) {
          return { isValid: false, promotion: null, discount: 0, error: 'Invalid or expired spin code' };
        }

        let discount = 0;
        if (spinEntry.discount_type === 'percentage') {
          discount = (subtotal * spinEntry.discount_value) / 100;
        } else {
          discount = Math.min(spinEntry.discount_value, subtotal);
        }

        return {
          isValid: true,
          promotion: {
            id: spinEntry.id,
            name: `Spin Wheel Reward`,
            code: trimmedCode,
            discount_type: spinEntry.discount_type,
            discount_value: spinEntry.discount_value,
            max_discount_amount: null,
            min_order_amount: null,
            type: 'spin_wheel',
          },
          discount: Math.round(discount * 100) / 100,
          error: null,
        };
      }

      // 2b. Unique per-customer code (UQ- prefix) — server validates ownership
      if (trimmedCode.startsWith('UQ-') && user) {
        const { data: result, error: uqErr } = await supabase.rpc('validate_unique_coupon_code', {
          p_code: trimmedCode,
          p_user_id: user.id,
        });
        if (uqErr) throw uqErr;
        const res = result as any;
        if (!res?.valid) {
          return { isValid: false, promotion: null, discount: 0, error: res?.error ?? 'Invalid unique code' };
        }
        if (res.min_order_amount && subtotal < Number(res.min_order_amount)) {
          return { isValid: false, promotion: null, discount: 0, error: `Minimum order of ₹${res.min_order_amount} required` };
        }
        let d = res.discount_type === 'percentage'
          ? (subtotal * Number(res.discount_value)) / 100
          : Math.min(Number(res.discount_value), subtotal);
        if (res.max_discount_amount) d = Math.min(d, Number(res.max_discount_amount));
        return {
          isValid: true,
          promotion: {
            id: res.promotion_id,
            name: res.name,
            code: trimmedCode,
            discount_type: res.discount_type,
            discount_value: Number(res.discount_value),
            max_discount_amount: res.max_discount_amount ?? null,
            min_order_amount: res.min_order_amount ?? null,
            type: 'unique_coupon',
          },
          discount: Math.round(d * 100) / 100,
          error: null,
        };
      }


      // 3. Standard promotion codes
      const { data: promotion, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('code', trimmedCode)
        .eq('is_active', true)
        .lte('starts_at', new Date().toISOString())
        .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`)
        .maybeSingle();

      if (error) throw error;

      if (!promotion) {
        return { isValid: false, promotion: null, discount: 0, error: 'Invalid promo code' };
      }

      // Check usage limit
      if (promotion.usage_limit && (promotion.usage_count || 0) >= promotion.usage_limit) {
        return { isValid: false, promotion: null, discount: 0, error: 'This promo code has expired' };
      }

      // Check minimum order amount
      if (promotion.min_order_amount && subtotal < promotion.min_order_amount) {
        return {
          isValid: false,
          promotion: null,
          discount: 0,
          error: `Minimum order of ₹${promotion.min_order_amount} required`,
        };
      }

      // Check per-user limit
      if (user && promotion.per_user_limit) {
        const { count } = await supabase
          .from('promotion_usages')
          .select('*', { count: 'exact', head: true })
          .eq('promotion_id', promotion.id)
          .eq('user_id', user.id);

        if (count && count >= promotion.per_user_limit) {
          return { isValid: false, promotion: null, discount: 0, error: 'You have already used this code' };
        }
      }

      // Calculate discount
      let discount = 0;
      if (promotion.discount_type === 'percentage') {
        discount = (subtotal * promotion.discount_value) / 100;
        if (promotion.max_discount_amount) {
          discount = Math.min(discount, promotion.max_discount_amount);
        }
      } else {
        discount = Math.min(promotion.discount_value, subtotal);
      }

      return {
        isValid: true,
        promotion: {
          id: promotion.id,
          name: promotion.name,
          code: promotion.code || '',
          discount_type: promotion.discount_type,
          discount_value: promotion.discount_value,
          max_discount_amount: promotion.max_discount_amount,
          min_order_amount: promotion.min_order_amount,
          type: promotion.type,
        },
        discount: Math.round(discount * 100) / 100,
        error: null,
      };
    } catch (error) {
      console.error('Error validating promo code:', error);
      return { isValid: false, promotion: null, discount: 0, error: 'Failed to validate code' };
    } finally {
      setIsValidating(false);
    }
  }, [subtotal, user]);

  const applyPromoCode = useCallback(async () => {
    const result = await validatePromoCode(promoCode);
    setValidation(result);
    return result;
  }, [promoCode, validatePromoCode]);

  const clearPromoCode = useCallback(() => {
    setPromoCode('');
    setValidation({ isValid: false, promotion: null, discount: 0, error: null });
  }, []);

  return {
    promoCode,
    setPromoCode,
    isValidating,
    validation,
    applyPromoCode,
    clearPromoCode,
  };
}
