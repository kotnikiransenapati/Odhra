
-- Helper: true when a promotion is scoped to exactly one vendor owned by the calling user.
CREATE OR REPLACE FUNCTION public.is_own_vendor_promotion(_applicable_vendors uuid[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _applicable_vendors IS NOT NULL
    AND array_length(_applicable_vendors, 1) = 1
    AND EXISTS (
      SELECT 1 FROM public.vendors v
      WHERE v.id = _applicable_vendors[1]
        AND v.user_id = auth.uid()
    );
$$;

REVOKE ALL ON FUNCTION public.is_own_vendor_promotion(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_own_vendor_promotion(uuid[]) TO authenticated;

DROP POLICY IF EXISTS "Vendors manage own promotions" ON public.promotions;
CREATE POLICY "Vendors manage own promotions"
ON public.promotions
FOR ALL
TO authenticated
USING (public.is_own_vendor_promotion(applicable_vendors))
WITH CHECK (
  public.is_own_vendor_promotion(applicable_vendors)
  AND created_by = auth.uid()
);
