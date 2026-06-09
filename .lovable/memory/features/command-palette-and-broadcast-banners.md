---
name: Phase C — Command Palette & Broadcast Banners
description: Cmd/Ctrl+K admin command palette navigates via ?tab= search param; site-wide GlobalBroadcastBanner mounted in App.tsx reads broadcast_banners table with realtime subs; admin BroadcastBannerManager tab manages variants/audience/schedule
type: feature
---
- Command palette: `src/components/admin/AdminCommandPalette.tsx`. Mounted inside AdminDashboard root. Update ACTIONS to add new shortcuts.
- Banner table: `broadcast_banners` — public SELECT policy filters by enabled/starts_at/ends_at; admin-only writes.
- Audience targeting (all/customers/vendors/admins) is enforced client-side using `useAuth().isAdmin/isVendor`.
- Dismissals stored in localStorage key `dismissed_banners_v1` (array of banner ids).
- Admin tab id: `broadcast-banners`, gated by `manage_cms` permission.
