REVOKE ALL ON FUNCTION public.admin_security_event_stats(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_security_event_stats(INT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_security_event_feed(INT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_security_event_feed(INT, TEXT, TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_verify_security_ledger(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_verify_security_ledger(INT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_security_rules_list() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_security_rules_list() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_upsert_security_rule(UUID, TEXT, TEXT, TEXT, TEXT, INT, INT, TEXT, TEXT, BOOLEAN, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_upsert_security_rule(UUID, TEXT, TEXT, TEXT, TEXT, INT, INT, TEXT, TEXT, BOOLEAN, INT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_delete_security_rule(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_security_rule(UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_security_findings(TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_security_findings(TEXT, INT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_update_security_finding_status(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_security_finding_status(UUID, TEXT) TO authenticated, service_role;