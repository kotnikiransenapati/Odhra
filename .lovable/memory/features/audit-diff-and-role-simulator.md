---
name: Phase C — Audit diff viewer & role simulator
description: AuditDiffViewer renders field-level added/removed/changed paths from old_values/new_values jsonb; RoleSimulator admin tab provides iframe-based preview as guest/customer/vendor/admin with device size switcher
type: feature
---
- AuditDiffViewer: recursive diff of nested jsonb, sorted by path; integrated into AuditLogViewer detail panel replacing the raw JSON dump.
- RoleSimulator (`role-simulator` tab, perm `manage_admins`): sandboxed iframe with `?__preview=1` query flag, persona-specific quick routes, custom path, mobile/tablet/desktop frames.
- Guest preview uses iframe `sandbox` without storage access to drop the admin's session.
