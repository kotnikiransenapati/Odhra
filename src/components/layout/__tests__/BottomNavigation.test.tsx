import { describe, it, expect, vi } from 'vitest';
// @ts-ignore - testing library types
import { screen } from '@testing-library/react';
import React from 'react';
import { render as rtlRender } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock('@/hooks/useWishlist', () => ({
  useWishlistCount: () => ({ data: 0 }),
}));

const mockCartItems = vi.fn();
vi.mock('@/contexts/CartContext', () => ({
  useCart: () => ({ items: mockCartItems() }),
}));

vi.mock('@/lib/haptics', () => ({
  haptic: vi.fn(),
}));

import { BottomNavigation } from '../BottomNavigation';

function renderWithRouter(ui: React.ReactElement, initialRoute = '/') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return rtlRender(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <TooltipProvider>{ui}</TooltipProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('BottomNavigation', () => {
  it('renders 5 nav items', () => {
    mockCartItems.mockReturnValue([]);
    renderWithRouter(<BottomNavigation />);
    const nav = screen.getByLabelText('Main navigation');
    const buttons = nav.querySelectorAll('button');
    expect(buttons.length).toBe(5);
  });

  it('shows labels for Home, Shop, Cart, Wishlist, Profile', () => {
    mockCartItems.mockReturnValue([]);
    renderWithRouter(<BottomNavigation />);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Shop')).toBeInTheDocument();
    expect(screen.getByText('Cart')).toBeInTheDocument();
    expect(screen.getByText('Wishlist')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  it('hides on /auth path', () => {
    mockCartItems.mockReturnValue([]);
    const { container } = renderWithRouter(<BottomNavigation />, '/auth');
    expect(container.querySelector('nav')).toBeNull();
  });

  it('shows cart badge when items exist', () => {
    mockCartItems.mockReturnValue([
      { product_id: 'p1', quantity: 3 },
      { product_id: 'p2', quantity: 2 },
    ]);
    renderWithRouter(<BottomNavigation />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });
});
