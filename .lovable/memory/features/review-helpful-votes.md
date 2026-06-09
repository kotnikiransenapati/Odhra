---
name: Review Helpfulness Voting
description: review_votes table with up/down votes per (review, user); trigger keeps reviews.helpful_count = up − down
type: feature
---
Table `review_votes` (`review_id`, `user_id`, `vote` CHECK in {`up`,`down`}, unique per pair). Owner-only RLS for read/write — totals are reflected via `reviews.helpful_count`. Trigger `recompute_review_helpful_count` runs AFTER INSERT/UPDATE/DELETE and recomputes the score as SUM(up=+1, down=-1).

Hooks: `useMyReviewVotes(reviewIds, productId)` returns a map of the current user's votes; `useVoteReview(productId)` toggles — same value clears, different value upserts (onConflict `review_id,user_id`). `ReviewHelpfulButtons` renders accessible up/down toggles (aria-pressed) and shows the running total; sign-in CTA for guests.
