import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mockFrom = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...args: any[]) => mockFrom(...args) },
}));

import { useStockValidation } from '../useStockValidation';
import type { CartItem } from '@/contexts/CartContext';

function mockProducts(products: any[], error: any = null) {
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({ data: products, error }),
  });
}

const makeItem = (id: string, qty: number, title = 'Product'): CartItem => ({
  product_id: id, quantity: qty, title, added_at: new Date().toISOString(),
});

describe('useStockValidation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns isValid true when all items have sufficient stock', async () => {
    mockProducts([
      { id: 'p1', title: 'A', stock: 10, is_active: true },
      { id: 'p2', title: 'B', stock: 5, is_active: true },
    ]);

    const { result } = renderHook(() => useStockValidation());
    let validation: any;

    await act(async () => {
      validation = await result.current.validateStock([makeItem('p1', 2), makeItem('p2', 3)]);
    });

    expect(validation.isValid).toBe(true);
    expect(validation.invalidItems).toHaveLength(0);
  });

  it('returns invalid items when stock < requested', async () => {
    mockProducts([
      { id: 'p1', title: 'Widget', stock: 1, is_active: true },
    ]);

    const { result } = renderHook(() => useStockValidation());
    let validation: any;

    await act(async () => {
      validation = await result.current.validateStock([makeItem('p1', 5, 'Widget')]);
    });

    expect(validation.isValid).toBe(false);
    expect(validation.invalidItems).toHaveLength(1);
    expect(validation.invalidItems[0].available).toBe(1);
    expect(validation.invalidItems[0].requested).toBe(5);
  });

  it('handles inactive products', async () => {
    mockProducts([
      { id: 'p1', title: 'Inactive Item', stock: 10, is_active: false },
    ]);

    const { result } = renderHook(() => useStockValidation());
    let validation: any;

    await act(async () => {
      validation = await result.current.validateStock([makeItem('p1', 1)]);
    });

    expect(validation.isValid).toBe(false);
    expect(validation.invalidItems[0].available).toBe(0);
  });

  it('handles missing products gracefully', async () => {
    mockProducts([]); // product not found

    const { result } = renderHook(() => useStockValidation());
    let validation: any;

    await act(async () => {
      validation = await result.current.validateStock([makeItem('missing', 1, 'Ghost')]);
    });

    expect(validation.isValid).toBe(false);
    expect(validation.invalidItems[0].title).toBe('Ghost');
    expect(validation.invalidItems[0].available).toBe(0);
  });

  it('handles Supabase errors gracefully', async () => {
    mockProducts(null, { message: 'DB error' });

    const { result } = renderHook(() => useStockValidation());
    let validation: any;

    await act(async () => {
      validation = await result.current.validateStock([makeItem('p1', 1)]);
    });

    expect(validation.isValid).toBe(false);
    expect(validation.invalidItems).toHaveLength(0);
  });
});
