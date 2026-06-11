---
name: Geo-Block Rules
description: Country-level allow/deny lists per scope (signup, checkout, admin, api)
type: feature
---
- Table: `public.geo_block_rules` (scope, country_code, mode allow|deny, reason, active). Unique (scope, country).
- RLS: admin-only via `admin_has_permission('manage_admins')`.
- Helper: `is_country_blocked(_scope,_country)` — if any allow rules exist for scope, switches to allow-list mode; otherwise checks deny rules.
- Admin RPCs: `admin_geo_rules_list`, `admin_upsert_geo_rule`, `admin_delete_geo_rule` (all audit-logged).
- UI: `src/components/admin/GeoBlockRules.tsx`, tab id `geo-blocks` (Admin → System).
