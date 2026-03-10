

# Comprehensive Frontend Testing Plan

## Scope

Add tests for 4 critical user flows across 8 new test files. All tests mock Supabase and context providers — no network calls.

## Test Files to Create

### 1. `src/contexts/__tests__/CartContext.test.tsx`
Test the CartContext provider in isolation by mocking Supabase:
- Initial state: empty items, itemCount=0, subtotal=0
- `addItem` updates items array and opens drawer
- `updateQuantity` changes quantity; removes item when quantity ≤ 0
- `removeItem` filters out the item
- `clearCart` resets to empty
- `itemCount` and `subtotal` computed correctly from items

### 2. `src/pages/__tests__/Index.test.tsx`
Test homepage renders critical above-fold content:
- Renders without crashing (smoke test)
- Shows Navbar component
- Shows HeroSlider section
- Shows BottomNavigation on mobile viewport

### 3. `src/pages/__tests__/Cart.test.tsx`
Test Cart page rendering states:
- Empty cart shows "empty" message and CTA to shop
- Loading state shows spinner
- With items: renders item titles, quantities, subtotal, checkout button

### 4. `src/pages/__tests__/Checkout.test.tsx`
Test Checkout page:
- Redirects/shows empty state when cart is empty
- Renders address form fields (name, phone, address, city, state, pincode)
- Renders payment method selection (Online / COD)
- Renders order summary sidebar

### 5. `src/components/layout/__tests__/Navbar.test.tsx`
- Renders logo/brand link
- Shows Shop link
- Shows sign-in button when unauthenticated
- Shows user dropdown when authenticated (mock useAuth)

### 6. `src/components/layout/__tests__/BottomNavigation.test.tsx`
- Renders 5 nav items: Home, Shop, Cart, Wishlist, Profile
- Highlights active route
- Hides on /auth and /checkout paths
- Shows cart badge when items exist

### 7. `src/components/cart/__tests__/CartDrawer.test.tsx`
- Renders sheet with cart items when open
- Shows empty state when no items
- Quantity +/- buttons call updateQuantity
- Remove button calls removeItem
- Shows subtotal and checkout link

### 8. `src/hooks/__tests__/useStockValidation.test.ts`
- Returns `isValid: true` when all items have sufficient stock
- Returns invalid items when stock < requested quantity
- Handles missing/inactive products
- Handles Supabase errors gracefully

## Mocking Strategy

All tests mock these modules:
- `@/integrations/supabase/client` — mock `supabase.from().select()` chains
- `@/contexts/AuthContext` — mock `useAuth` returning `{ user: null }` or a fake user
- `@/contexts/CartContext` — mock `useCart` for component tests that consume cart
- `@/hooks/useWishlist` — mock `useWishlistCount` returning `{ data: 0 }`
- `sonner` — mock `toast` to prevent side effects
- `framer-motion` — pass-through mock for animation components

All component tests use the existing `src/test/test-utils.tsx` custom render with QueryClient + BrowserRouter + TooltipProvider.

## Files to Create

| File | Tests | Focus |
|------|-------|-------|
| `src/contexts/__tests__/CartContext.test.tsx` | 6 | Cart state logic |
| `src/pages/__tests__/Index.test.tsx` | 3 | Homepage smoke |
| `src/pages/__tests__/Cart.test.tsx` | 3 | Cart page states |
| `src/pages/__tests__/Checkout.test.tsx` | 3 | Checkout form |
| `src/components/layout/__tests__/Navbar.test.tsx` | 3 | Top nav |
| `src/components/layout/__tests__/BottomNavigation.test.tsx` | 4 | Bottom nav |
| `src/components/cart/__tests__/CartDrawer.test.tsx` | 4 | Cart drawer |
| `src/hooks/__tests__/useStockValidation.test.ts` | 4 | Stock validation |

**Total: ~30 test cases across 8 files**

No existing files are modified. All new test files only.

