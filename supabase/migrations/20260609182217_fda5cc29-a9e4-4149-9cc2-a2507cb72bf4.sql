REVOKE EXECUTE ON FUNCTION public.admin_review_vendor_kyc(uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_review_vendor_kyc(uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_review_vendor_kyc(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_vendor_kyc(uuid, text, text) TO service_role;