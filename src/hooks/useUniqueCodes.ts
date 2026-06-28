import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type UniqueCodeKind = 'coupon' | 'referral' | 'spin' | 'welcome' | 'birthday' | 'custom_link';

export interface UniqueCodePolicy {
  id: string;
  kind: UniqueCodeKind;
  name: string;
  is_active: boolean;
  prefix: string;
  code_length: number;
  validity_hours: number;
  max_uses: number;
  discount_type: 'percentage' | 'fixed' | null;
  discount_value: number | null;
  min_order_amount: number | null;
  max_per_user: number;
  generate_unique_link: boolean;
  link_target_path: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface IssuedUniqueCode {
  id: string;
  code: string;
  kind: UniqueCodeKind;
  user_id: string | null;
  email: string | null;
  link_slug: string | null;
  status: string;
  max_uses: number;
  uses_count: number;
  expires_at: string | null;
  valid_from: string;
  discount_applied: number | null;
  created_at: string;
}

export function useUniqueCodePolicies() {
  return useQuery({
    queryKey: ['unique-code-policies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('unique_code_policies')
        .select('*')
        .order('kind');
      if (error) throw error;
      return (data ?? []) as UniqueCodePolicy[];
    },
  });
}

export function useUpsertUniqueCodePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: Partial<UniqueCodePolicy> & { kind: UniqueCodeKind; name: string }) => {
      const { data, error } = await supabase
        .from('unique_code_policies')
        .upsert(p as never)
        .select()
        .single();
      if (error) throw error;
      return data as UniqueCodePolicy;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['unique-code-policies'] });
      toast.success('Policy saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useIssuedUniqueCodes(filters: { kind?: UniqueCodeKind; status?: string } = {}) {
  return useQuery({
    queryKey: ['issued-unique-codes', filters],
    queryFn: async () => {
      let q = supabase
        .from('unique_coupon_codes')
        .select('id,code,kind,user_id,email,link_slug,status,max_uses,uses_count,expires_at,valid_from,discount_applied,created_at')
        .order('created_at', { ascending: false })
        .limit(200);
      if (filters.kind) q = q.eq('kind', filters.kind);
      if (filters.status) q = q.eq('status', filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as IssuedUniqueCode[];
    },
  });
}

export function useIssueUniqueCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { kind: UniqueCodeKind; user_id?: string; email?: string }) => {
      const { data, error } = await supabase.rpc('issue_unique_code', {
        p_kind: args.kind,
        p_user_id: args.user_id ?? null,
        p_email: args.email ?? null,
        p_overrides: {},
      });
      if (error) throw error;
      return data as { code: string; link_slug: string | null; expires_at: string };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['issued-unique-codes'] });
      toast.success(`Issued ${res.code}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export async function validateUniqueCode(code?: string, slug?: string) {
  const { data, error } = await supabase.rpc('validate_unique_code', {
    p_code: code ?? null,
    p_slug: slug ?? null,
  });
  if (error) throw error;
  return data as { valid: boolean; reason?: string; [k: string]: unknown };
}
