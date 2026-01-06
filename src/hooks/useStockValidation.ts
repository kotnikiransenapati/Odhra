import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CartItem } from '@/contexts/CartContext';

interface StockValidationResult {
  isValid: boolean;
  invalidItems: Array<{
    product_id: string;
    title: string;
    requested: number;
    available: number;
  }>;
}

export function useStockValidation() {
  const [isValidating, setIsValidating] = useState(false);

  const validateStock = async (items: CartItem[]): Promise<StockValidationResult> => {
    setIsValidating(true);
    const invalidItems: StockValidationResult['invalidItems'] = [];

    try {
      // Fetch current stock for all products in cart
      const productIds = items.map(item => item.product_id);
      const { data: products, error } = await supabase
        .from('products')
        .select('id, title, stock, is_active')
        .in('id', productIds);

      if (error) throw error;

      const productMap = new Map(products?.map(p => [p.id, p]) || []);

      for (const item of items) {
        const product = productMap.get(item.product_id);
        
        if (!product) {
          invalidItems.push({
            product_id: item.product_id,
            title: item.title || 'Unknown Product',
            requested: item.quantity,
            available: 0,
          });
          continue;
        }

        if (!product.is_active) {
          invalidItems.push({
            product_id: item.product_id,
            title: product.title,
            requested: item.quantity,
            available: 0,
          });
          continue;
        }

        if (product.stock < item.quantity) {
          invalidItems.push({
            product_id: item.product_id,
            title: product.title,
            requested: item.quantity,
            available: product.stock,
          });
        }
      }

      return {
        isValid: invalidItems.length === 0,
        invalidItems,
      };
    } catch (error) {
      console.error('Stock validation error:', error);
      return {
        isValid: false,
        invalidItems: [],
      };
    } finally {
      setIsValidating(false);
    }
  };

  return {
    validateStock,
    isValidating,
  };
}
