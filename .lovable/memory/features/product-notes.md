---
name: Personal Product Notes
description: Private per-user notes on products with pin + max 2000 chars, exposed via PDP sheet and account panel
type: feature
---
Table `public.product_notes` stores one note per (user_id, product_id) — unique constraint enforced. RLS restricts every operation to `auth.uid() = user_id`; only the owner can see them. Notes max 2000 chars (CHECK constraint). `pinned` boolean sorts them to top.

Hook `useProductNotes` returns notes joined with product (title, slug, images, price). `useProductNote(productId)` is the single-row lookup used by PDP. `useUpsertProductNote` upserts on `(user_id, product_id)`. Toggle pin + delete have their own mutations with invalidation.

UI: `ProductNoteButton` on PDP opens a bottom sheet — counts characters live, toggles pin. Guest sees Sign-In CTA. `ProductNotesPanel` on `/account` renders pinned-first list with product thumbnail and inline pin/delete actions.
