import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Gift, AlertTriangle, TicketPercent, PackageX, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { haptic } from '@/lib/haptics';

// ---------- Money helpers ----------
const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

// ---------- 1) Undo-remove toast helper ----------
// Wrap your existing removeItem call with this so user gets a 5s window to undo.
export function removeWithUndo(opts: {
  productId: string;
  title: string;
  remove: (id: string) => Promise<void> | void;
  restore: (id: string) => Promise<void> | void;
}) {
  haptic('medium');
  void Promise.resolve(opts.remove(opts.productId));
  toast(`${opts.title} removed`, {
    description: 'Tap undo to add it back to your cart.',
    duration: 5000,
    action: {
      label: 'Undo',
      onClick: () => {
        haptic('selection');
        void Promise.resolve(opts.restore(opts.productId));
      },
    },
    icon: <Undo2 className="w-4 h-4" />,
  });
}

// ---------- 2) Stock-warning banner ----------
export function StockWarningBanner({
  items,
}: {
  items: { product_id: string; title: string; stock?: number; quantity: number }[];
}) {
  const lowStock = items.filter(
    (i) => typeof i.stock === 'number' && i.stock > 0 && i.stock <= 5,
  );
  const oversold = items.filter(
    (i) => typeof i.stock === 'number' && i.stock < i.quantity,
  );

  if (lowStock.length === 0 && oversold.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="mb-4 rounded-xl border border-warning/30 bg-warning/5 p-3 sm:p-4"
        role="alert"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-warning/15 shrink-0">
            <AlertTriangle className="w-4 h-4 text-warning" />
          </div>
          <div className="text-sm space-y-1">
            {oversold.length > 0 && (
              <p className="font-medium text-warning flex items-center gap-1.5">
                <PackageX className="w-3.5 h-3.5" />
                {oversold.length} item{oversold.length > 1 ? 's' : ''} exceed available stock — please reduce quantity.
              </p>
            )}
            {lowStock.length > 0 && (
              <p className="text-muted-foreground">
                Hurry — {lowStock[0].title}
                {lowStock.length > 1 ? ` and ${lowStock.length - 1} more` : ''} have only a few left in stock.
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ---------- 3) Applied-offer breakdown ----------
export interface AppliedOffer {
  label: string;
  amount: number; // negative = saving, positive = surcharge
  code?: string;
  type?: 'promo' | 'coupon' | 'reward' | 'bundle' | 'flash' | 'tier';
}

export function AppliedOfferBreakdown({
  offers,
  totalSaved,
}: {
  offers: AppliedOffer[];
  totalSaved: number;
}) {
  if (!offers || offers.length === 0) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="rounded-xl border border-success/20 bg-success/5 p-3 space-y-2"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-success">
          <TicketPercent className="w-4 h-4" />
          Applied offers
        </div>
        <Badge variant="secondary" className="bg-success/15 text-success border-success/20">
          You saved {fmt(totalSaved)}
        </Badge>
      </div>
      <ul className="space-y-1 text-sm">
        {offers.map((o, i) => (
          <li key={`${o.label}-${i}`} className="flex justify-between gap-3">
            <span className="text-muted-foreground truncate">
              {o.label}
              {o.code && <span className="ml-1 text-[11px] opacity-70">({o.code})</span>}
            </span>
            <span className={o.amount <= 0 ? 'text-success font-medium' : 'text-warning font-medium'}>
              {o.amount <= 0 ? '-' : '+'}
              {fmt(Math.abs(o.amount))}
            </span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

// ---------- 4) Gift wrap upsell card ----------
export function GiftWrapCard({
  enabled,
  fee = 49,
  onChange,
  message,
  onMessageChange,
}: {
  enabled: boolean;
  fee?: number;
  onChange: (v: boolean) => void;
  message?: string;
  onMessageChange?: (m: string) => void;
}) {
  return (
    <motion.div
      layout
      className={`rounded-xl border p-4 transition-colors ${
        enabled ? 'border-accent/40 bg-accent/5' : 'border-border bg-card'
      }`}
    >
      <label className="flex items-start gap-3 cursor-pointer">
        <div className={`p-2 rounded-lg shrink-0 ${enabled ? 'bg-accent/20' : 'bg-muted'}`}>
          <Gift className={`w-5 h-5 ${enabled ? 'text-accent' : 'text-muted-foreground'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-sm">Add gift wrap</span>
            <span className="text-xs font-semibold text-accent">+{fmt(fee)}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Premium kraft wrap with a handwritten note. Adds a luxe touch.
          </p>
        </div>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            haptic('selection');
            onChange(e.target.checked);
          }}
          className="mt-1 h-4 w-4 accent-accent"
          aria-label="Add gift wrap"
        />
      </label>

      <AnimatePresence initial={false}>
        {enabled && onMessageChange && (
          <motion.div
            key="msg"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="mt-3"
          >
            <textarea
              value={message ?? ''}
              onChange={(e) => onMessageChange(e.target.value.slice(0, 200))}
              rows={2}
              maxLength={200}
              placeholder="Add a personal message (max 200 chars)"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
            <p className="text-[11px] text-muted-foreground mt-1 text-right">
              {(message ?? '').length}/200
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
