import { describe, it, expect, vi } from 'vitest';
import { screen, render } from '@/test/test-utils';
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

vi.mock('@/components/layout/Navbar', () => ({
  Navbar: () => <nav>Navbar</nav>,
}));

vi.mock('@/components/SEOHead', () => ({
  SEOHead: () => null,
}));

vi.mock('@/hooks/useCheckout', () => ({
  useCheckout: () => ({
    initiatePayment: vi.fn(), placeCODOrder: vi.fn(), isLoading: false,
    subtotal: 1000, tax: 180, total: 1180, orderNumber: null,
  }),
}));

vi.mock('@/hooks/useStockValidation', () => ({
  useStockValidation: () => ({ validateStock: vi.fn(), isValidating: false }),
}));

vi.mock('@/hooks/usePromoCode', () => ({
  usePromoCode: () => ({ promoCode: '', setPromoCode: vi.fn(), isValidating: false, validation: { isValid: false, discount: 0 }, applyPromoCode: vi.fn(), clearPromoCode: vi.fn() }),
}));

vi.mock('@/hooks/useFunnelAnalytics', () => ({
  useFunnelAnalytics: () => ({ trackBeginCheckout: vi.fn(), trackPageView: vi.fn() }),
}));

vi.mock('@/hooks/useShippingCost', () => ({
  useShippingCost: () => ({ estimate: null, isLoading: false }),
  getEstimatedDeliveryDate: () => new Date(),
  formatDeliveryDate: () => 'Tomorrow',
}));

vi.mock('@/hooks/usePincodeAutofill', () => ({
  usePincodeAutofill: () => ({ data: null, isLoading: false }),
}));

vi.mock('@/components/cart/PromoCodeInput', () => ({
  PromoCodeInput: () => null,
}));

vi.mock('@/components/checkout/AddressBookPicker', () => ({
  AddressBookPicker: () => null,
}));

vi.mock('@/components/ui/ProgressBar', () => ({
  CheckoutProgress: () => <div data-testid="checkout-progress">Progress</div>,
}));

const mockUseCart = vi.fn();
vi.mock('@/contexts/CartContext', () => ({
  useCart: () => mockUseCart(),
}));

import Checkout from '../Checkout';

describe('Checkout Page', () => {
  it('shows empty state when cart is empty', () => {
    mockUseCart.mockReturnValue({
      items: [], isLoading: false, removeItem: vi.fn(),
    });

    render(<Checkout />);
    expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
    expect(screen.getByText('Continue Shopping')).toBeInTheDocument();
  });

  it('renders address form fields when cart has items', () => {
    mockUseCart.mockReturnValue({
      items: [{ product_id: 'p1', quantity: 1, title: 'Test', price: 500, slug: 'test', added_at: new Date().toISOString() }],
      isLoading: false, removeItem: vi.fn(),
    });

    render(<Checkout />);
    expect(screen.getByText('Checkout')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('John Doe')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('9876543210')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/House\/Flat/i)).toBeInTheDocument();
  });

  it('renders payment method selection', () => {
    mockUseCart.mockReturnValue({
      items: [{ product_id: 'p1', quantity: 1, title: 'Test', price: 500, slug: 'test', added_at: new Date().toISOString() }],
      isLoading: false, removeItem: vi.fn(),
    });

    render(<Checkout />);
    expect(screen.getByText(/Pay Online/i)).toBeInTheDocument();
    expect(screen.getByText(/Cash on Delivery/i)).toBeInTheDocument();
  });
});
