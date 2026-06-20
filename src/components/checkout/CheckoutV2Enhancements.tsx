import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Loader2, BadgeIndianRupee, Banknote, Sparkles, ShieldCheck, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { haptic } from '@/lib/haptics';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

// ---------- 1) Geolocation auto-detect address ----------
export interface DetectedAddress {
  pincode?: string;
  city?: string;
  state?: string;
  country?: string;
  line1?: string;
  latitude: number;
  longitude: number;
}

export function GeolocationAddressDetect({
  onDetected,
}: {
  onDetected: (addr: DetectedAddress) => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleDetect = () => {
    if (!('geolocation' in navigator)) {
      toast.error('Location not supported on this device');
      return;
    }
    setLoading(true);
    haptic('light');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          // OpenStreetMap reverse geocoding (free, no key). Network-only enrichment.
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
            { headers: { Accept: 'application/json' } },
          );
          const data = res.ok ? await res.json() : null;
          const a = data?.address ?? {};
          const detected: DetectedAddress = {
            latitude,
            longitude,
            pincode: a.postcode,
            city: a.city || a.town || a.village || a.suburb,
            state: a.state,
            country: a.country,
            line1: [a.house_number, a.road, a.neighbourhood].filter(Boolean).join(' ').trim() || undefined,
          };
          onDetected(detected);
          haptic('success');
          toast.success('Address detected', { description: detected.city ?? '' });
        } catch {
          // Even without reverse geocode, hand back coords so callers can attempt pincode RPC.
          onDetected({ latitude, longitude });
          toast.message('Location captured', { description: 'Please confirm the address fields.' });
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setLoading(false);
        haptic('error');
        toast.error('Could not detect location', { description: err.message });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-2"
      onClick={handleDetect}
      disabled={loading}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
      {loading ? 'Detecting…' : 'Use current location'}
    </Button>
  );
}

// ---------- 2) COD eligibility check ----------
export interface CodEligibility {
  eligible: boolean;
  reason?: string;
  fee?: number;
  limit?: number;
}

const COD_LIMIT = 50000; // ₹50k per project memory
const COD_FEE_PCT = 0.02; // 2% per project memory

export function checkCodEligibility(opts: {
  pincode?: string;
  orderTotal: number;
  servicePincodes?: Set<string>;
}): CodEligibility {
  if (opts.orderTotal > COD_LIMIT) {
    return {
      eligible: false,
      reason: `COD unavailable above ${fmt(COD_LIMIT)}. Please use a prepaid method.`,
      limit: COD_LIMIT,
    };
  }
  if (opts.pincode && opts.servicePincodes && opts.servicePincodes.size > 0) {
    if (!opts.servicePincodes.has(opts.pincode)) {
      return { eligible: false, reason: 'COD not serviceable to this pincode.' };
    }
  }
  if (opts.pincode && !/^\d{6}$/.test(opts.pincode)) {
    return { eligible: false, reason: 'Enter a valid 6-digit pincode to check COD.' };
  }
  return {
    eligible: true,
    fee: Math.round(opts.orderTotal * COD_FEE_PCT),
  };
}

export function CodEligibilityBadge({ result }: { result: CodEligibility }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`rounded-lg border p-3 text-sm flex items-start gap-2 ${
        result.eligible
          ? 'border-success/30 bg-success/5 text-success'
          : 'border-warning/30 bg-warning/5 text-warning'
      }`}
      role="status"
    >
      <Banknote className="w-4 h-4 mt-0.5 shrink-0" />
      <div className="flex-1">
        {result.eligible ? (
          <>
            <p className="font-medium">Cash on Delivery available</p>
            {typeof result.fee === 'number' && result.fee > 0 && (
              <p className="text-xs opacity-80">COD handling fee: {fmt(result.fee)} (2%)</p>
            )}
          </>
        ) : (
          <p className="font-medium">{result.reason ?? 'COD unavailable'}</p>
        )}
      </div>
    </motion.div>
  );
}

// ---------- 3) Prepaid discount nudge ----------
export function PrepaidDiscountNudge({
  orderTotal,
  discountPct = 3,
  maxDiscount = 200,
  active,
  onApply,
}: {
  orderTotal: number;
  discountPct?: number;
  maxDiscount?: number;
  active?: boolean;
  onApply?: () => void;
}) {
  const raw = Math.round((orderTotal * discountPct) / 100);
  const saving = Math.min(raw, maxDiscount);
  if (saving <= 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`rounded-xl border p-3 flex items-center gap-3 ${
        active ? 'border-accent/40 bg-accent/10' : 'border-accent/20 bg-accent/5'
      }`}
    >
      <div className="p-2 rounded-lg bg-accent/15">
        <Sparkles className="w-4 h-4 text-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">
          Pay online & save {fmt(saving)}
        </p>
        <p className="text-xs text-muted-foreground">
          {discountPct}% instant discount on UPI / Cards (max {fmt(maxDiscount)}).
        </p>
      </div>
      {onApply && !active && (
        <Button size="sm" variant="default" className="shrink-0" onClick={onApply}>
          Apply
        </Button>
      )}
      {active && (
        <Badge variant="secondary" className="bg-success/15 text-success border-success/20">
          Applied
        </Badge>
      )}
    </motion.div>
  );
}

// ---------- 4) Sticky mobile order summary ----------
export function StickyMobileOrderSummary({
  itemCount,
  total,
  onPlaceOrder,
  disabled,
  cta = 'Place order',
}: {
  itemCount: number;
  total: number;
  onPlaceOrder: () => void;
  disabled?: boolean;
  cta?: string;
}) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80 }}
        animate={{ y: 0 }}
        exit={{ y: 80 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center gap-3 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.25)]"
      >
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <Lock className="w-3 h-3" /> Secure total
          </p>
          <p className="text-lg font-bold leading-tight tabular-nums">
            {fmt(total)}
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              · {itemCount} item{itemCount === 1 ? '' : 's'}
            </span>
          </p>
        </div>
        <Button
          size="lg"
          className="shrink-0 gap-2"
          onClick={() => {
            haptic('medium');
            onPlaceOrder();
          }}
          disabled={disabled}
        >
          <ShieldCheck className="w-4 h-4" />
          {cta}
        </Button>
      </motion.div>
    </AnimatePresence>
  );
}

// ---------- 5) Trust strip ----------
export function CheckoutTrustStrip() {
  const items = [
    { icon: ShieldCheck, label: 'Secure SSL checkout' },
    { icon: BadgeIndianRupee, label: '100% authentic products' },
    { icon: Lock, label: 'Encrypted payments' },
  ];
  return (
    <div className="grid grid-cols-3 gap-2 text-[11px] text-muted-foreground mt-2">
      {items.map(({ icon: Icon, label }) => (
        <div key={label} className="flex items-center gap-1.5 justify-center">
          <Icon className="w-3.5 h-3.5 text-accent" />
          <span className="truncate">{label}</span>
        </div>
      ))}
    </div>
  );
}
