
-- ============ wholesale_push_subscriptions ============
CREATE TABLE IF NOT EXISTS public.wholesale_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wholesaler_id uuid NOT NULL REFERENCES public.wholesaler_accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  device_label text,
  user_agent text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wholesale_push_subscriptions TO authenticated;
GRANT ALL ON public.wholesale_push_subscriptions TO service_role;
ALTER TABLE public.wholesale_push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manage push subs" ON public.wholesale_push_subscriptions
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_wpush_w ON public.wholesale_push_subscriptions(wholesaler_id);

-- ============ wholesale_notifications ============
CREATE TABLE IF NOT EXISTS public.wholesale_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wholesaler_id uuid NOT NULL REFERENCES public.wholesaler_accounts(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  metadata jsonb DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.wholesale_notifications TO authenticated;
GRANT ALL ON public.wholesale_notifications TO service_role;
ALTER TABLE public.wholesale_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Wholesaler reads own notifications" ON public.wholesale_notifications
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.wholesaler_accounts wa WHERE wa.id=wholesaler_id AND wa.user_id=auth.uid())
         OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Wholesaler marks read" ON public.wholesale_notifications
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.wholesaler_accounts wa WHERE wa.id=wholesaler_id AND wa.user_id=auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.wholesaler_accounts wa WHERE wa.id=wholesaler_id AND wa.user_id=auth.uid()));
CREATE POLICY "Admins manage notifications" ON public.wholesale_notifications
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_wnotif_w ON public.wholesale_notifications(wholesaler_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wnotif_unread ON public.wholesale_notifications(wholesaler_id) WHERE read_at IS NULL;

-- ============ wholesale_announcements ============
CREATE TABLE IF NOT EXISTS public.wholesale_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  link text,
  cta_label text,
  audience text NOT NULL DEFAULT 'all' CHECK (audience IN ('all','tier','specific')),
  target_tiers text[] DEFAULT '{}',
  target_wholesaler_ids uuid[] DEFAULT '{}',
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  pinned boolean NOT NULL DEFAULT false,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wholesale_announcements TO authenticated;
GRANT ALL ON public.wholesale_announcements TO service_role;
ALTER TABLE public.wholesale_announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Wholesalers view active announcements" ON public.wholesale_announcements
  FOR SELECT TO authenticated
  USING (
    is_active = true
    AND starts_at <= now()
    AND (expires_at IS NULL OR expires_at > now())
    AND EXISTS (
      SELECT 1 FROM public.wholesaler_accounts wa
      WHERE wa.user_id = auth.uid() AND wa.status = 'approved'
        AND (
          wholesale_announcements.audience = 'all'
          OR (wholesale_announcements.audience = 'tier' AND wa.tier = ANY(wholesale_announcements.target_tiers))
          OR (wholesale_announcements.audience = 'specific' AND wa.id = ANY(wholesale_announcements.target_wholesaler_ids))
        )
    )
    OR public.has_role(auth.uid(),'admin')
  );
CREATE POLICY "Admins manage announcements" ON public.wholesale_announcements
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ wholesale_announcement_reads ============
CREATE TABLE IF NOT EXISTS public.wholesale_announcement_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.wholesale_announcements(id) ON DELETE CASCADE,
  wholesaler_id uuid NOT NULL REFERENCES public.wholesaler_accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);
GRANT SELECT, INSERT ON public.wholesale_announcement_reads TO authenticated;
GRANT ALL ON public.wholesale_announcement_reads TO service_role;
ALTER TABLE public.wholesale_announcement_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User own reads" ON public.wholesale_announcement_reads
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid());

-- ============ wholesale_support_tickets ============
CREATE TABLE IF NOT EXISTS public.wholesale_support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text NOT NULL UNIQUE,
  wholesaler_id uuid NOT NULL REFERENCES public.wholesaler_accounts(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  subject text NOT NULL,
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('general','order','billing','dispatch','catalog','technical','escalation')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','pending_customer','in_progress','resolved','closed')),
  assignee_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reference_order_id uuid,
  reference_invoice_id uuid,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.wholesale_support_tickets TO authenticated;
GRANT ALL ON public.wholesale_support_tickets TO service_role;
ALTER TABLE public.wholesale_support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Wholesaler manage own tickets" ON public.wholesale_support_tickets
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.wholesaler_accounts wa WHERE wa.id=wholesaler_id AND wa.user_id=auth.uid())
         OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Wholesaler create ticket" ON public.wholesale_support_tickets
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.wholesaler_accounts wa WHERE wa.id=wholesaler_id AND wa.user_id=auth.uid())
              AND created_by = auth.uid());
CREATE POLICY "Admins manage tickets" ON public.wholesale_support_tickets
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_wstickets_w ON public.wholesale_support_tickets(wholesaler_id, status, last_message_at DESC);

-- ============ wholesale_support_messages ============
CREATE TABLE IF NOT EXISTS public.wholesale_support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.wholesale_support_tickets(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_role text NOT NULL CHECK (author_role IN ('wholesaler','admin','system')),
  body text NOT NULL,
  attachment_url text,
  is_internal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.wholesale_support_messages TO authenticated;
GRANT ALL ON public.wholesale_support_messages TO service_role;
ALTER TABLE public.wholesale_support_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View ticket messages" ON public.wholesale_support_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.wholesale_support_tickets t
      JOIN public.wholesaler_accounts wa ON wa.id = t.wholesaler_id
      WHERE t.id = wholesale_support_messages.ticket_id
        AND ( (wa.user_id = auth.uid() AND wholesale_support_messages.is_internal = false)
              OR public.has_role(auth.uid(),'admin') )
    )
  );
CREATE POLICY "Wholesaler post message" ON public.wholesale_support_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    is_internal = false
    AND author_role = 'wholesaler'
    AND author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.wholesale_support_tickets t
      JOIN public.wholesaler_accounts wa ON wa.id = t.wholesaler_id
      WHERE t.id = ticket_id AND wa.user_id = auth.uid()
    )
  );
CREATE POLICY "Admin post message" ON public.wholesale_support_messages
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') AND author_role IN ('admin','system'));
CREATE INDEX IF NOT EXISTS idx_wsmsgs_t ON public.wholesale_support_messages(ticket_id, created_at);

-- ============ Triggers ============
DROP TRIGGER IF EXISTS trg_wstickets_upd ON public.wholesale_support_tickets;
CREATE TRIGGER trg_wstickets_upd BEFORE UPDATE ON public.wholesale_support_tickets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_wann_upd ON public.wholesale_announcements;
CREATE TRIGGER trg_wann_upd BEFORE UPDATE ON public.wholesale_announcements
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ticket number generator
CREATE SEQUENCE IF NOT EXISTS public.wholesale_ticket_seq START 1001;
CREATE OR REPLACE FUNCTION public.set_wholesale_ticket_number()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := 'WT-' || to_char(CURRENT_DATE,'YYYY') || '-' || lpad(nextval('public.wholesale_ticket_seq')::text,6,'0');
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_wsticket_num ON public.wholesale_support_tickets;
CREATE TRIGGER trg_wsticket_num BEFORE INSERT ON public.wholesale_support_tickets
FOR EACH ROW EXECUTE FUNCTION public.set_wholesale_ticket_number();

-- Bump ticket last_message_at on new (non-internal) reply
CREATE OR REPLACE FUNCTION public.bump_wholesale_ticket()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.wholesale_support_tickets
    SET last_message_at = now(),
        status = CASE
          WHEN NEW.author_role = 'admin' AND status = 'open' THEN 'in_progress'
          WHEN NEW.author_role = 'wholesaler' AND status = 'pending_customer' THEN 'in_progress'
          ELSE status
        END,
        updated_at = now()
    WHERE id = NEW.ticket_id;

  -- Notify wholesaler when admin replies (non-internal)
  IF NEW.author_role = 'admin' AND NEW.is_internal = false THEN
    INSERT INTO public.wholesale_notifications (wholesaler_id, type, title, body, link, priority)
    SELECT t.wholesaler_id, 'support_reply',
           'Reply on ticket ' || t.ticket_number,
           left(NEW.body, 200),
           '/wholesale/support?ticket=' || t.id,
           'normal'
    FROM public.wholesale_support_tickets t WHERE t.id = NEW.ticket_id;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_wsmsg_bump ON public.wholesale_support_messages;
CREATE TRIGGER trg_wsmsg_bump AFTER INSERT ON public.wholesale_support_messages
FOR EACH ROW EXECUTE FUNCTION public.bump_wholesale_ticket();

-- Notify on invoice issued / overdue / paid
CREATE OR REPLACE FUNCTION public.notify_wholesale_invoice()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status IN ('issued','partial','overdue') THEN
    INSERT INTO public.wholesale_notifications(wholesaler_id,type,title,body,link,priority)
    VALUES (NEW.wholesaler_id,'invoice_issued',
            'New invoice ' || NEW.invoice_number,
            'Amount due: ₹' || to_char(NEW.amount_due,'FM999,999,990.00') || ' by ' || to_char(NEW.due_date,'DD Mon YYYY'),
            '/wholesale/invoices', 'normal');
  ELSIF TG_OP = 'UPDATE' AND OLD.status <> NEW.status THEN
    IF NEW.status = 'paid' THEN
      INSERT INTO public.wholesale_notifications(wholesaler_id,type,title,body,link,priority)
      VALUES (NEW.wholesaler_id,'invoice_paid',
              'Invoice ' || NEW.invoice_number || ' marked paid',
              'Thank you for your payment of ₹' || to_char(NEW.grand_total,'FM999,999,990.00') || '.',
              '/wholesale/invoices','low');
    ELSIF NEW.status = 'overdue' THEN
      INSERT INTO public.wholesale_notifications(wholesaler_id,type,title,body,link,priority)
      VALUES (NEW.wholesaler_id,'invoice_overdue',
              'Invoice ' || NEW.invoice_number || ' is overdue',
              'Outstanding: ₹' || to_char(NEW.amount_due,'FM999,999,990.00') || '. Please settle to keep credit active.',
              '/wholesale/payments','high');
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_winv_notify ON public.wholesale_invoices;
CREATE TRIGGER trg_winv_notify AFTER INSERT OR UPDATE ON public.wholesale_invoices
FOR EACH ROW EXECUTE FUNCTION public.notify_wholesale_invoice();

-- Unread counts helper
CREATE OR REPLACE FUNCTION public.wholesale_unread_count(_wholesaler_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (SELECT count(*) FROM public.wholesale_notifications
       WHERE wholesaler_id = _wholesaler_id AND read_at IS NULL)::int
    +
    (SELECT count(*) FROM public.wholesale_announcements a
       WHERE a.is_active = true
         AND a.starts_at <= now()
         AND (a.expires_at IS NULL OR a.expires_at > now())
         AND NOT EXISTS (
           SELECT 1 FROM public.wholesale_announcement_reads r
           WHERE r.announcement_id = a.id AND r.wholesaler_id = _wholesaler_id
         )
         AND (a.audience = 'all'
              OR (a.audience = 'tier' AND EXISTS (SELECT 1 FROM public.wholesaler_accounts wa WHERE wa.id=_wholesaler_id AND wa.tier = ANY(a.target_tiers)))
              OR (a.audience = 'specific' AND _wholesaler_id = ANY(a.target_wholesaler_ids))))::int;
$$;
