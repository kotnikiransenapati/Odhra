import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCart, CartItem } from '@/contexts/CartContext';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';
import { getSiteBaseUrl } from '@/lib/siteUrl';
import { toast } from 'sonner';

const BASE_URL = getSiteBaseUrl({ preferPublishedInPreview: true });

export function useShareCart() {
  const { isEnabled } = useFeatureFlag('cart_sharing');
  const { user } = useAuth();
  const { items, itemCount, subtotal } = useCart();
  const [isSharing, setIsSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const generateShareLink = async (message?: string): Promise<string | null> => {
    if (!isEnabled) {
      toast.error('Cart sharing is currently unavailable');
      return null;
    }
    if (items.length === 0) {
      toast.error('Your cart is empty');
      return null;
    }

    setIsSharing(true);
    try {
      // Save minimal item data (product_id, quantity, and display info)
      const itemsToSave = items.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        title: item.title,
        price: item.price,
        compare_at_price: item.compare_at_price,
        image_url: item.image_url,
        slug: item.slug,
        vendor_name: item.vendor_name,
      }));

      const payload: Record<string, any> = {
        items: itemsToSave,
        item_count: itemCount,
        subtotal,
        message: message || null,
      };

      if (user) {
        payload.created_by = user.id;
      } else {
        payload.session_id = localStorage.getItem('cart_session_id') || 'anon';
      }

      const { data, error } = await supabase
        .from('shared_carts')
        .insert(payload)
        .select('share_code')
        .single();

      if (error) throw error;

      const url = `${BASE_URL}/?shared_cart=${data.share_code}`;
      setShareUrl(url);
      return url;
    } catch (err) {
      console.error('Error creating shared cart:', err);
      toast.error('Failed to create share link');
      return null;
    } finally {
      setIsSharing(false);
    }
  };

  const shareViaChannel = async (channel: 'copy' | 'whatsapp' | 'native', message?: string) => {
    const url = shareUrl || await generateShareLink(message);
    if (!url) return;

    const shareText = `🛒 Check out my cart on Odhra!\n\n${items.map(i => `• ${i.title} x${i.quantity}`).join('\n')}\n\n💰 Total: ₹${subtotal.toLocaleString('en-IN')}\n\n👉 ${url}`;

    switch (channel) {
      case 'copy':
        await navigator.clipboard.writeText(url);
        toast.success('Cart link copied!');
        break;

      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank', 'noopener,noreferrer');
        break;

      case 'native':
        if (navigator.share) {
          navigator.share({ title: 'My Cart on Odhra', text: shareText, url }).catch(() => {});
        } else {
          await navigator.clipboard.writeText(url);
          toast.success('Cart link copied!');
        }
        break;
    }
  };

  return {
    isEnabled,
    isSharing,
    shareUrl,
    generateShareLink,
    shareViaChannel,
  };
}
