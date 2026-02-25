import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Package, Truck, CheckCircle, Loader2, Printer, ClipboardCheck, Box, Weight, MapPin, FileText, Tag,
} from 'lucide-react';
import { toast } from 'sonner';
import { useDeliverySlip } from '@/hooks/useDeliverySlip';

interface VendorOrderFulfillmentProps {
  order: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FulfillmentStep = 'pick' | 'pack' | 'ship';

export function VendorOrderFulfillment({ order, open, onOpenChange }: VendorOrderFulfillmentProps) {
  const queryClient = useQueryClient();
  const { generateSlip, generating: slipGenerating } = useDeliverySlip();
  const [step, setStep] = useState<FulfillmentStep>('pick');
  const [pickedItems, setPickedItems] = useState<Record<string, boolean>>({});
  const [packageWeight, setPackageWeight] = useState('');
  const [packageDimensions, setPackageDimensions] = useState({ l: '', w: '', h: '' });
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [fulfillmentNote, setFulfillmentNote] = useState('');

  const items = order?.order_items || [];
  const allPicked = items.length > 0 && items.every((item: any) => pickedItems[item.id]);
  const shippingAddr = order?.orders?.shipping_address;

  const updateStatus = useMutation({
    mutationFn: async ({ status, tracking }: { status: string; tracking?: { number: string; carrier: string } }) => {
      const updateData: Record<string, unknown> = { status };
      if (status === 'shipped' && tracking) {
        updateData.tracking_number = tracking.number;
        updateData.carrier = tracking.carrier;
        updateData.shipped_at = new Date().toISOString();
      }
      if (status === 'processing') {
        // no additional fields
      }

      const { error } = await supabase
        .from('sub_orders')
        .update(updateData)
        .eq('id', order.id);
      if (error) throw error;

      // Send customer notification email
      if (status === 'shipped' && tracking) {
        const { data: subOrder } = await supabase
          .from('sub_orders')
          .select('*, orders(order_number, customer_id)')
          .eq('id', order.id)
          .single();

        if (subOrder?.orders?.customer_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', subOrder.orders.customer_id)
            .single();

          if (profile?.email) {
            try {
              await supabase.functions.invoke('send-email', {
                body: {
                  type: 'shipping_update',
                  to: profile.email,
                  data: {
                    customerName: profile.full_name || 'Customer',
                    orderNumber: subOrder.orders.order_number,
                    trackingNumber: tracking.number,
                    carrier: tracking.carrier,
                  },
                },
              });
            } catch (err) {
              console.error('Email send failed:', err);
            }
          }
        }
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['vendor-orders'] });
      const msgs: Record<string, string> = {
        processing: 'Items picked — order processing',
        shipped: 'Order shipped — customer notified',
      };
      toast.success(msgs[vars.status] || 'Order updated');
      if (vars.status === 'shipped') onOpenChange(false);
    },
    onError: () => toast.error('Failed to update order'),
  });

  const handleConfirmPick = () => {
    updateStatus.mutate({ status: 'processing' });
    setStep('pack');
  };

  const handleConfirmPack = () => {
    setStep('ship');
  };

  const handleShip = () => {
    if (!trackingNumber || !carrier) {
      toast.error('Please fill tracking details');
      return;
    }
    updateStatus.mutate({ status: 'shipped', tracking: { number: trackingNumber, carrier } });
  };

  const handleGenerateSlip = (slipType: "packing" | "delivery" | "shipping_label") => {
    generateSlip({
      sub_order_ids: [order.id],
      slip_type: slipType,
      weight: packageWeight || undefined,
      dimensions: (packageDimensions.l || packageDimensions.w || packageDimensions.h)
        ? packageDimensions
        : undefined,
    });
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5" />
            Fulfill Order {order.sub_order_number}
          </DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 py-2">
          {(['pick', 'pack', 'ship'] as FulfillmentStep[]).map((s, i) => {
            const icons = { pick: Package, pack: Box, ship: Truck };
            const Icon = icons[s];
            const active = step === s;
            const done = ['pick', 'pack', 'ship'].indexOf(step) > i;
            return (
              <React.Fragment key={s}>
                {i > 0 && <div className={`h-0.5 w-8 ${done ? 'bg-success' : 'bg-border'}`} />}
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                  active ? 'bg-accent text-accent-foreground' : done ? 'bg-success/10 text-success' : 'bg-secondary text-muted-foreground'
                }`}>
                  {done ? <CheckCircle className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </div>
              </React.Fragment>
            );
          })}
        </div>

        <Separator />

        {/* Pick Step */}
        {step === 'pick' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Pick all items from your inventory</p>
            <div className="space-y-2">
              {items.map((item: any) => (
                <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                  <Checkbox checked={!!pickedItems[item.id]} onCheckedChange={c => setPickedItems(p => ({ ...p, [item.id]: !!c }))} />
                  {item.product_image && <img src={item.product_image} alt="" className="w-10 h-10 rounded object-cover" />}
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.product_title}</p>
                    <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
            <Button onClick={handleConfirmPick} disabled={!allPicked || updateStatus.isPending} className="w-full gap-2">
              {updateStatus.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Confirm Pick ({Object.values(pickedItems).filter(Boolean).length}/{items.length})
            </Button>
          </div>
        )}

        {/* Pack Step */}
        {step === 'pack' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Pack items and record package details</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-1"><Weight className="w-3 h-3" /> Weight (kg)</Label>
                <Input type="number" placeholder="0.5" value={packageWeight} onChange={e => setPackageWeight(e.target.value)} />
              </div>
              <div className="col-span-2 grid grid-cols-3 gap-2">
                <div>
                  <Label>Length (cm)</Label>
                  <Input type="number" value={packageDimensions.l} onChange={e => setPackageDimensions(p => ({ ...p, l: e.target.value }))} />
                </div>
                <div>
                  <Label>Width (cm)</Label>
                  <Input type="number" value={packageDimensions.w} onChange={e => setPackageDimensions(p => ({ ...p, w: e.target.value }))} />
                </div>
                <div>
                  <Label>Height (cm)</Label>
                  <Input type="number" value={packageDimensions.h} onChange={e => setPackageDimensions(p => ({ ...p, h: e.target.value }))} />
                </div>
              </div>
            </div>

            {/* Shipping address preview */}
            {shippingAddr && (
              <Card>
                <CardContent className="py-3">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium">{shippingAddr.name || shippingAddr.full_name}</p>
                      <p className="text-muted-foreground">{shippingAddr.address || shippingAddr.address_line1}, {shippingAddr.city}, {shippingAddr.state} {shippingAddr.pincode}</p>
                      <p className="text-muted-foreground">Phone: {shippingAddr.phone}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleGenerateSlip("packing")} disabled={slipGenerating} className="flex-1 gap-2">
                <Printer className="w-4 h-4" /> Packing Slip
              </Button>
              <Button variant="outline" onClick={() => handleGenerateSlip("delivery")} disabled={slipGenerating} className="flex-1 gap-2">
                <FileText className="w-4 h-4" /> Delivery Slip
              </Button>
              <Button onClick={handleConfirmPack} className="flex-1 gap-2">
                <Box className="w-4 h-4" /> Confirm Pack
              </Button>
            </div>
            <Button variant="secondary" onClick={() => handleGenerateSlip("shipping_label")} disabled={slipGenerating} className="w-full gap-2">
              <Tag className="w-4 h-4" /> Generate Shipping Label
            </Button>
          </div>
        )}

        {/* Ship Step */}
        {step === 'ship' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Enter tracking details to ship</p>
            <div>
              <Label>Carrier</Label>
              <Select value={carrier} onValueChange={setCarrier}>
                <SelectTrigger><SelectValue placeholder="Select carrier" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="delhivery">Delhivery</SelectItem>
                  <SelectItem value="bluedart">BlueDart</SelectItem>
                  <SelectItem value="dtdc">DTDC</SelectItem>
                  <SelectItem value="fedex">FedEx</SelectItem>
                  <SelectItem value="india_post">India Post</SelectItem>
                  <SelectItem value="ecom_express">Ecom Express</SelectItem>
                  <SelectItem value="xpressbees">Xpressbees</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tracking Number</Label>
              <Input placeholder="Enter tracking number" value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} />
            </div>
            <div>
              <Label>Fulfillment Note (optional)</Label>
              <Textarea placeholder="Any notes..." value={fulfillmentNote} onChange={e => setFulfillmentNote(e.target.value)} rows={2} />
            </div>
            <Button onClick={handleShip} disabled={updateStatus.isPending || !trackingNumber || !carrier} className="w-full gap-2">
              {updateStatus.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
              Ship Order
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
