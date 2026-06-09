---
name: Size & Style Profile
description: Per-user style_profiles row capturing sizes, preferred fit, favorite colors, avoid materials, gifting flag
type: feature
---
Table `style_profiles` is keyed by `user_id` (PK + FK to auth.users). RLS scopes every operation to the owner. Stores: `top_size`, `bottom_size`, `dress_size`, `shoe_size`, `preferred_fit` (slim/regular/loose CHECK), `favorite_colors[]`, `avoid_materials[]`, `gifting_for_others`.

Hook `useStyleProfile` lazy-loads the row; `useSaveStyleProfile` upserts on `user_id`. UI `StyleProfilePanel` on `/account` exposes size selects, tag chips (with sensible suggestions), and a "shopping for others" toggle. Data is intended for downstream recommendation scoring.
