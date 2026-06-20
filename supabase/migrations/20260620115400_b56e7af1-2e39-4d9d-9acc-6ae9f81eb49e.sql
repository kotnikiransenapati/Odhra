CREATE TABLE IF NOT EXISTS public.ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  txn_id uuid NOT NULL,
  account_type text NOT NULL CHECK (account_type IN ('user_wallet','vendor_wallet','loyalty_points','store_credit','platform_revenue','platform_payable','tax_payable','refund_clearing','gift_card')),
  account_owner uuid,
  direction text NOT NULL CHECK (direction IN ('debit','credit')),
  currency text NOT NULL DEFAULT 'INR',
  amount numeric(14,4) NOT NULL CHECK (amount > 0),
  balance_after numeric(14,4),
  reference_type text,
  reference_id uuid,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ledger_entries TO authenticated;
GRANT ALL ON public.ledger_entries TO service_role;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners view their ledger" ON public.ledger_entries FOR SELECT TO authenticated
  USING (account_owner = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins write ledger" ON public.ledger_entries FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_ledger_txn ON public.ledger_entries(txn_id);
CREATE INDEX IF NOT EXISTS idx_ledger_owner ON public.ledger_entries(account_owner, created_at DESC);

-- Integrity: every txn_id must net to zero (sum credits = sum debits per currency)
CREATE OR REPLACE FUNCTION public.assert_ledger_balanced(_txn uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT currency,
           SUM(CASE WHEN direction='debit'  THEN amount ELSE 0 END) AS d,
           SUM(CASE WHEN direction='credit' THEN amount ELSE 0 END) AS c
    FROM public.ledger_entries WHERE txn_id = _txn GROUP BY currency
  LOOP
    IF r.d <> r.c THEN
      RAISE EXCEPTION 'Ledger txn % unbalanced in %: debit=% credit=%', _txn, r.currency, r.d, r.c;
    END IF;
  END LOOP;
END$$;