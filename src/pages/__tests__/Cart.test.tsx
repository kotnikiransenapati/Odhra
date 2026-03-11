import { describe, it, expect, vi } from 'vitest';
// @ts-ignore - testing library types
import { screen } from '@testing-library/react';
import { render } from '@/test/test-utils';
import React from 'react';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag) => ({ children, ...props }: any) => React.createElement(tag as string, props, children) }),
  AnimatePresence: ({ children }: any) => children,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, isAdmin: false, isVendor: false, signOut: vi.fn(), isLoading: false, session: null, roles: [], refreshRoles: vi.fn() }),
}));

vi.mock('@/hooks/useWishlist', () => ({
  useWishlistCount: () => ({ data: 0 }),
}));

vi.mock('@/components/SEOHead', () => ({
  SEOHead: () => null,
}));

vi.mock('@/components/layout/Navbar', () => ({
  Navbar: () => <nav data-testid="navbar">Navbar</nav>,
}));

vi.mock('@/components/layout/BottomNavigation', () => ({
  BottomNavigation: () => null,
}));

vi.mock('@/hooks/useCartAbandonment', () => ({
  useCartRecovery: () => ({ isRecovering: false }),
}));

vi.mock('@/hooks/useShareCart', () => ({
  useShareCart: () => ({ isSharing: false, shareUrl: null, generateShareLink: vi.fn(), shareViaChannel: vi.fn() }),
}));

vi.mock('@/hooks/usePromoCode', () => ({
  usePromoCode: () => ({ promoCode: '', setPromoCode: vi.fn(), isValidating: false, validation: { isValid: false, discount: 0 }, applyPromoCode: vi.fn(), clearPromoCode: vi.fn() }),
}));

vi.mock('@/components/cart/PromoCodeInput', () => ({
  PromoCodeInput: () => null,
}));

vi.mock('@/components/ui/ProgressBar', () => ({
  FreeShippingProgress: () => null,
}));

vi.mock('@/components/ui/TrustSignals', () => ({
  ProductTrustBadges: () => null,
  GuaranteeBadge: () => null,
}));

const mockUseCart = vi.fn();
vi.mock('@/contexts/CartContext', () => ({
  useCart: () => mockUseCart(),
}));

import Cart from '../Cart';

describe('Cart Page', () => {
  it('shows empty cart message when no items', () => {
    mockUseCart.mockReturnValue({
      items: [], isLoading: false, updateQuantity: vi.fn(), removeItem: vi.fn(),
      clearCart: vi.fn(), itemCount: 0, subtotal: 0,
    });

    render(<Cart />);
    // "Your cart is empty" appears as both subtitle and heading; verify at least one exists
    const emptyMessages = screen.getAllByText('Your cart is empty');
    expect(emptyMessages.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Explore Trending/i)).toBeInTheDocument();
  });

  it('shows loading spinner when loading', () => {
    mockUseCart.mockReturnValue({
      items: [], isLoading: true, updateQuantity: vi.fn(), removeItem: vi.fn(),
      clearCart: vi.fn(), itemCount: 0, subtotal: 0,
    });

    render(<Cart />);
    // Loader2 renders an SVG with animate-spin class
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders cart items with title and quantity', () => {
    mockUseCart.mockReturnValue({
      items: [
        { product_id: 'p1', quantity: 2, title: 'Test Product', price: 500, slug: 'test', added_at: new Date().toISOString() },
      ],
      isLoading: false, updateQuantity: vi.fn(), removeItem: vi.fn(),
      clearCart: vi.fn(), itemCount: 2, subtotal: 1000,
    });

    render(<Cart />);
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Shopping Cart')).toBeInTheDocument();
  });
});
