import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, ShoppingBag } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useExitIntent } from '@/hooks/useExitIntent';
import { usePopupSlot } from '@/lib/popupQueue';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Exit-Intent Smart Offer — shows a non-blocking sheet when:
 *  - the cart has items,
 *  - exit-intent is detected (desktop pointer-out or mobile back),
 *  - the user hasn't dismissed it within the cooldown window,
 *  - no higher-priority popup is currently visible.
 *
 * The promo code is sourced from system_settings.exit_intent_offer
 * (admin-controlled). Falls back to a safe default if missing.
 */

interface OfferConfig {
  enabled: boolean;
  code: string;
  headline: string;
  subhead: string;
  min_subtotal: number;
}

const DEFAULT_OFFER: OfferConfig = {
  enabled: true,
  code: 'STAY10',
  headline: 'Wait — your picks are still here',
  subhead: 'Complete your order in the next 15 minutes and save instantly.',
  min_subtotal: 0,
};

function useOfferConfig(): OfferConfig {
  const [cfg, setCfg] = useState<OfferConfig>(DEFAULT_OFFER);
  useEffect(() => {
    let cancelled = false;
    supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'exit_intent_offer')
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data?.value) return;
        const v = data.value as Partial<OfferConfig>;
        setCfg({ ...DEFAULT_OFFER, ...v });
      });
    return () => { cancelled = true; };
  }, []);
  return cfg;
}

export function ExitIntentOffer() {
  const cfg = useOfferConfig();
  const { items } = useCart();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const subtotal = useMemo(
    () => items.reduce((s, i) => s + (i.price ?? 0) * (i.quantity ?? 1), 0),
    [items],
  );
  const eligible = cfg.enabled && items.length > 0 && subtotal >= cfg.min_subtotal;

  const { triggered, dismiss } = useExitIntent(eligible, {
    key: `cart-${cfg.code}`,
    minDwellMs: 10_000,
  });

  // Don't fight the popup queue (welcome, cookie, install, etc.)
  const canShow = usePopupSlot('exit-intent-offer', 25, triggered);

  // Log exposure once per trigger
  useEffect(() => {
    if (!canShow) return;
    void supabase.from('analytics_events').insert({
      event_type: 'exit_intent_shown',
      session_id: getSessionId(),
      properties: { code: cfg.code, subtotal, items: items.length } as never,
    });
  }, [canShow, cfg.code, subtotal, items.length]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(cfg.code);
      setCopied(true);
      toast.success(`Code ${cfg.code} copied`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy code');
    }
  };

  return (
    <Sheet open={canShow} onOpenChange={(o) => !o && dismiss()}>
      <SheetContent side="bottom" className="rounded-t-2xl border-t-4 border-accent">
        <SheetHeader className="text-left">
          <Badge variant="secondary" className="w-fit uppercase tracking-wider">Limited offer</Badge>
          <SheetTitle className="font-serif text-2xl leading-tight">{cfg.headline}</SheetTitle>
          <SheetDescription>{cfg.subhead}</SheetDescription>
        </SheetHeader>

        <div className="my-4 flex items-center justify-between gap-3 rounded-lg border border-dashed border-accent/50 bg-accent/5 p-3">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Use code</p>
            <p className="font-mono text-xl font-semibold tracking-widest">{cfg.code}</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={copy}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            <span className="ml-1">{copied ? 'Copied' : 'Copy'}</span>
          </Button>
        </div>

        <SheetFooter className="flex-row gap-2">
          <Button variant="ghost" className="flex-1" onClick={dismiss}>No thanks</Button>
          <Button
            className="flex-1"
            onClick={() => {
              void supabase.from('analytics_events').insert({
                event_type: 'exit_intent_cta',
                session_id: getSessionId(),
                properties: { code: cfg.code, subtotal } as never,
              });
              dismiss();
              navigate('/checkout');
            }}
          >
            <ShoppingBag className="size-4 mr-1" /> Resume checkout
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function getSessionId(): string {
  try {
    const k = 'odhra.session.id';
    let v = sessionStorage.getItem(k);
    if (!v) {
      v = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      sessionStorage.setItem(k, v);
    }
    return v;
  } catch {
    return 'anon';
  }
}

export default ExitIntentOffer;
