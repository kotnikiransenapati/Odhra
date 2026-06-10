---
name: Unified Order Timeline
description: Reusable OrderTimeline component for order detail, tracking, and email previews. Handles vertical/horizontal layouts, current status highlighting, and terminal cancelled/refunded states.
type: feature
---
`src/components/orders/OrderTimeline.tsx` accepts `steps` (with optional `timestamp`), `currentStatus`, and `variant: "vertical" | "horizontal"`. Cancelled/refunded statuses replace the trailing steps with a single terminal node styled with `bg-destructive`. Reused in OrderTracking, OrderDetail, and any future email/PDF preview. Framer Motion stagger respects global stiffness 400/damping 30.
