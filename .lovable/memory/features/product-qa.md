---
name: Product Q&A System
description: Public per-product questions with threaded answers, anonymous asking, and auto vendor badge via trigger
type: feature
---
Tables `product_questions` (5–500 chars) and `product_answers` (1–1000 chars). Anyone (anon or auth) can read rows with `status='visible'`; only owners can edit/delete. Trigger `handle_product_answer` runs on insert/delete:
- looks up the product's vendor `user_id` and auto-flags `is_vendor=true` on matching answers
- maintains `answer_count` and `is_answered` on the parent question

UI: `ProductQuestionsSection` lives on PDP — list + inline ask form (with anonymity toggle), per-question expander loads `useProductAnswers` lazily, inline answer composer. Vendor answers surface with a "Seller" badge and sort to the top, then by `helpful_count`.
