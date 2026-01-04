import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCart, CartItem } from '@/contexts/CartContext';
import { toast } from 'sonner';

export interface ShippingAddress {
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface PromoInfo {
  promotion_id: string;
  promotion_code: string;
  discount_amount: number;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
  theme: {
    color: string;
  };
  handler: (response: RazorpayResponse) => void;
  modal: {
    ondismiss: () => void;
  };
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open: () => void;
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

export function useCheckout() {
  const { user, session } = useAuth();
  const { items, subtotal, clearCart } = useCart();
  const [isLoading, setIsLoading] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const initiatePayment = async (
    shippingAddress: ShippingAddress, 
    customerNote?: string,
    promoInfo?: PromoInfo
  ) => {
    if (!user || !session) {
      toast.error('Please login to checkout');
      return { success: false };
    }

    if (items.length === 0) {
      toast.error('Your cart is empty');
      return { success: false };
    }

    setIsLoading(true);

    try {
      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load payment gateway');
      }

      // Prepare order items with vendor info
      const orderItems = await Promise.all(
        items.map(async (item: CartItem) => {
          // Get vendor_id for each product
          const { data: product } = await supabase
            .from('products')
            .select('vendor_id')
            .eq('id', item.product_id)
            .single();

          return {
            product_id: item.product_id,
            quantity: item.quantity,
            variant_info: item.variant_info,
            title: item.title || 'Product',
            price: item.price || 0,
            image_url: item.image_url,
            vendor_id: product?.vendor_id || '',
          };
        })
      );

      // Create order via edge function
      const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
        body: {
          items: orderItems,
          shipping_address: shippingAddress,
          customer_note: customerNote,
          promo_info: promoInfo,
        },
      });

      if (error) throw error;

      const { razorpay_order_id, razorpay_key_id, order_id, amount, prefill } = data;

      // Open Razorpay checkout
      return new Promise<{ success: boolean; orderNumber?: string; orderId?: string }>((resolve) => {
        const options: RazorpayOptions = {
          key: razorpay_key_id,
          amount: amount * 100,
          currency: 'INR',
          name: 'Odhra',
          description: 'Order Payment',
          order_id: razorpay_order_id,
          prefill: {
            name: prefill.name,
            email: prefill.email,
            contact: prefill.contact,
          },
          theme: {
            color: '#8B5CF6',
          },
          handler: async (response: RazorpayResponse) => {
            try {
              // Verify payment
              const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
                'verify-razorpay-payment',
                {
                  body: {
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                    order_id,
                  },
                }
              );

              if (verifyError) throw verifyError;

              setOrderNumber(verifyData.order_number);
              await clearCart();
              toast.success('Payment successful!');
              resolve({ 
                success: true, 
                orderNumber: verifyData.order_number,
                orderId: order_id 
              });
            } catch (err) {
              console.error('Payment verification failed:', err);
              toast.error('Payment verification failed');
              resolve({ success: false });
            } finally {
              setIsLoading(false);
            }
          },
          modal: {
            ondismiss: () => {
              setIsLoading(false);
              toast.error('Payment cancelled');
              resolve({ success: false });
            },
          },
        };

        const razorpay = new window.Razorpay(options);
        razorpay.open();
      });
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to initiate payment');
      setIsLoading(false);
      return { success: false };
    }
  };

  return {
    initiatePayment,
    isLoading,
    orderNumber,
    subtotal,
    tax: Math.round(subtotal * 0.18),
    total: subtotal + Math.round(subtotal * 0.18),
    itemCount: items.length,
  };
}
