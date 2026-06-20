
ALTER TABLE public.merchandising_rules DROP CONSTRAINT IF EXISTS merchandising_rules_scope_type_check;
ALTER TABLE public.merchandising_rules ADD CONSTRAINT merchandising_rules_scope_type_check
  CHECK (scope_type IN ('global','category','collection','search','vendor','segment'));
