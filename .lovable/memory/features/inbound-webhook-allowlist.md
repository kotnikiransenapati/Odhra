---
name: Inbound Webhook IP Allowlist
description: Per-provider CIDR allowlist for incoming webhooks with verify helper
type: feature
---
- Table: `public.inbound_webhook_allowlist` (provider, label, cidr, endpoint_path, active, expires_at, notes).
- RLS gated on `manage_admins`; service_role full access. Index on (provider, active).
- Helper `is_inbound_webhook_ip_allowed(_provider, _ip)`:
  - Returns true when **no active rules** exist for the provider (allow-all default).
  - Otherwise returns true only when the inet IP `<<=` one of the active/non-expired CIDRs.
  - Edge functions should call this before processing payloads (in addition to signature checks).
- Admin RPCs (audit-logged): `admin_inbound_webhook_list`, `admin_upsert_inbound_webhook_rule(_id…)`, `admin_delete_inbound_webhook_rule`.
- UI: `src/components/admin/InboundWebhookAllowlist.tsx`, tab id `inbound-webhook-allowlist` (Admin → System). Grouped by provider with expiry awareness.
