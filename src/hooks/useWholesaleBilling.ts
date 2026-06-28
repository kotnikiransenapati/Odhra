import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface WholesaleInvoice {
  id: string;
  invoice_number: string;
  wholesaler_id: string;
  order_id: string | null;
  billing_name: string;
  billing_gstin: string | null;
  grand_total: number;
  amount_paid: number;
  amount_due: number;
  cgst_total: number;
  sgst_total: number;
  igst_total: number;
  tax_total: number;
  subtotal: number;
  issue_date: string;
  due_date: string;
  status: "draft" | "issued" | "partial" | "paid" | "overdue" | "void";
  pdf_url: string | null;
  notes: string | null;
}

export interface WholesalePayment {
  id: string;
  invoice_id: string | null;
  amount: number;
  mode: string;
  reference_number: string | null;
  payment_date: string;
  verified: boolean;
  notes: string | null;
  attachment_url: string | null;
  created_at: string;
}

export interface LedgerEntry {
  id: string;
  entry_type: string;
  amount: number;
  direction: "debit" | "credit";
  balance_after: number;
  invoice_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface OutstandingSummary {
  outstanding: number;
  overdue: number;
  invoice_count: number;
  overdue_count: number;
}

export function useWholesaleBilling(wholesalerId: string | null | undefined) {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<WholesaleInvoice[]>([]);
  const [payments, setPayments] = useState<WholesalePayment[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [summary, setSummary] = useState<OutstandingSummary>({
    outstanding: 0,
    overdue: 0,
    invoice_count: 0,
    overdue_count: 0,
  });

  const refresh = useCallback(async () => {
    if (!wholesalerId) {
      setInvoices([]);
      setPayments([]);
      setLedger([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [invRes, payRes, ledRes, sumRes] = await Promise.all([
        supabase
          .from("wholesale_invoices" as any)
          .select("*")
          .eq("wholesaler_id", wholesalerId)
          .order("issue_date", { ascending: false })
          .limit(200),
        supabase
          .from("wholesale_payments" as any)
          .select("*")
          .eq("wholesaler_id", wholesalerId)
          .order("payment_date", { ascending: false })
          .limit(200),
        supabase
          .from("wholesale_credit_ledger" as any)
          .select("*")
          .eq("wholesaler_id", wholesalerId)
          .order("created_at", { ascending: false })
          .limit(200),
        supabase.rpc("get_wholesaler_outstanding" as any, {
          _wholesaler_id: wholesalerId,
        }),
      ]);
      setInvoices((invRes.data as any) ?? []);
      setPayments((payRes.data as any) ?? []);
      setLedger((ledRes.data as any) ?? []);
      const s = Array.isArray(sumRes.data) ? sumRes.data[0] : sumRes.data;
      if (s) {
        setSummary({
          outstanding: Number(s.outstanding ?? 0),
          overdue: Number(s.overdue ?? 0),
          invoice_count: Number(s.invoice_count ?? 0),
          overdue_count: Number(s.overdue_count ?? 0),
        });
      }
    } finally {
      setLoading(false);
    }
  }, [wholesalerId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { loading, invoices, payments, ledger, summary, refresh };
}

export async function submitWholesalePayment(input: {
  wholesaler_id: string;
  invoice_id?: string | null;
  amount: number;
  mode: string;
  reference_number?: string;
  payment_date?: string;
  notes?: string;
  attachment_url?: string;
}) {
  const { data, error } = await supabase
    .from("wholesale_payments" as any)
    .insert({
      wholesaler_id: input.wholesaler_id,
      invoice_id: input.invoice_id ?? null,
      amount: input.amount,
      mode: input.mode,
      reference_number: input.reference_number ?? null,
      payment_date: input.payment_date ?? new Date().toISOString().slice(0, 10),
      notes: input.notes ?? null,
      attachment_url: input.attachment_url ?? null,
      verified: false,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}
