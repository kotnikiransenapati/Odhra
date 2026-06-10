---
name: API Rate Limit Policy Manager
description: Admin-configurable rate limit policies with scopes (global/endpoint/user/ip/vendor), burst multipliers, and throttle/block/log-only actions
type: feature
---
Defines rate-limit rules consumed by edge functions and middleware.

**Table**: `public.api_rate_limit_policies`
- Scopes: global, endpoint, user, ip, vendor
- Actions: throttle (429), block, log_only
- Fields: window_seconds, max_requests, burst_multiplier (≥1.0)
- Unique constraint on `name`. `updated_at` auto-touched via trigger.

**RPCs** (all require `manage_admins`, audit-logged):
- `admin_upsert_rate_limit_policy(id, name, scope, endpoint_pattern, window_seconds, max_requests, burst_multiplier, action, is_active, description)` → uuid
- `admin_toggle_rate_limit_policy(id, is_active)`
- `admin_delete_rate_limit_policy(id)`

**UI**: `src/components/admin/ApiRateLimitPolicies.tsx` (route `rate-limit-policies`) — list + create/edit dialog with switch toggle.
