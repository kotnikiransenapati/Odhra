import { describe, it, expect, vi } from 'vitest';
// @ts-ignore - testing library types
import { screen } from '@testing-library/react';
import { render } from '@/test/test-utils';
import React from 'react';

vi.mock('@/hooks/useWishlist', () => ({
  useWishlistCount: () => ({ data: 0 }),
}));

vi.mock('@/contexts/CartContext', () => ({
  useCart: () => ({ items: [], isLoading: false, isOpen: false, setIsOpen: vi.fn(), itemCount: 0, subtotal: 0 }),
}));

// Mock all lazy-loaded components to avoid dynamic import side effects
vi.mock('@/components/layout/MegaMenu', () => ({
  MegaMenu: () => null,
}));
vi.mock('@/components/layout/CurrencySelector', () => ({
  CurrencySelector: () => null,
}));
vi.mock('@/components/layout/LanguageSwitcher', () => ({
  LanguageSwitcher: () => null,
}));
vi.mock('@/components/cart/MiniCartDropdown', () => ({
  MiniCartDropdown: () => null,
}));
vi.mock('@/components/notifications/NotificationCenter', () => ({
  NotificationCenter: () => null,
}));
vi.mock('@/components/search/GlobalSearchModal', () => ({
  GlobalSearchModal: () => null,
}));
vi.mock('@/components/theme/ThemeToggle', () => ({
  ThemeToggle: () => null,
}));

const mockAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuth(),
}));

import { Navbar } from '../Navbar';

describe('Navbar', () => {
  it('renders logo/brand link', () => {
    mockAuth.mockReturnValue({ user: null, isAdmin: false, isVendor: false, signOut: vi.fn() });
    render(<Navbar />);
    expect(screen.getByText('Odhra')).toBeInTheDocument();
  });

  it('shows Shop All link', () => {
    mockAuth.mockReturnValue({ user: null, isAdmin: false, isVendor: false, signOut: vi.fn() });
    render(<Navbar />);
    expect(screen.getByText('Shop All')).toBeInTheDocument();
  });

  it('shows Sign In button when unauthenticated', () => {
    mockAuth.mockReturnValue({ user: null, isAdmin: false, isVendor: false, signOut: vi.fn() });
    render(<Navbar />);
    expect(screen.getByText('Sign In')).toBeInTheDocument();
  });

  it('shows user avatar when authenticated', () => {
    mockAuth.mockReturnValue({
      user: { id: 'u1', email: 'test@test.com', user_metadata: { full_name: 'Test User' } },
      isAdmin: false, isVendor: false, signOut: vi.fn(),
    });
    render(<Navbar />);
    // Avatar fallback shows initials
    const initials = screen.getAllByText('TU');
    expect(initials.length).toBeGreaterThanOrEqual(1);
  });
});
