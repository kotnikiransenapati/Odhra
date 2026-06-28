import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type WholesalerStatus =
  | "pending"
  | "under_review"
  | "approved"
  | "rejected"
  | "suspended"
  | null;

export interface WholesalerAccount {
  id: string;
  user_id: string;
  business_name: string;
  legal_name: string | null;
  gstin: string | null;
  pan: string | null;
  business_type: string | null;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  billing_address: any;
  shipping_addresses: any;
  status: Exclude<WholesalerStatus, null>;
  rejection_reason: string | null;
  tier: string;
  credit_limit: number;
  credit_used: number;
  payment_terms_days: number;
  approved_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useWholesaler() {
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<WholesalerAccount | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;
      setUserId(uid);
      if (!uid) {
        setAccount(null);
        return;
      }
      const { data, error } = await supabase
        .from("wholesaler_accounts" as any)
        .select("*")
        .eq("user_id", uid)
        .maybeSingle();
      if (error) {
        setAccount(null);
      } else {
        setAccount((data as any) ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const { data: sub } = supabase.auth.onAuthStateChange(() => refresh());
    return () => sub.subscription.unsubscribe();
  }, [refresh]);

  return {
    loading,
    userId,
    account,
    status: (account?.status ?? null) as WholesalerStatus,
    isApproved: account?.status === "approved",
    refresh,
  };
}
