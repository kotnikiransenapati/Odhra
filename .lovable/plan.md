

# Production Performance Plan — Implementation

## Summary

5 targeted changes across 4 files to flatten the critical request chain, defer below-fold data fetching, add ARIA carousel semantics, and enhance structured data for SEO. Zero UI/feature changes.

## Changes

### 1. `src/pages/Index.tsx` — Defer sections 14-17 with `DeferredSection`

Sections 14-17 (CategoryShowcase, RecommendedProducts, CustomerStories, DeliveryReviews) currently use plain `Suspense` but trigger data fetches on mount. Wrap each in `DeferredSection` so JS loading and API calls only happen when scrolled near.

Also wrap RecentlyViewedWidget in `DeferredSection` since it's at the bottom.

```text
Before:  <Suspense><AnimatedSection><CategoryShowcase /></AnimatedSection></Suspense>
After:   <DeferredSection><Suspense><AnimatedSection><CategoryShowcase /></AnimatedSection></Suspense></DeferredSection>
```

Same pattern for sections 15, 16, 17, and RecentlyViewedWidget.

### 2. `src/components/home/HeroSlider.tsx` — Add ARIA carousel semantics

Add `role="region"`, `aria-roledescription="carousel"`, and `aria-label` to the container. Add `aria-live="off"` (since auto-rotating; switches to `polite` when paused). Add `role="group"` and `aria-roledescription="slide"` to each slide.

Changes to the container `div`:
```tsx
<div
  ref={containerRef}
  className="relative w-full touch-pan-y"
  role="region"
  aria-roledescription="carousel"
  aria-label="Featured promotions"
  onMouseEnter={() => setIsAutoPlaying(false)}
  onMouseLeave={() => setIsAutoPlaying(true)}
>
```

Add `aria-live` to the slide area:
```tsx
<motion.div
  className="relative w-full ..."
  aria-live={isAutoPlaying ? 'off' : 'polite'}
  ...
>
```

Add slide role to each `motion.div` inside AnimatePresence:
```tsx
<motion.div
  key={slide.id}
  role="group"
  aria-roledescription="slide"
  aria-label={`Slide ${currentSlide + 1} of ${slides.length}: ${slide.title}`}
  ...
>
```

### 3. `src/components/SEOHead.tsx` — Homepage gets combined Organization + WebSite JSON-LD

Update `organizationJsonLd` to be a combined array that includes both Organization and WebSite schemas. This gives Google the SearchAction for sitelinks and the Organization info in one payload.

```typescript
export const homepageJsonLd = [
  organizationJsonLd,
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Odhra',
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/shop?search={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  },
];
```

Update `Index.tsx` to use `homepageJsonLd` instead of `organizationJsonLd`.

Update SEOHead to handle `jsonLd` being an array — stringify the array directly for Google's `@graph` support.

### 4. `index.html` — Add modulepreload for critical vendor chunks

Add `<link rel="modulepreload">` hints after the existing preconnect/preload tags for the two heaviest vendor chunks. Since hashed filenames change on each build, use a Vite HTML plugin approach instead — add an inline script that discovers and preloads vendor chunks from the module graph.

Actually, the simpler approach: Vite already emits `<link rel="modulepreload">` for direct imports in the entry chunk. The issue is lazy imports creating waterfalls. The real fix is already handled by deferring sections (change 1) and the existing preconnect hints. No `index.html` modulepreload changes needed — they'd break on each build due to hash changes.

## Files Modified

| File | Change |
|------|--------|
| `src/pages/Index.tsx` | Wrap sections 14-17 + RecentlyViewed in `DeferredSection`; use `homepageJsonLd` |
| `src/components/home/HeroSlider.tsx` | Add ARIA carousel attributes |
| `src/components/SEOHead.tsx` | Add `homepageJsonLd` export; support array JSON-LD |

## What Does NOT Change
- All visual design, animations, and UX behavior
- Admin panel, vendor dashboard, tracking hooks
- Auth flow, cart, checkout
- Database schema, edge functions, RLS policies

