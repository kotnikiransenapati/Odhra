import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useOrders } from '@/hooks/useOrders';
import { useCreateReturn } from '@/hooks/useReturns';
import { useAuth } from '@/contexts/AuthContext';
import { PageLoading } from '@/components/ui/LoadingSpinner';
import {
  ArrowLeft,
  Package,
  RotateCcw,
  Camera,
  CheckCircle,
  AlertCircle,
  Loader2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';

const RETURN_REASONS = [
  { value: 'defective', label: 'Product is defective or damaged' },
  { value: 'wrong_item', label: 'Wrong item received' },
  { value: 'not_as_described', label: 'Product not as described' },
  { value: 'size_fit', label: 'Size/fit issue' },
  { value: 'quality', label: 'Quality not satisfactory' },
  { value: 'changed_mind', label: 'Changed my mind' },
  { value: 'other', label: 'Other reason' },
];

type ReturnType = 'refund' | 'exchange';

export default function ReturnRequest() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: orders, isLoading } = useOrders();
  const createReturn = useCreateReturn();

  const [step, setStep] = useState(1);
  const [selectedSubOrder, setSelectedSubOrder] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [reason, setReason] = useState('');
  const [reasonDetails, setReasonDetails] = useState('');
  const [returnType, setReturnType] = useState<ReturnType>('refund');
  const [refundMethod, setRefundMethod] = useState('original');

  const order = orders?.find((o) => o.id === orderId);

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  const eligibleSubOrders = order?.sub_orders.filter(
    (so) => so.status === 'delivered'
  ) || [];

  const currentSubOrder = eligibleSubOrders.find((so) => so.id === selectedSubOrder);

  const selectedItemCount = Object.values(selectedItems).reduce((a, b) => a + b, 0);
  const refundAmount = currentSubOrder?.items
    .filter((item) => selectedItems[item.id])
    .reduce((sum, item) => sum + item.unit_price * (selectedItems[item.id] || 0), 0) || 0;

  const handleToggleItem = (itemId: string, maxQty: number) => {
    setSelectedItems((prev) => {
      if (prev[itemId]) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: maxQty };
    });
  };

  const handleSubmit = async () => {
    if (!order || !selectedSubOrder || !currentSubOrder || selectedItemCount === 0 || !reason) return;

    try {
      await createReturn.mutateAsync({
        order_id: order.id,
        sub_order_id: selectedSubOrder,
        vendor_id: currentSubOrder.vendor_id,
        return_reason: reason,
        return_reason_details: reasonDetails || undefined,
        items: Object.entries(selectedItems).map(([order_item_id, quantity]) => ({
          order_item_id,
          quantity,
          reason,
        })),
      });
      setStep(4); // success step
    } catch {
      // error handled by hook
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center h-[60vh] px-4">
          <Package className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Login Required</h2>
          <Button asChild><Link to="/auth">Login / Sign Up</Link></Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24"><PageLoading text="Loading order..." /></div>
      </div>
    );
  }

  if (!order || eligibleSubOrders.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center h-[60vh] px-4">
          <AlertCircle className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Return Not Available</h2>
          <p className="text-muted-foreground mb-6 text-center max-w-md">
            {!order ? "Order not found." : "No delivered items eligible for return."}
          </p>
          <Button asChild><Link to="/orders">Back to Orders</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <Button variant="ghost" asChild className="mb-4">
              <Link to={`/orders/${orderId}`} className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Back to Order
              </Link>
            </Button>
            <h1 className="text-display-sm font-bold flex items-center gap-3">
              <RotateCcw className="w-7 h-7 text-accent" />
              Return Request
            </h1>
            <p className="text-muted-foreground mt-1">Order {order.order_number}</p>
          </motion.div>

          {/* Step Indicators */}
          <div className="flex items-center gap-2 mb-8">
            {[1, 2, 3].map((s) => (
              <React.Fragment key={s}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  step >= s ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  {step > s ? <CheckCircle className="w-4 h-4" /> : s}
                </div>
                {s < 3 && <div className={`flex-1 h-1 rounded-full transition-all ${step > s ? 'bg-accent' : 'bg-muted'}`} />}
              </React.Fragment>
            ))}
          </div>

          {/* Step 1: Select Items */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <h2 className="text-lg font-semibold">Select items to return</h2>

              {eligibleSubOrders.map((subOrder) => (
                <Card key={subOrder.id} className="glass">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">{subOrder.vendor_name || 'Vendor'}</CardTitle>
                      <Badge variant="outline">{subOrder.sub_order_number}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {subOrder.items.map((item) => (
                      <div
                        key={item.id}
                        className={`flex gap-4 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                          selectedItems[item.id] ? 'border-accent bg-accent/5' : 'border-transparent bg-secondary/30'
                        }`}
                        onClick={() => {
                          setSelectedSubOrder(subOrder.id);
                          handleToggleItem(item.id, item.quantity);
                        }}
                      >
                        <Checkbox
                          checked={!!selectedItems[item.id]}
                          className="mt-1"
                        />
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                          <img src={item.product_image || '/placeholder.svg'} alt={item.product_title} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.product_title}</p>
                          <p className="text-sm text-muted-foreground">Qty: {item.quantity} × {formatPrice(item.unit_price)}</p>
                          <p className="font-semibold text-sm mt-1">{formatPrice(item.total_price)}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}

              <Button onClick={() => setStep(2)} disabled={selectedItemCount === 0} className="w-full h-12 gap-2">
                Continue <span className="text-xs opacity-70">({selectedItemCount} item{selectedItemCount !== 1 ? 's' : ''} selected)</span>
              </Button>
            </motion.div>
          )}

          {/* Step 2: Reason */}
          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <h2 className="text-lg font-semibold">Why are you returning?</h2>

              {/* Return or Exchange toggle */}
              <div className="space-y-3">
                <Label>What would you like to do?</Label>
                <RadioGroup value={returnType} onValueChange={(v) => setReturnType(v as ReturnType)} className="grid grid-cols-2 gap-3">
                  <div className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${returnType === 'refund' ? 'border-accent bg-accent/5' : 'border-border'}`}>
                    <RadioGroupItem value="refund" id="type-refund" />
                    <Label htmlFor="type-refund" className="cursor-pointer">
                      <p className="font-medium text-sm">Return & Refund</p>
                      <p className="text-xs text-muted-foreground">Get your money back</p>
                    </Label>
                  </div>
                  <div className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${returnType === 'exchange' ? 'border-accent bg-accent/5' : 'border-border'}`}>
                    <RadioGroupItem value="exchange" id="type-exchange" />
                    <Label htmlFor="type-exchange" className="cursor-pointer">
                      <p className="font-medium text-sm">Exchange</p>
                      <p className="text-xs text-muted-foreground">Get a replacement</p>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {RETURN_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="space-y-2">
                <Label>Additional details (optional)</Label>
                <Textarea
                  value={reasonDetails}
                  onChange={(e) => setReasonDetails(e.target.value)}
                  placeholder="Describe the issue in detail..."
                  rows={4}
                />
              </div>

              {/* Refund method - only for return type */}
              {returnType === 'refund' && (
                <div className="space-y-3">
                  <Label>Preferred refund method</Label>
                  <RadioGroup value={refundMethod} onValueChange={setRefundMethod} className="space-y-2">
                    <div className="flex items-center space-x-3 p-3 rounded-xl bg-secondary/30">
                      <RadioGroupItem value="original" id="original" />
                      <Label htmlFor="original" className="cursor-pointer flex-1">
                        <p className="font-medium text-sm">Original payment method</p>
                        <p className="text-xs text-muted-foreground">Refund to card/UPI used for payment</p>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3 p-3 rounded-xl bg-secondary/30">
                      <RadioGroupItem value="wallet" id="wallet" />
                      <Label htmlFor="wallet" className="cursor-pointer flex-1">
                        <p className="font-medium text-sm">Store credit (instant)</p>
                        <p className="text-xs text-muted-foreground">Get refund as store credit immediately</p>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {returnType === 'exchange' && (
                <div className="p-4 rounded-xl bg-accent/5 border border-accent/20">
                  <div className="flex items-start gap-3">
                    <RotateCcw className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium">Exchange Process</p>
                      <ul className="mt-2 space-y-1 text-muted-foreground">
                        <li>• We'll send a replacement of the same product</li>
                        <li>• Different size/variant if available</li>
                        <li>• If out of stock, a refund will be issued instead</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-12">Back</Button>
                <Button onClick={() => setStep(3)} disabled={!reason} className="flex-1 h-12">Review & Submit</Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Review & Confirm */}
          {step === 3 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <h2 className="text-lg font-semibold">Review your return request</h2>

              <Card className="glass">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Request type</span>
                    <Badge variant={returnType === 'exchange' ? 'secondary' : 'outline'}>
                      {returnType === 'exchange' ? 'Exchange' : 'Return & Refund'}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Items to return</span>
                    <span className="font-medium">{selectedItemCount} item{selectedItemCount !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Return reason</span>
                    <span className="font-medium">{RETURN_REASONS.find(r => r.value === reason)?.label}</span>
                  </div>
                  {returnType === 'refund' && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Refund method</span>
                      <span className="font-medium">{refundMethod === 'original' ? 'Original payment' : 'Store credit'}</span>
                    </div>
                  )}
                  <div className="border-t border-border pt-4 flex justify-between">
                    <span className="font-semibold">{returnType === 'exchange' ? 'Item Value' : 'Estimated Refund'}</span>
                    <span className="font-bold text-lg text-accent">{formatPrice(refundAmount)}</span>
                  </div>
                </CardContent>
              </Card>

              <div className="p-4 rounded-xl bg-info/10 border border-info/20">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-info shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-info">What happens next?</p>
                    <ul className="mt-2 space-y-1 text-muted-foreground">
                      <li>• We'll review your request within 24 hours</li>
                      <li>• A pickup will be scheduled at your address</li>
                      <li>• Refund will be processed after inspection</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1 h-12">Back</Button>
                <Button
                  onClick={handleSubmit}
                  disabled={createReturn.isPending}
                  className="flex-1 h-12 gap-2"
                >
                  {createReturn.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                  Submit Return
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Success */}
          {step === 4 && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                className="w-24 h-24 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle className="w-12 h-12 text-success" />
              </motion.div>
              <h2 className="text-2xl font-bold mb-2">Return Request Submitted!</h2>
              <p className="text-muted-foreground mb-2 max-w-md mx-auto">
                We'll review your request and get back to you within 24 hours.
              </p>
              <p className="text-sm text-muted-foreground mb-8">
                Estimated refund: <span className="font-bold text-accent">{formatPrice(refundAmount)}</span>
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" asChild>
                  <Link to="/orders">View Orders</Link>
                </Button>
                <Button asChild>
                  <Link to="/account/returns">Track Returns</Link>
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
