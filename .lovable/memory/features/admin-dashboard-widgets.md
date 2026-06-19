---
name: Admin Dashboard Widgets
description: Personalized per-admin widget grid with reorder, resize, visibility toggle, and seeded defaults
type: feature
---
**Table**: `admin_dashboard_widgets` (admin_id, widget_key UNIQUE per admin, title, position, size small/medium/large/full, config JSONB, is_visible).

**RPCs**:
- `admin_widgets_seed()` — inserts 8 default widgets (kpi_revenue, kpi_orders, kpi_customers, kpi_aov, chart_revenue_7d, recent_orders, low_stock, pending_reviews) on first call.
- `admin_widgets_list()` — returns own widgets ordered by position.
- `admin_widgets_reorder(_ids UUID[])` — sets position from array order.

**RLS**: admins manage only their own.

**UI**: `AdminDashboardWidgets.tsx` at Admin → System → Dashboard Widgets. Grid uses Tailwind `col-span` mapping per size; Edit mode exposes size select, visibility switch, up/down arrows. Reset button purges admin's customizations to re-seed defaults next load.

**Sizes**: small=1col / medium=2cols / large=3cols / full=col-span-full on the sm/md grid.
