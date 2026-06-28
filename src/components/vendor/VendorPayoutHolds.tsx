import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { ShieldAlert, Lock, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useVendorId } from '@/hooks/useVendorDashboard';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface HoldRow {
  id: string;
  reason: string;
  severity: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

const sevTone: Record<string, string> = {
  critical: 'border-destructive/40 text-destructive',
  high: 'border-destructive/30 text-destructive',
  medium: 'border-warning/30 text-warning',
  low: 'border-border text-muted-foreground',
};

/**
 * Renders any active payout holds for the current vendor.
 * Holds are platform-controlled (only admins can place/release), but vendors
 * see the reason and severity for transparency. Returns null when no holds.
 */
export function VendorPayoutHolds() {
  const { data: vendorId } = useVendorId();

  const { data, isLoading } = useQuery({
    queryKey: ['vendor-payout-holds', vendorId],
    enabled: !!vendorId,
    staleTime: 60_000,
    queryFn: async (): Promise<HoldRow[]> => {
      const { data: rows, error } = await supabase
        .from('vendor_payout_holds')
        .select('id, reason, severity, metadata, created_at')
        .eq('vendor_id', vendorId!)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (rows ?? []) as HoldRow[];
    },
  });

  if (isLoading) return <Skeleton className="h-24 w-full rounded-xl mb-6" />;
  if (!data || data.length === 0) return null;

  return (
    <Alert variant="destructive" className="mb-6 border-destructive/30">
      <ShieldAlert className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        Payouts are currently on hold
        <Badge variant="outline">{data.length}</Badge>
      </AlertTitle>
      <AlertDescription>
        <ul className="mt-2 space-y-2">
          {data.map((h) => (
            <li
              key={h.id}
              className={`p-2.5 rounded-md border bg-background/40 flex items-start gap-2 ${
                sevTone[h.severity ?? 'low']
              }`}
            >
              <Lock className="w-4 h-4 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium capitalize">
                  {h.severity ?? 'hold'} · {h.reason.replace(/_/g, ' ')}
                </p>
                <p className="text-xs opacity-80">
                  Placed {formatDistanceToNow(new Date(h.created_at), { addSuffix: true })}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs flex items-center gap-1">
          <Info className="w-3 h-3" />
          Contact support to resolve. New payout requests will be blocked until the hold is released.
        </p>
      </AlertDescription>
    </Alert>
  );
}
