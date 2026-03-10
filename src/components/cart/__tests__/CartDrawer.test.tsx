import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@/test/test-utils';
import React from 'react';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag) => ({ children, ...props }: any) => React.createElement(tag as string, props, children) }),
  AnimatePresence: ({ children }: any) => children,
}));

vi.mock('@/components/ui/ProgressBar', () => ({
  FreeShippingProgress: () => null,
}));

const mockUseCart = vi.fn();
vi.mock('@/contexts/CartContext', () => ({
  useCart: () => mockUseCart(),
}));

import { CartDrawer } from '../CartDrawer';

describe('CartDrawer', () => {
  it('shows empty state when no items and open', () => {
    mockUseCart.mockReturnValue({
      items: [], isOpen: true, setIsOpen: vi.fn(), isLoading: false,
      updateQuantity: vi.fn(), removeItem: vi.fn(), itemCount: 0, subtotal: 0,
    });

    render(<CartDrawer />);
    expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
    expect(screen.getByText('Start Shopping')).toBeInTheDocument();
  });

  it('shows cart title with item count', () => {
    mockUseCart.mockReturnValue({
      items: [{ product_id: 'p1', quantity: 2, title: 'Test Item', price: 300, slug: 'test', added_at: new Date().toISOString() }],
      isOpen: true, setIsOpen: vi.fn(), isLoading: false,
      updateQuantity: vi.fn(), removeItem: vi.fn(), itemCount: 2, subtotal: 600,
    });

    render(<CartDrawer />);
    expect(screen.getByText('Your Cart (2)')).toBeInTheDocument();
  });

  it('renders item details when items exist', () => {
    mockUseCart.mockReturnValue({
      items: [{ product_id: 'p1', quantity: 1, title: 'Premium Widget', price: 999, slug: 'premium-widget', added_at: new Date().toISOString() }],
      isOpen: true, setIsOpen: vi.fn(), isLoading: false,
      updateQuantity: vi.fn(), removeItem: vi.fn(), itemCount: 1, subtotal: 999,
    });

    render(<CartDrawer />);
    expect(screen.getByText('Premium Widget')).toBeInTheDocument();
    expect(screen.getByText('Checkout Securely')).toBeInTheDocument();
  });

  it('shows subtotal', () => {
    mockUseCart.mockReturnValue({
      items: [{ product_id: 'p1', quantity: 2, title: 'Item', price: 500, slug: 'item', added_at: new Date().toISOString() }],
      isOpen: true, setIsOpen: vi.fn(), isLoading: false,
      updateQuantity: vi.fn(), removeItem: vi.fn(), itemCount: 2, subtotal: 1000,
    });

    render(<CartDrawer />);
    expect(screen.getByText('Subtotal')).toBeInTheDocument();
    expect(screen.getByText('₹1,000')).toBeInTheDocument();
  });
});
