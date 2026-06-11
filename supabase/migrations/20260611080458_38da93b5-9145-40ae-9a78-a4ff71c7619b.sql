
-- =========================================================
-- BATCH 71: Refund Approval Queue
-- =========================================================
CREATE TABLE public.refund_approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  refund_id uuid,
  amount numeric NOT NULL CHECK (amount > 0),
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 3 AND 1000),
  requested_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  reviewer_id uuid,
  reviewed_at timestamptz,
  decision_note text CHECK (decision_note IS NULL OR char_length(decision_note) <= 1000),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rar_pending ON public.refund_approval_requests(created_at DESC) WHERE status = 'pending';
CREATE INDEX idx_rar_order ON public.refund_approval_requests(order_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.refund_approval_requests TO authenticated;
GRANT ALL ON public.refund_approval_requests TO service_role;
ALTER TABLE public.refund_approval_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rar_select" ON public.refund_approval_requests FOR SELECT TO authenticated
  USING (public.admin_has_permission(auth.uid(),'manage_refunds'));
CREATE POLICY "rar_insert" ON public.refund_approval_requests FOR INSERT TO authenticated
  WITH CHECK (public.admin_has_permission(auth.uid(),'manage_refunds') AND requested_by = auth.uid());
CREATE POLICY "rar_update" ON public.refund_approval_requests FOR UPDATE TO authenticated
  USING (public.admin_has_permission(auth.uid(),'manage_refunds'))
  WITH CHECK (public.admin_has_permission(auth.uid(),'manage_refunds'));

CREATE TRIGGER trg_rar_updated BEFORE UPDATE ON public.refund_approval_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.admin_refund_approval_submit(
  _order_id uuid, _amount numeric, _reason text, _priority text DEFAULT 'normal', _refund_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(),'manage_refunds') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _priority NOT IN ('low','normal','high','urgent') THEN RAISE EXCEPTION 'invalid priority'; END IF;
  INSERT INTO public.refund_approval_requests(order_id, refund_id, amount, reason, requested_by, priority)
  VALUES (_order_id, _refund_id, _amount, _reason, auth.uid(), _priority)
  RETURNING id INTO new_id;
  RETURN new_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_refund_approval_decide(_id uuid, _approve boolean, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _requester uuid;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(),'manage_refunds') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT requested_by INTO _requester FROM public.refund_approval_requests WHERE id = _id AND status = 'pending';
  IF _requester IS NULL THEN RAISE EXCEPTION 'request not pending'; END IF;
  IF _requester = auth.uid() THEN RAISE EXCEPTION 'cannot approve own request'; END IF;
  UPDATE public.refund_approval_requests
     SET status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,
         reviewer_id = auth.uid(), reviewed_at = now(), decision_note = _note
   WHERE id = _id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_refund_approval_stats()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  IF NOT public.admin_has_permission(auth.uid(),'manage_refunds') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT jsonb_build_object(
    'pending_total', COUNT(*) FILTER (WHERE status='pending'),
    'pending_amount', COALESCE(SUM(amount) FILTER (WHERE status='pending'), 0),
    'urgent', COUNT(*) FILTER (WHERE status='pending' AND priority='urgent'),
    'my_pending', COUNT(*) FILTER (WHERE status='pending' AND requested_by = auth.uid()),
    'approved_7d', COUNT(*) FILTER (WHERE status='approved' AND reviewed_at > now() - interval '7 days'),
    'rejected_7d', COUNT(*) FILTER (WHERE status='rejected' AND reviewed_at > now() - interval '7 days')
  ) INTO r FROM public.refund_approval_requests;
  RETURN COALESCE(r,'{}'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.admin_refund_approval_list(_status text DEFAULT 'pending', _limit int DEFAULT 200)
RETURNS TABLE (
  id uuid, order_id uuid, order_number text, refund_id uuid,
  amount numeric, reason text, priority text, status text,
  requested_by uuid, reviewer_id uuid, reviewed_at timestamptz,
  decision_note text, created_at timestamptz
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.admin_has_permission(auth.uid(),'manage_refunds') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT r.id, r.order_id, o.order_number, r.refund_id, r.amount, r.reason, r.priority, r.status,
         r.requested_by, r.reviewer_id, r.reviewed_at, r.decision_note, r.created_at
  FROM public.refund_approval_requests r
  LEFT JOIN public.orders o ON o.id = r.order_id
  WHERE (_status = 'all') OR (r.status = _status)
  ORDER BY (r.status='pending') DESC,
           CASE r.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
           r.created_at DESC
  LIMIT GREATEST(1, LEAST(_limit, 500));
END $$;

-- =========================================================
-- BATCH 72: Vendor Onboarding Checklist
-- =========================================================
CREATE TABLE public.vendor_onboarding_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  task_key text NOT NULL,
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 200),
  description text CHECK (description IS NULL OR char_length(description) <= 1000),
  is_required boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','skipped')),
  due_at timestamptz,
  completed_at timestamptz,
  completed_by uuid,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vendor_id, task_key)
);
CREATE INDEX idx_vot_vendor ON public.vendor_onboarding_tasks(vendor_id, sort_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_onboarding_tasks TO authenticated;
GRANT ALL ON public.vendor_onboarding_tasks TO service_role;
ALTER TABLE public.vendor_onboarding_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vot_admin_select" ON public.vendor_onboarding_tasks FOR SELECT TO authenticated
  USING (public.admin_has_permission(auth.uid(),'view_vendors'));
CREATE POLICY "vot_admin_manage" ON public.vendor_onboarding_tasks FOR ALL TO authenticated
  USING (public.admin_has_permission(auth.uid(),'manage_vendors'))
  WITH CHECK (public.admin_has_permission(auth.uid(),'manage_vendors'));
CREATE POLICY "vot_vendor_own_select" ON public.vendor_onboarding_tasks FOR SELECT TO authenticated
  USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));

CREATE TRIGGER trg_vot_updated BEFORE UPDATE ON public.vendor_onboarding_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default checklist for a vendor (idempotent)
CREATE OR REPLACE FUNCTION public.vendor_onboarding_seed(_vendor_id uuid)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inserted_count int := 0;
BEGIN
  IF NOT (public.admin_has_permission(auth.uid(),'manage_vendors')
       OR EXISTS (SELECT 1 FROM public.vendors WHERE id = _vendor_id AND user_id = auth.uid())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  WITH defaults(task_key, title, description, sort_order, is_required) AS (
    VALUES
      ('profile','Complete business profile','Add business name, GSTIN, contact info',10,true),
      ('kyc','Upload KYC documents','PAN, GSTIN certificate, bank proof',20,true),
      ('branding','Upload logo & banner','Square logo (512px) + storefront banner',30,true),
      ('payout','Add payout bank details','Verified UPI or bank account',40,true),
      ('catalog','Publish first 5 products','Live products with images and pricing',50,true),
      ('shipping','Configure shipping zones','Pincode coverage & rates',60,true),
      ('policies','Set return & cancellation policies','Window in days + conditions',70,false),
      ('test_order','Process a test order','Walk through fulfillment end-to-end',80,false)
  )
  INSERT INTO public.vendor_onboarding_tasks(vendor_id, task_key, title, description, sort_order, is_required)
  SELECT _vendor_id, task_key, title, description, sort_order, is_required FROM defaults
  ON CONFLICT (vendor_id, task_key) DO NOTHING;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END $$;

CREATE OR REPLACE FUNCTION public.vendor_onboarding_list(_vendor_id uuid)
RETURNS TABLE (
  id uuid, task_key text, title text, description text, is_required boolean,
  status text, due_at timestamptz, completed_at timestamptz, sort_order int
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.admin_has_permission(auth.uid(),'view_vendors')
       OR EXISTS (SELECT 1 FROM public.vendors WHERE id = _vendor_id AND user_id = auth.uid())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT t.id, t.task_key, t.title, t.description, t.is_required,
         t.status, t.due_at, t.completed_at, t.sort_order
  FROM public.vendor_onboarding_tasks t
  WHERE t.vendor_id = _vendor_id
  ORDER BY t.sort_order, t.created_at;
END $$;

CREATE OR REPLACE FUNCTION public.vendor_onboarding_stats(_vendor_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  IF NOT (public.admin_has_permission(auth.uid(),'view_vendors')
       OR EXISTS (SELECT 1 FROM public.vendors WHERE id = _vendor_id AND user_id = auth.uid())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'required', COUNT(*) FILTER (WHERE is_required),
    'completed', COUNT(*) FILTER (WHERE status='completed'),
    'required_completed', COUNT(*) FILTER (WHERE is_required AND status='completed'),
    'in_progress', COUNT(*) FILTER (WHERE status='in_progress'),
    'overdue', COUNT(*) FILTER (WHERE status <> 'completed' AND due_at IS NOT NULL AND due_at < now()),
    'percent', CASE WHEN COUNT(*) = 0 THEN 0
                    ELSE ROUND(100.0 * COUNT(*) FILTER (WHERE status='completed') / COUNT(*), 1) END
  ) INTO r FROM public.vendor_onboarding_tasks WHERE vendor_id = _vendor_id;
  RETURN COALESCE(r,'{}'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.vendor_onboarding_set_status(_task_id uuid, _status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _vendor uuid;
BEGIN
  IF _status NOT IN ('pending','in_progress','completed','skipped') THEN RAISE EXCEPTION 'invalid status'; END IF;
  SELECT vendor_id INTO _vendor FROM public.vendor_onboarding_tasks WHERE id = _task_id;
  IF _vendor IS NULL THEN RAISE EXCEPTION 'task not found'; END IF;
  IF NOT (public.admin_has_permission(auth.uid(),'manage_vendors')
       OR EXISTS (SELECT 1 FROM public.vendors WHERE id = _vendor AND user_id = auth.uid())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.vendor_onboarding_tasks
     SET status = _status,
         completed_at = CASE WHEN _status='completed' THEN now() ELSE NULL END,
         completed_by = CASE WHEN _status='completed' THEN auth.uid() ELSE NULL END
   WHERE id = _task_id;
END $$;
