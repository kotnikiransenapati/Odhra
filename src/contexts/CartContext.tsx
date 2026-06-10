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

export interface SavedItem {
  product_id: string;
  variant_info?: Record<string, string> | null;
  saved_at: string;
  // enriched
  title?: string;
  price?: number;
  image_url?: string;
  stock?: number;
  slug?: string;
}

interface CartMeta {
  saved?: Array<Pick<SavedItem, 'product_id' | 'variant_info' | 'saved_at'>>;
}

interface CartContextType {
  items: CartItem[];
  savedItems: SavedItem[];
  isLoading: boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  addItem: (productId: string, quantity?: number, variantInfo?: Record<string, string>) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  saveForLater: (productId: string) => Promise<void>;
  moveSavedToCart: (productId: string) => Promise<void>;
  removeSavedItem: (productId: string) => Promise<void>;
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

const MAX_SAVED = 50;

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [meta, setMeta] = useState<CartMeta>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [cartId, setCartId] = useState<string | null>(null);

  // Enrich a generic list of product references with product details
  const enrichWithProducts = async <T extends { product_id: string }>(
    rows: T[]
  ): Promise<Array<T & Partial<Pick<CartItem, 'title' | 'price' | 'compare_at_price' | 'stock' | 'image_url' | 'vendor_name' | 'slug'>>>> => {
    if (rows.length === 0) return [];
    const ids = Array.from(new Set(rows.map((r) => r.product_id)));
    const { data: products } = await supabase
      .from('products')
      .select(`
        id, title, slug, price, compare_at_price, stock,
        product_images (url, is_primary),
        vendors (brand_name)
      `)
      .in('id', ids);

    return rows.map((row) => {
      const product = products?.find((p) => p.id === row.product_id);
      if (!product) return row;
      const primary = product.product_images?.find((img) => img.is_primary) ?? product.product_images?.[0];
      return {
        ...row,
        title: product.title,
        slug: product.slug ?? undefined,
        price: product.price,
        compare_at_price: product.compare_at_price,
        stock: product.stock,
        image_url: primary?.url,
        vendor_name: product.vendors?.brand_name,
      };
    });
  };

  const hydrateSaved = useCallback(
    async (savedRefs: NonNullable<CartMeta['saved']>) => {
      if (!savedRefs?.length) {
        setSavedItems([]);
        return;
      }
      const enriched = await enrichWithProducts(savedRefs);
      setSavedItems(
        enriched.map((r) => ({
          product_id: r.product_id,
          variant_info: r.variant_info ?? null,
          saved_at: r.saved_at,
          title: r.title,
          price: r.price,
          stock: r.stock,
          image_url: r.image_url,
          slug: r.slug,
        }))
      );
    },
    []
  );

  // Enrich cart items with product details
  const enrichCartItems = async (cartItems: CartItem[]) => {
    if (cartItems.length === 0) {
      setItems([]);
      return;
    }
    const enriched = await enrichWithProducts(cartItems);
    setItems(enriched as CartItem[]);
  };

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
        const cartMeta = ((data as { meta?: CartMeta }).meta as CartMeta) || {};
        setMeta(cartMeta);
        await Promise.all([enrichCartItems(cartItems), hydrateSaved(cartMeta.saved ?? [])]);
      } else {
        setItems([]);
        setSavedItems([]);
        setMeta({});
        setCartId(null);
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, hydrateSaved]);

  // Save cart to database (items + meta)
  const saveCart = async (newItems: CartItem[], newMeta?: CartMeta) => {
    const finalMeta = newMeta ?? meta;
    try {
      const itemsToSave = newItems.map(({ product_id, quantity, variant_info, added_at }) => ({
        product_id,
        quantity,
        variant_info,
        added_at,
      }));

      if (cartId) {
        const { error } = await supabase
          .from('carts')
          .update({
            items: itemsToSave as unknown as Json,
            meta: finalMeta as unknown as Json,
            updated_at: new Date().toISOString(),
          })
          .eq('id', cartId);

        if (error) throw error;
      } else {
        const cartData: { items: Json; meta: Json; user_id?: string; session_id?: string } = {
          items: itemsToSave as unknown as Json,
          meta: finalMeta as unknown as Json,
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

      if (newMeta) setMeta(newMeta);
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
        newItems = items.map((item, index) =>
          index === existingIndex
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
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

      // If it was previously saved, remove from saved
      const wasSaved = (meta.saved ?? []).some((s) => s.product_id === productId);
      const nextMeta: CartMeta = wasSaved
        ? { ...meta, saved: (meta.saved ?? []).filter((s) => s.product_id !== productId) }
        : meta;

      await saveCart(newItems, nextMeta);
      await Promise.all([enrichCartItems(newItems), hydrateSaved(nextMeta.saved ?? [])]);
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

  // Move a cart item to "saved for later"
  const saveForLater = async (productId: string) => {
    try {
      const existing = items.find((i) => i.product_id === productId);
      if (!existing) return;

      const newItems = items.filter((i) => i.product_id !== productId);
      const currentSaved = meta.saved ?? [];
      const alreadySaved = currentSaved.some((s) => s.product_id === productId);
      const nextSaved = alreadySaved
        ? currentSaved
        : [
            { product_id: productId, variant_info: existing.variant_info ?? null, saved_at: new Date().toISOString() },
            ...currentSaved,
          ].slice(0, MAX_SAVED);
      const nextMeta: CartMeta = { ...meta, saved: nextSaved };

      await saveCart(newItems, nextMeta);
      setItems(newItems);
      await hydrateSaved(nextSaved);
      toast.success('Saved for later');
    } catch (error) {
      console.error(error);
      toast.error('Could not save item');
    }
  };

  // Move saved item back into the cart
  const moveSavedToCart = async (productId: string) => {
    try {
      const saved = (meta.saved ?? []).find((s) => s.product_id === productId);
      if (!saved) return;

      const existingIndex = items.findIndex((i) => i.product_id === productId);
      const newItems: CartItem[] =
        existingIndex >= 0
          ? items.map((it, idx) => (idx === existingIndex ? { ...it, quantity: it.quantity + 1 } : it))
          : [
              ...items,
              {
                product_id: productId,
                quantity: 1,
                variant_info: saved.variant_info ?? null,
                added_at: new Date().toISOString(),
              },
            ];

      const nextSaved = (meta.saved ?? []).filter((s) => s.product_id !== productId);
      const nextMeta: CartMeta = { ...meta, saved: nextSaved };

      await saveCart(newItems, nextMeta);
      await Promise.all([enrichCartItems(newItems), hydrateSaved(nextSaved)]);
      toast.success('Moved to cart');
    } catch (error) {
      console.error(error);
      toast.error('Could not move item');
    }
  };

  // Remove a saved-for-later item entirely
  const removeSavedItem = async (productId: string) => {
    try {
      const nextSaved = (meta.saved ?? []).filter((s) => s.product_id !== productId);
      const nextMeta: CartMeta = { ...meta, saved: nextSaved };
      await saveCart(items, nextMeta);
      await hydrateSaved(nextSaved);
      toast.success('Removed');
    } catch (error) {
      toast.error('Could not remove item');
    }
  };

  // Clear cart (keeps saved items)
  const clearCart = async () => {
    try {
      if (cartId) {
        const { error } = await supabase
          .from('carts')
          .update({
            items: [] as unknown as Json,
            meta: meta as unknown as Json,
            updated_at: new Date().toISOString(),
          })
          .eq('id', cartId);
        if (error) throw error;
      }
      setItems([]);
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

      const { data: anonCart } = await supabase
        .from('carts')
        .select('*')
        .eq('session_id', sessionId)
        .maybeSingle();

      if (anonCart && (anonCart.items as unknown as CartItem[])?.length > 0) {
        const { data: userCart } = await supabase
          .from('carts')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        const anonItems = (anonCart.items as unknown as CartItem[]) || [];
        const userItems = (userCart?.items as unknown as CartItem[]) || [];
        const anonMeta = ((anonCart as { meta?: CartMeta }).meta as CartMeta) || {};
        const userMeta = ((userCart as { meta?: CartMeta } | null)?.meta as CartMeta) || {};

        const mergedItems = [...userItems];
        for (const anonItem of anonItems) {
          const existingIndex = mergedItems.findIndex(
            (item) => item.product_id === anonItem.product_id
          );
          if (existingIndex < 0) {
            mergedItems.push(anonItem);
          }
        }

        // Merge saved-for-later (dedupe by product_id, keep newest saved_at)
        const savedMap = new Map<string, NonNullable<CartMeta['saved']>[number]>();
        for (const s of [...(userMeta.saved ?? []), ...(anonMeta.saved ?? [])]) {
          const existing = savedMap.get(s.product_id);
          if (!existing || new Date(s.saved_at) > new Date(existing.saved_at)) {
            savedMap.set(s.product_id, s);
          }
        }
        const mergedMeta: CartMeta = {
          ...userMeta,
          ...anonMeta,
          saved: Array.from(savedMap.values()).slice(0, MAX_SAVED),
        };

        if (userCart) {
          await supabase
            .from('carts')
            .update({
              items: mergedItems as unknown as Json,
              meta: mergedMeta as unknown as Json,
            })
            .eq('id', userCart.id);
        } else {
          await supabase.from('carts').insert({
            user_id: user.id,
            items: mergedItems as unknown as Json,
            meta: mergedMeta as unknown as Json,
          });
        }

        await supabase.from('carts').delete().eq('id', anonCart.id);
        localStorage.removeItem('cart_session_id');

        fetchCart();
      }
    };

    mergeCartsOnLogin();
  }, [user, fetchCart]);

  return (
    <CartContext.Provider
      value={{
        items,
        savedItems,
        isLoading,
        isOpen,
        setIsOpen,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        saveForLater,
        moveSavedToCart,
        removeSavedItem,
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
