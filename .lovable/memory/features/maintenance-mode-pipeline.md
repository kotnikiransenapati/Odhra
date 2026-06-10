---
name: Maintenance Mode Pipeline
description: maintenance_windows table + is_maintenance_active() public RPC + withMaintenanceGuard() edge middleware + admin panel at System → Maintenance
type: feature
---
- Table `maintenance_windows(scope, reason, allow_admins, starts_at, ends_at)`. `scope='global'` blocks everything; otherwise per-service.
- `is_maintenance_active(_service)` is SECURITY DEFINER + STABLE, callable by anon/authenticated/service_role — cheap gate.
- RPCs `admin_start_maintenance` / `admin_end_maintenance` are admin-only and audit-logged.
- Edge helper `supabase/functions/_shared/maintenanceGuard.ts` exports `withMaintenanceGuard(service, handler, ttl_ms=15000)` returning a `503` JSON envelope with `Retry-After: 60` while a window is open. Caches the lookup for 15s.
- UI: `src/components/admin/MaintenanceModePanel.tsx` — banner of active windows, "Start Maintenance" dialog, end-now button.
- Admin route id: `maintenance`, permission `manage_feature_flags`.
