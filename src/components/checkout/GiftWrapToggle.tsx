import { motion } from 'framer-motion';
import { Gift, Sparkles } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export interface GiftOptions {
  is_gift: boolean;
  gift_recipient_name: string;
  gift_message: string;
  gift_wrap_fee: number;
}

export const DEFAULT_GIFT_OPTIONS: GiftOptions = {
  is_gift: false,
  gift_recipient_name: '',
  gift_message: '',
  gift_wrap_fee: 49,
};

const MAX_MSG = 280;
const WRAP_FEE = 49; // ₹ flat. Adjust via admin in future iterations.

interface Props {
  value: GiftOptions;
  onChange: (next: GiftOptions) => void;
  className?: string;
}

/**
 * Drop-in checkout component. Pass the controlled `value` and write
 * the resulting fields into the orders insert payload:
 *   { is_gift, gift_recipient_name, gift_message, gift_wrap_fee }
 * Server-side trigger validates length and zeroes fields when is_gift=false.
 */
export function GiftWrapToggle({ value, onChange, className }: Props) {
  const update = (patch: Partial<GiftOptions>) =>
    onChange({ ...value, ...patch });

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`rounded-2xl border border-border/40 bg-background/40 p-4 ${className ?? ''}`}
      aria-labelledby="gift-wrap-heading"
    >
      <label className="flex items-center justify-between gap-3 cursor-pointer">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
            <Gift className="w-5 h-5 text-accent" aria-hidden />
          </div>
          <div className="min-w-0">
            <p id="gift-wrap-heading" className="text-sm font-semibold flex items-center gap-1.5">
              Send as gift
              <Sparkles className="w-3.5 h-3.5 text-accent" aria-hidden />
            </p>
            <p className="text-xs text-muted-foreground">
              Hide prices on invoice • premium wrap • handwritten note (+₹{WRAP_FEE})
            </p>
          </div>
        </div>
        <Switch
          checked={value.is_gift}
          onCheckedChange={(v) =>
            update({
              is_gift: v,
              gift_wrap_fee: v ? WRAP_FEE : 0,
              gift_recipient_name: v ? value.gift_recipient_name : '',
              gift_message: v ? value.gift_message : '',
            })
          }
          aria-label="Toggle gift wrap"
        />
      </label>

      {value.is_gift && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="mt-4 space-y-3 overflow-hidden"
        >
          <div className="space-y-1.5">
            <Label htmlFor="gift-recipient" className="text-xs">Recipient name</Label>
            <Input
              id="gift-recipient"
              value={value.gift_recipient_name}
              onChange={(e) => update({ gift_recipient_name: e.target.value.slice(0, 80) })}
              placeholder="Who's this for?"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gift-message" className="text-xs">Message on the card</Label>
            <Textarea
              id="gift-message"
              value={value.gift_message}
              onChange={(e) => update({ gift_message: e.target.value.slice(0, MAX_MSG) })}
              rows={3}
              placeholder="Happy birthday! Hope this brings a smile ✨"
              className="resize-none"
              maxLength={MAX_MSG}
            />
            <p className="text-[11px] text-muted-foreground text-right tabular-nums">
              {value.gift_message.length}/{MAX_MSG}
            </p>
          </div>
        </motion.div>
      )}
    </motion.section>
  );
}
