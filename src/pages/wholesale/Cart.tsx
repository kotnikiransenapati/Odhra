import { useWholesaleCart } from "@/hooks/useWholesaleCart";
import { useWholesaler } from "@/hooks/useWholesaler";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Send, Loader2, ShieldCheck, AlertTriangle } from "lucide-react";
import { useState } from "react";

export default function WholesaleCart() {
  const { account } = useWholesaler();
  const { loading, cart, items, updateQty, updateMeta, submitForApproval } = useWholesaleCart();
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return <div className="py-16 grid place-items-center"><Loader2 className="animate-spin" /></div>;
  }

  if (!cart || items.length === 0) {
    return (
      <Card className="p-10 text-center">
        <h2 className="text-xl font-semibold mb-2">Your bulk cart is empty</h2>
        <p className="text-sm text-muted-foreground">Add items from the wholesale catalog to begin.</p>
      </Card>
    );
  }

  const creditAvail = Math.max((account?.credit_limit ?? 0) - (account?.credit_used ?? 0), 0);
  const overLimit = cart.grand_total > creditAvail;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Bulk Cart</h1>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="p-3">Product</th>
              <th className="p-3 w-28">Qty</th>
              <th className="p-3 w-28 text-right">Unit</th>
              <th className="p-3 w-12 text-right">GST</th>
              <th className="p-3 w-32 text-right">Line total</th>
              <th className="p-3 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-t border-border">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-muted overflow-hidden shrink-0">
                      {it.product?.image_url && (
                        <img src={it.product.image_url} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <span className="font-medium">{it.product?.name ?? "—"}</span>
                  </div>
                </td>
                <td className="p-3">
                  <Input
                    type="number"
                    min={1}
                    value={it.qty}
                    onChange={(e) => updateQty(it.id, parseInt(e.target.value) || 0)}
                    className="h-8 w-20"
                  />
                </td>
                <td className="p-3 text-right">₹{Number(it.unit_price).toFixed(2)}</td>
                <td className="p-3 text-right">{it.gst_rate}%</td>
                <td className="p-3 text-right font-semibold">₹{Number(it.line_total).toFixed(2)}</td>
                <td className="p-3 text-right">
                  <Button size="icon" variant="ghost" onClick={() => updateQty(it.id, 0)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-4 space-y-3">
          <div>
            <label className="text-xs uppercase tracking-wide text-muted-foreground">PO Number</label>
            <Input
              value={cart.po_number ?? ""}
              onChange={(e) => updateMeta({ po_number: e.target.value })}
              placeholder="e.g. PO-2026-0042"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-muted-foreground">Requested delivery date</label>
            <Input
              type="date"
              value={cart.requested_delivery_date ?? ""}
              onChange={(e) => updateMeta({ requested_delivery_date: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-muted-foreground">Notes</label>
            <Textarea
              value={cart.notes ?? ""}
              onChange={(e) => updateMeta({ notes: e.target.value })}
              rows={3}
              placeholder="Special instructions…"
            />
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <Row label="Subtotal" value={`₹${Number(cart.subtotal).toFixed(2)}`} />
          <Row label="GST" value={`₹${Number(cart.tax_total).toFixed(2)}`} />
          <div className="border-t border-border pt-3">
            <Row label="Grand total" value={`₹${Number(cart.grand_total).toFixed(2)}`} bold />
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" /> Credit available ₹{creditAvail.toLocaleString("en-IN")}
          </div>
          {overLimit && (
            <div className="flex items-start gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-2 rounded">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Order exceeds credit limit; an admin review is required before dispatch.
            </div>
          )}
          <Button
            className="w-full"
            disabled={submitting || items.length === 0}
            onClick={async () => {
              setSubmitting(true);
              try { await submitForApproval(); } finally { setSubmitting(false); }
            }}
          >
            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Submit for approval
          </Button>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "text-lg font-bold" : "text-sm"}`}>
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
