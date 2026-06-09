CREATE OR REPLACE FUNCTION public.admin_review_vendor_kyc(
  p_vendor_id uuid,
  p_action text,
  p_rejection_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_required_count integer;
  v_existing_count integer;
  v_result jsonb;
BEGIN
  IF v_actor IS NULL OR NOT public.is_admin(v_actor) THEN
    RAISE EXCEPTION 'Only admins can review vendor KYC';
  END IF;

  IF p_action NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'Unsupported KYC action: %', p_action;
  END IF;

  SELECT COUNT(*) INTO v_required_count
  FROM unnest(ARRAY['pan_card', 'aadhaar']) AS required_doc(document_type)
  WHERE EXISTS (
    SELECT 1
    FROM public.vendor_kyc_documents d
    WHERE d.vendor_id = p_vendor_id
      AND d.document_type = required_doc.document_type
      AND d.status IN ('pending', 'verified')
  );

  SELECT COUNT(*) INTO v_existing_count
  FROM public.vendor_kyc_documents
  WHERE vendor_id = p_vendor_id;

  IF p_action = 'approve' AND v_required_count < 2 THEN
    RAISE EXCEPTION 'PAN Card and Aadhaar are required before approval';
  END IF;

  IF p_action = 'approve' THEN
    UPDATE public.vendor_kyc_documents
    SET status = 'verified',
        rejection_reason = NULL,
        verified_by = v_actor,
        verified_at = now(),
        updated_at = now()
    WHERE vendor_id = p_vendor_id
      AND status IN ('pending', 'rejected');

    UPDATE public.vendors
    SET kyc_status = 'verified',
        is_verified = true,
        is_active = true,
        updated_at = now()
    WHERE id = p_vendor_id;
  ELSE
    UPDATE public.vendor_kyc_documents
    SET status = 'rejected',
        rejection_reason = NULLIF(trim(COALESCE(p_rejection_reason, '')), ''),
        verified_by = v_actor,
        verified_at = now(),
        updated_at = now()
    WHERE vendor_id = p_vendor_id
      AND status IN ('pending', 'verified');

    UPDATE public.vendors
    SET kyc_status = 'rejected',
        is_verified = false,
        is_active = false,
        updated_at = now()
    WHERE id = p_vendor_id;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vendor not found';
  END IF;

  v_result := jsonb_build_object(
    'vendor_id', p_vendor_id,
    'action', p_action,
    'document_count', v_existing_count,
    'reviewed_at', now()
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_review_vendor_kyc(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_vendor_kyc(uuid, text, text) TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.vendor_kyc_documents TO authenticated;
GRANT ALL ON public.vendor_kyc_documents TO service_role;