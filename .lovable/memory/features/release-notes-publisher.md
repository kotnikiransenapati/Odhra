---
name: Release Notes Publisher
description: release_notes table with draft/publish/archive workflow, public published notes, admin publisher UI
type: feature
---
- Table `release_notes` stores title, slug, summary, body, version, audience, status, tags, and published_at.
- Public can read only published notes whose published_at is due; admins can manage all notes.
- RPCs: `admin_upsert_release_note(...)` validates content and writes audit logs; `admin_publish_release_note(_id,_status)` changes draft/published/archived state.
- UI: `src/components/admin/ReleaseNotesPublisher.tsx`, admin tab id `release-notes`, permission `manage_cms`.