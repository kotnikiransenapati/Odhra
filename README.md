# Odhra Market Elevate

This is the "God-Tier" Engineering Manifest for Odhra. This prompt is designed for high-end AI coding agents (like Cursor, Windsurf, or a Senior Full-Stack Engineer) to build a production-ready, scalable, and aesthetically superior marketplace.
The Odhra Master Blueprint: High-Performance Multi-Vendor Architecture
Project Persona: Odhra is a luxury-tech marketplace. The vibe is "Apple Store meets High-Fashion Digital Gallery." It must feel fast (Sub-100ms interactions), look expensive (Glassmorphism, fluid motion), and be unhackable.
I. Full-Stack Technical Stack & Infrastructure
 * Framework: Next.js 15 (App Router) with React Server Components (RSC).
 * Language: Strict TypeScript.
 * Styling: Tailwind CSS + Framer Motion (for 60fps animations) + Shadcn/UI (customized).
 * Database: PostgreSQL (via Prisma ORM) with Neon or Supabase.
 * Caching/State: Redis for session/rate-limiting, TanStack Query for frontend state.
 * Search Engine: Algolia or Meilisearch for ultra-fast "search-as-you-type."
 * Security: NextAuth.js (v5), Jose (JWT), Zod (Validation), Iron Session.
II. Detailed Page-by-Page Requirements
1. The Customer Storefront (Aesthetic & Conversion-Centric)
 * Global Navigation: Floating glassmorphism blur effect, mega-menu with image previews, real-time cart count, and "Smart Search" (AI-powered fuzzy search).
 * Homepage: * Hero: Full-bleed video or high-res parallax slider.
   * Dynamic Sections: Bento-grid category layouts, "Recently Viewed" personalized tracks, and "Trending near [User Location]."
 * Product Listing Page (PLP):
   * Elements: Infinite scroll (no pagination), skeletal loading states, "Quick View" overlays, and side-bar faceted filters (Color swatches, price range sliders, material types).
 * Product Detail Page (PDP):
   * Visuals: Multi-angle image gallery with 4K zoom, 360-degree rotation view (using Three.js if possible).
   * Logic: Dynamic price updates based on variants (Size/Color), "Frequently Bought Together" bundle logic, and real-time stock status (e.g., "Only 2 left!").
 * Advanced Checkout: * One-Page Flow: Address validation (Google Maps API), Multi-vendor shipping split (shows separate delivery dates for different sellers), and "1-Click Pay" for returning users.
2. The Vendor Command Center (Data-Driven)
 * Onboarding: AI-assisted KYC (OCR for GST/ID cards), bank account verification via micro-deposits.
 * Inventory 2.0: * AI Tooling: Button to "Generate SEO Description" and "Remove Image Background" using Cloudinary/Replicate API.
   * Bulk Actions: Excel/CSV drag-and-drop with real-time error highlighting.
 * Order Fulfillment: Integrated shipping label generation (PDF), "Pick-up request" button, and automated return-dispute handling.
 * Financial Hub: Detailed revenue charts (Recharts), commission breakdown, tax (GST) invoices, and "Instant Payout" requests.
3. The Super Admin "Odhra Eye" (Total Control)
 * Global Metrics: Real-time heatmaps of user activity, GMV (Gross Merchandise Value) tickers, and server health monitors.
 * Moderation Engine: AI-flagged reviews (sentiment analysis), suspicious product detection, and vendor "Trust Score" management.
 * Marketing CMS: A drag-and-drop builder to change homepage banners, create "Flash Sale" events, and send push notifications/SMS via Twilio.
III. Backend Logic & Advanced Security
1. Coordination Logic
 * The Split-Order System: When a user checks out, the backend must generate a Master Order ID and separate Sub-Order IDs for each vendor.
 * Escrow Payment Flow: Customer pays \rightarrow Funds held in Odhra Escrow \rightarrow Delivery Confirmed \rightarrow Return Period expires \rightarrow Funds released to Vendor wallet minus Odhra commission.
 * Inventory Synchronization: Use Optimistic Locking to prevent "Double Selling" during high-traffic sales.
2. Security Protocols (Non-Negotiable)
 * Zero Trust Architecture: Every API request must be validated for Role (Admin vs. Vendor vs. User).
 * Rate Limiting: Upstash/Redis to prevent DDoS on Login and Search endpoints.
 * Data Encryption: Sensitive vendor data (Bank details/GST) encrypted using AES-256-GCM.
 * Content Security Policy (CSP): Strict headers to prevent XSS and Clickjacking.
IV. The "Vibe Coding" Execution Prompt
Copy and paste this into your AI coding environment:
> "Build a high-end Multi-Vendor Marketplace named Odhra.
> Architecture: Use Next.js 15 App Router, TypeScript, and Prisma. The UI must be a 'Modern Dark/Light' theme using Tailwind and Framer Motion.
> Database Schema: > - User: (id, email, password, role: USER/VENDOR/ADMIN, address_book)
>  * Vendor: (id, brand_name, bio, logo, is_verified, balance)
>  * Product: (id, title, description_html, price, stock, variants_json, vendor_id, category_id)
>  * Order: (id, customer_id, total_amount, status: PENDING/PAID/SHIPPED/DELIVERED)
>  * SubOrder: (id, parent_order_id, vendor_id, sub_total, tracking_number)
> Specific Logic: > 1. Implement a Search Component using a debounce hook and fuzzy search logic.
> 2. Create a Cart Context that handles multi-vendor item grouping.
> 3. Build a Vendor Dashboard with a sidebar containing: Overview, Inventory, Orders, and Wallet.
> 4. Use Zod for all form validations (Login, Product Upload, Address).
> 5. Implement Stripe/Razorpay Webhooks to update order status automatically upon payment.
> Aesthetic Directive: Use Inter font, 16px base size, soft border-radius (12px-24px), and subtle 'glass' effects on cards. All buttons must have a slight scale-down effect on click."
> 
Endemic sure you only uses real data and admin panel having full access over discount coupons spin wheel and many more.    And I added the list of features which I want ,makes sure you add those also

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://odhra1.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/87270728-632f-48bd-84d4-b4e4e8c96d98).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
