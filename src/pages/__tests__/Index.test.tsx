import { describe, it, expect, vi } from 'vitest';
// @ts-ignore - testing library types
import { screen } from '@testing-library/react';
import { render } from '@/test/test-utils';

// Mock all heavy dependencies
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, isAdmin: false, isVendor: false, signOut: vi.fn(), isLoading: false, session: null, roles: [], refreshRoles: vi.fn() }),
}));

vi.mock('@/contexts/CartContext', () => ({
  useCart: () => ({ items: [], isLoading: false, isOpen: false, setIsOpen: vi.fn(), addItem: vi.fn(), updateQuantity: vi.fn(), removeItem: vi.fn(), clearCart: vi.fn(), itemCount: 0, subtotal: 0 }),
}));

vi.mock('@/hooks/useWishlist', () => ({
  useWishlistCount: () => ({ data: 0 }),
}));

vi.mock('@/hooks/useHomepageCMS', () => ({
  useHomepageSections: () => ({ data: [] }),
  usePromoStripContent: () => ({ data: null }),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag) => ({ children, ...props }: any) => React.createElement(tag as string, props, children) }),
  AnimatePresence: ({ children }: any) => children,
}));

import React, { Suspense } from 'react';

// Mock lazy-loaded components to avoid async loading issues in tests
vi.mock('@/components/home/HeroSlider', () => ({
  HeroSlider: () => <div data-testid="hero-slider">Hero Slider</div>,
}));

vi.mock('@/components/home/PromoStrip', () => ({
  PromoStrip: () => null,
}));

vi.mock('@/components/home/QuickServices', () => ({
  QuickServices: () => <div data-testid="quick-services">Quick Services</div>,
}));

vi.mock('@/components/home/CategoryTabs', () => ({
  CategoryTabs: () => <div data-testid="category-tabs">Category Tabs</div>,
}));

vi.mock('@/components/SEOHead', () => ({
  SEOHead: () => null,
  organizationJsonLd: {},
  homepageJsonLd: [],
}));

vi.mock('@/components/layout/Navbar', () => ({
  Navbar: () => <nav data-testid="navbar">Navbar</nav>,
}));

vi.mock('@/components/layout/BottomNavigation', () => ({
  BottomNavigation: () => <nav data-testid="bottom-nav">Bottom Nav</nav>,
}));

// Import after mocks
import Index from '../Index';

describe('Index (Homepage)', () => {
  it('renders without crashing', () => {
    render(<Index />);
    expect(document.querySelector('.min-h-screen')).toBeInTheDocument();
  });

  it('renders Navbar', () => {
    render(<Index />);
    expect(screen.getByTestId('navbar')).toBeInTheDocument();
  });

  it('renders main content area', () => {
    render(<Index />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('renders BottomNavigation', () => {
    render(<Index />);
    expect(screen.getByTestId('bottom-nav')).toBeInTheDocument();
  });
});
