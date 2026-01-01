import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface CartItem {
  product_id: string;
  quantity: number;
  variant_info?: Record<string, string> | null;
  added_at: string;
  // Enriched data from products table
  title?: string;
  price?: number;
  compare_at_price?: number | null;
  image_url?: string;
  stock?: number;
  vendor_name?: string;
  slug?: string;
}

interface CartContextType {
  items: CartItem[];
  isLoading: boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  addItem: (productId: string, quantity?: number, variantInfo?: Record<string, string>) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  itemCount: number;
  subtotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Generate or get session ID for anonymous users
const getSessionId = (): string => {
  let sessionId = localStorage.getItem('cart_session_id');
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem('cart_session_id', sessionId);
  }
  return sessionId;
};

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [cartId, setCartId] = useState<string | null>(null);

  // Fetch cart from database
  const fetchCart = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase.from('carts').select('*');

      if (user) {
        query = query.eq('user_id', user.id);
      } else {
        const sessionId = getSessionId();
        query = query.eq('session_id', sessionId);
      }

      const { data, error } = await query.maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setCartId(data.id);
        const cartItems = (data.items as unknown as CartItem[]) || [];
        // Enrich items with product data
        await enrichCartItems(cartItems);
      } else {
        setItems([]);
        setCartId(null);
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Enrich cart items with product details
  const enrichCartItems = async (cartItems: CartItem[]) => {
    if (cartItems.length === 0) {
      setItems([]);
      return;
    }

    const productIds = cartItems.map((item) => item.product_id);
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        id, title, slug, price, compare_at_price, stock,
        product_images (url, is_primary),
        vendors (brand_name)
      `)
      .in('id', productIds);

    if (error) {
      console.error('Error fetching products:', error);
      setItems(cartItems);
      return;
    }

    const enrichedItems = cartItems.map((item) => {
      const product = products?.find((p) => p.id === item.product_id);
      if (!product) return item;

      const primaryImage = product.product_images?.find((img) => img.is_primary);
      return {
        ...item,
        title: product.title,
        slug: product.slug,
        price: product.price,
        compare_at_price: product.compare_at_price,
        stock: product.stock,
        image_url: primaryImage?.url,
        vendor_name: product.vendors?.brand_name,
      };
    });

    setItems(enrichedItems);
  };

  // Save cart to database
  const saveCart = async (newItems: CartItem[]) => {
    try {
      const itemsToSave = newItems.map(({ product_id, quantity, variant_info, added_at }) => ({
        product_id,
        quantity,
        variant_info,
        added_at,
      }));

      if (cartId) {
        // Update existing cart
        const { error } = await supabase
          .from('carts')
          .update({ items: itemsToSave as unknown as Json, updated_at: new Date().toISOString() })
          .eq('id', cartId);

        if (error) throw error;
      } else {
        // Create new cart
        const cartData: {
          items: Json;
          user_id?: string;
          session_id?: string;
        } = {
          items: itemsToSave as unknown as Json,
        };

        if (user) {
          cartData.user_id = user.id;
        } else {
          cartData.session_id = getSessionId();
        }

        const { data, error } = await supabase
          .from('carts')
          .insert(cartData)
          .select()
          .single();

        if (error) throw error;
        setCartId(data.id);
      }
    } catch (error) {
      console.error('Error saving cart:', error);
      throw error;
    }
  };

  // Add item to cart
  const addItem = async (
    productId: string,
    quantity = 1,
    variantInfo?: Record<string, string>
  ) => {
    try {
      const existingIndex = items.findIndex((item) => item.product_id === productId);
      let newItems: CartItem[];

      if (existingIndex >= 0) {
        // Update quantity
        newItems = items.map((item, index) =>
          index === existingIndex
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        // Add new item
        newItems = [
          ...items,
          {
            product_id: productId,
            quantity,
            variant_info: variantInfo || null,
            added_at: new Date().toISOString(),
          },
        ];
      }

      await saveCart(newItems);
      await enrichCartItems(newItems);
      setIsOpen(true);
      toast.success('Added to cart');
    } catch (error) {
      toast.error('Failed to add to cart');
    }
  };

  // Update item quantity
  const updateQuantity = async (productId: string, quantity: number) => {
    try {
      if (quantity <= 0) {
        await removeItem(productId);
        return;
      }

      const newItems = items.map((item) =>
        item.product_id === productId ? { ...item, quantity } : item
      );

      await saveCart(newItems);
      setItems(newItems);
    } catch (error) {
      toast.error('Failed to update quantity');
    }
  };

  // Remove item from cart
  const removeItem = async (productId: string) => {
    try {
      const newItems = items.filter((item) => item.product_id !== productId);
      await saveCart(newItems);
      setItems(newItems);
      toast.success('Removed from cart');
    } catch (error) {
      toast.error('Failed to remove item');
    }
  };

  // Clear cart
  const clearCart = async () => {
    try {
      if (cartId) {
        await supabase.from('carts').delete().eq('id', cartId);
      }
      setItems([]);
      setCartId(null);
    } catch (error) {
      toast.error('Failed to clear cart');
    }
  };

  // Calculate totals
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce(
    (sum, item) => sum + (item.price || 0) * item.quantity,
    0
  );

  // Fetch cart on mount and when user changes
  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // Merge anonymous cart with user cart on login
  useEffect(() => {
    const mergeCartsOnLogin = async () => {
      if (!user) return;

      const sessionId = localStorage.getItem('cart_session_id');
      if (!sessionId) return;

      // Check if there's an anonymous cart
      const { data: anonCart } = await supabase
        .from('carts')
        .select('*')
        .eq('session_id', sessionId)
        .maybeSingle();

      if (anonCart && (anonCart.items as unknown as CartItem[])?.length > 0) {
        // Merge with user cart
        const { data: userCart } = await supabase
          .from('carts')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        const anonItems = (anonCart.items as unknown as CartItem[]) || [];
        const userItems = (userCart?.items as unknown as CartItem[]) || [];

        // Merge items, preferring user cart quantities for duplicates
        const mergedItems = [...userItems];
        for (const anonItem of anonItems) {
          const existingIndex = mergedItems.findIndex(
            (item) => item.product_id === anonItem.product_id
          );
          if (existingIndex < 0) {
            mergedItems.push(anonItem);
          }
        }

        if (userCart) {
          await supabase
            .from('carts')
            .update({ items: mergedItems as unknown as Json })
            .eq('id', userCart.id);
        } else {
          await supabase.from('carts').insert({
            user_id: user.id,
            items: mergedItems as unknown as Json,
          });
        }

        // Delete anonymous cart
        await supabase.from('carts').delete().eq('id', anonCart.id);
        localStorage.removeItem('cart_session_id');

        // Refresh cart
        fetchCart();
      }
    };

    mergeCartsOnLogin();
  }, [user, fetchCart]);

  return (
    <CartContext.Provider
      value={{
        items,
        isLoading,
        isOpen,
        setIsOpen,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        itemCount,
        subtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
