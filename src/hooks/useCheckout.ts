import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCart, CartItem } from '@/contexts/CartContext';
import { useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [razorpayReady, setRazorpayReady] = useState(!!window.Razorpay);

  // Preload Razorpay script on hook mount
  useEffect(() => {
    if (window.Razorpay) {
      setRazorpayReady(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => setRazorpayReady(true);
    script.onerror = () => {
      console.warn('Razorpay script failed to load on mount, will retry on payment');
    };
    document.body.appendChild(script);
  }, []);

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      // Remove any previous failed script tags
      document.querySelectorAll('script[src*="razorpay"]').forEach(s => s.remove());
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => {
        setRazorpayReady(true);
        resolve(true);
      };
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const invalidateOrderCaches = () => {
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    queryClient.invalidateQueries({ queryKey: ['vendor-orders'] });
    queryClient.invalidateQueries({ queryKey: ['orders-count'] });
    queryClient.invalidateQueries({ queryKey: ['admin-recent-orders-timeline'] });
  };

  const prepareOrderItems = async () => {
    // Batch query — single DB call instead of N+1
    const productIds = items.map((item: CartItem) => item.product_id);
    const { data: products, error } = await supabase
      .from('products')
      .select('id, vendor_id')
      .in('id', productIds);

    if (error || !products?.length) {
      throw new Error('Unable to verify products. Please refresh your cart.');
    }

    const vendorMap = new Map(products.map(p => [p.id, p.vendor_id]));

    return items.map((item: CartItem) => {
      const vendor_id = vendorMap.get(item.product_id);
      if (!vendor_id) {
        throw new Error(`Unable to verify product "${item.title || item.product_id}". Please refresh your cart.`);
      }
      return {
        product_id: item.product_id,
        quantity: item.quantity,
        variant_info: item.variant_info,
        title: item.title || 'Product',
        price: item.price || 0,
        image_url: item.image_url,
        vendor_id,
      };
    });
  };

  const generateIdempotencyKey = () => {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
  };

  const placeCODOrder = async (
    shippingAddress: ShippingAddress,
    customerNote?: string,
    promoInfo?: PromoInfo,
    guestInfo?: { email: string; phone: string },
    shippingCost = 0,
    codCharge = 0,
  ) => {
    if (!user && !guestInfo) {
      toast.error('Please login or provide guest details');
      return { success: false };
    }
    if (items.length === 0) {
      toast.error('Your cart is empty');
      return { success: false };
    }

    setIsLoading(true);
    try {
      // Refresh session to ensure valid auth token is sent
      if (user) {
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          console.error('Session refresh failed:', refreshError);
        }
      }

      const orderItems = await prepareOrderItems();

      const { data, error } = await supabase.functions.invoke('create-cod-order', {
        body: {
          items: orderItems,
          shipping_address: shippingAddress,
          customer_note: customerNote,
          promo_info: promoInfo,
          guest_info: guestInfo,
          shipping_cost: shippingCost,
          cod_charge: codCharge,
          idempotency_key: generateIdempotencyKey(),
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setOrderNumber(data.order_number);
      await clearCart();
      invalidateOrderCaches();
      toast.success('Order placed successfully!');
      return { success: true, orderNumber: data.order_number, orderId: data.order_id };
    } catch (error) {
      console.error('COD order error:', error);
      const msg = error instanceof Error ? error.message : 'Failed to place order';
      toast.error(msg);
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  };

  const initiatePayment = async (
    shippingAddress: ShippingAddress,
    customerNote?: string,
    promoInfo?: PromoInfo,
    guestInfo?: { email: string; phone: string },
    shippingCost = 0,
  ) => {
    if (!user && !guestInfo) {
      toast.error('Please login or provide guest details');
      return { success: false };
    }
    if (items.length === 0) {
      toast.error('Your cart is empty');
      return { success: false };
    }

    setIsLoading(true);
    try {
      // Refresh session to ensure valid auth token is sent
      if (user) {
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          console.error('Session refresh failed:', refreshError);
        }
      }

      // Try loading Razorpay script (with retry)
      let scriptLoaded = razorpayReady || !!window.Razorpay;
      if (!scriptLoaded) {
        scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          // Retry once after a short delay
          await new Promise(r => setTimeout(r, 1000));
          scriptLoaded = await loadRazorpayScript();
        }
      }
      if (!scriptLoaded) {
        // Collect diagnostic info for debugging
        const diagInfo: string[] = [];
        diagInfo.push(`Host: ${window.location.hostname}`);
        diagInfo.push(`Protocol: ${window.location.protocol}`);
        diagInfo.push(`Online: ${navigator.onLine}`);
        try {
          diagInfo.push(`InIframe: ${window.self !== window.top}`);
        } catch {
          diagInfo.push('InIframe: true (cross-origin)');
        }
        // Check if any script tags for razorpay exist and their state
        const razorpayScripts = document.querySelectorAll('script[src*="razorpay"]');
        diagInfo.push(`RazorpayScriptTags: ${razorpayScripts.length}`);
        razorpayScripts.forEach((s, i) => {
          const scriptEl = s as HTMLScriptElement;
          diagInfo.push(`Script${i}: src=${scriptEl.src}, async=${scriptEl.async}`);
        });
        diagInfo.push(`WindowRazorpay: ${typeof window.Razorpay}`);
        // Check CSP meta tags
        const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
        diagInfo.push(`CSPMeta: ${cspMeta ? cspMeta.getAttribute('content')?.substring(0, 100) : 'none'}`);
        
        const diagnostics = diagInfo.join(' | ');
        console.error('Razorpay load failure diagnostics:', diagnostics);

        // Detect preview/iframe environments
        let isPreview = false;
        try {
          isPreview = window.self !== window.top;
        } catch {
          isPreview = true;
        }
        if (!isPreview) {
          isPreview = window.location.hostname.includes('preview--');
        }
        throw new Error(
          isPreview
            ? 'Payment gateway cannot load in preview mode. Please open the published site URL (odhra1.lovable.app) to complete online payment, or choose Cash on Delivery.'
            : `Payment gateway failed to load. Diagnostics: ${diagnostics}`
        );
      }

      const orderItems = await prepareOrderItems();

      const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
        body: {
          items: orderItems,
          shipping_address: shippingAddress,
          customer_note: customerNote,
          promo_info: promoInfo,
          guest_info: guestInfo,
          shipping_cost: shippingCost,
          idempotency_key: generateIdempotencyKey(),
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        // Try to extract the actual error message from the response
        let errorMsg = 'Payment service unavailable';
        try {
          if (error.context?.body) {
            const body = await new Response(error.context.body).json();
            errorMsg = body?.error || errorMsg;
          } else {
            errorMsg = error.message || errorMsg;
          }
        } catch { errorMsg = error.message || errorMsg; }
        throw new Error(errorMsg);
      }
      if (data?.error) {
        console.error('Payment error:', data.error);
        throw new Error(data.error);
      }
      const { razorpay_order_id, razorpay_key_id, order_id, amount, prefill } = data;

      return new Promise<{ success: boolean; orderNumber?: string; orderId?: string }>((resolve) => {
        const options: RazorpayOptions = {
          key: razorpay_key_id,
          amount: amount * 100,
          currency: 'INR',
          name: 'Odhra',
          description: 'Order Payment',
          order_id: razorpay_order_id,
          prefill: { name: prefill.name, email: prefill.email, contact: prefill.contact },
          theme: { color: '#8B5CF6' },
          handler: async (response: RazorpayResponse) => {
            try {
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
              invalidateOrderCaches();
              toast.success('Payment successful!');
              resolve({ success: true, orderNumber: verifyData.order_number, orderId: order_id });
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
      const msg = error instanceof Error ? error.message : 'Failed to initiate payment';
      toast.error(msg);
      setIsLoading(false);
      return { success: false };
    }
  };

  return {
    initiatePayment,
    placeCODOrder,
    isLoading,
    orderNumber,
    razorpayReady,
    subtotal,
    tax: Math.round(subtotal * 0.18),
    total: subtotal + Math.round(subtotal * 0.18),
    itemCount: items.length,
  };
}
