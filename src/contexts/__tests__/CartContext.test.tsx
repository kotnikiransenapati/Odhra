import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@/test/test-utils';
import React from 'react';
import { CartProvider, useCart } from '../CartContext';

// Mock supabase
const mockFrom = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

// Mock AuthContext
const mockUser = { id: 'user-1', email: 'test@test.com' };
let currentUser: typeof mockUser | null = null;
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: currentUser }),
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}

// Helper to set up supabase mock chain
function mockSupabaseChain(data: any = null, error: any = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
    single: vi.fn().mockResolvedValue({ data, error }),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  };
  mockFrom.mockReturnValue(chain);
  return chain;
}

describe('CartContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentUser = null;
    localStorage.clear();
  });

  it('provides initial empty state', async () => {
    mockSupabaseChain(null);
    const { result } = renderHook(() => useCart(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.items).toEqual([]);
    expect(result.current.itemCount).toBe(0);
    expect(result.current.subtotal).toBe(0);
    expect(result.current.isOpen).toBe(false);
  });

  it('computes itemCount and subtotal correctly from items', async () => {
    const cartData = {
      id: 'cart-1',
      items: [
        { product_id: 'p1', quantity: 2, added_at: new Date().toISOString() },
        { product_id: 'p2', quantity: 3, added_at: new Date().toISOString() },
      ],
    };

    // First call fetches cart, second call enriches products
    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'carts') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: cartData, error: null }),
        };
      }
      if (table === 'products') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({
            data: [
              { id: 'p1', title: 'Product 1', slug: 'p1', price: 100, compare_at_price: null, stock: 10, product_images: [], vendors: null },
              { id: 'p2', title: 'Product 2', slug: 'p2', price: 200, compare_at_price: 250, stock: 5, product_images: [], vendors: null },
            ],
            error: null,
          }),
        };
      }
      return mockSupabaseChain();
    });

    const { result } = renderHook(() => useCart(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.itemCount).toBe(5); // 2 + 3
    expect(result.current.subtotal).toBe(800); // 2*100 + 3*200
  });

  it('setIsOpen toggles cart drawer state', async () => {
    mockSupabaseChain(null);
    const { result } = renderHook(() => useCart(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.setIsOpen(true));
    expect(result.current.isOpen).toBe(true);

    act(() => result.current.setIsOpen(false));
    expect(result.current.isOpen).toBe(false);
  });

  it('throws error when useCart is used outside CartProvider', () => {
    // Suppress console.error for this test
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      renderHook(() => useCart());
    }).toThrow('useCart must be used within a CartProvider');
    spy.mockRestore();
  });

  it('generates session ID for anonymous users', async () => {
    currentUser = null;
    mockSupabaseChain(null);

    renderHook(() => useCart(), { wrapper });

    await waitFor(() => {
      const sessionId = localStorage.getItem('cart_session_id');
      expect(sessionId).toBeTruthy();
      expect(sessionId).toMatch(/^sess_/);
    });
  });

  it('uses user ID for authenticated users instead of session ID', async () => {
    currentUser = mockUser;
    const chain = mockSupabaseChain(null);

    renderHook(() => useCart(), { wrapper });

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('carts');
      expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-1');
    });
  });
});
