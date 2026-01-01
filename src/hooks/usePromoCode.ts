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
      // Fetch the promotion by code
      const { data: promotion, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('code', code.toUpperCase().trim())
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
