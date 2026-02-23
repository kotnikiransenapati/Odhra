import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, XCircle, IndianRupee } from 'lucide-react';
import { CANCELLATION_REASONS, useOrderCancellation, canCancelOrder } from '@/hooks/useOrderCancellation';

interface OrderCancellationDialogProps {
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  totalAmount: number;
  children?: React.ReactNode;
}

export function OrderCancellationDialog({
  orderId,
  orderNumber,
  orderStatus,
  totalAmount,
  children,
}: OrderCancellationDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'reason' | 'confirm'>('reason');
  const [selectedReason, setSelectedReason] = useState('');
  const [additionalComments, setAdditionalComments] = useState('');
  const { cancelOrder } = useOrderCancellation();

  const selectedReasonLabel = CANCELLATION_REASONS.find(r => r.value === selectedReason)?.label || '';

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleCancel = async () => {
    await cancelOrder.mutateAsync({
      orderId,
      reason: selectedReasonLabel,
      reasonCategory: selectedReason,
      additionalComments,
    });
    setOpen(false);
    setStep('reason');
    setSelectedReason('');
    setAdditionalComments('');
  };

  if (!canCancelOrder(orderStatus)) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v);
      if (!v) {
        setStep('reason');
        setSelectedReason('');
        setAdditionalComments('');
      }
    }}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="destructive" size="sm" className="gap-2">
            <XCircle className="w-4 h-4" />
            Cancel Order
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {step === 'reason' ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                Cancel Order {orderNumber}
              </DialogTitle>
              <DialogDescription>
                Please let us know why you'd like to cancel this order.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
                {CANCELLATION_REASONS.map((reason) => (
                  <div key={reason.value} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value={reason.value} id={reason.value} />
                    <Label htmlFor={reason.value} className="cursor-pointer flex-1 text-sm">
                      {reason.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Additional comments (optional)</Label>
                <Textarea
                  placeholder="Tell us more about why you want to cancel..."
                  value={additionalComments}
                  onChange={(e) => setAdditionalComments(e.target.value)}
                  rows={3}
                  maxLength={500}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Keep Order
              </Button>
              <Button
                variant="destructive"
                disabled={!selectedReason}
                onClick={() => setStep('confirm')}
              >
                Continue
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                Confirm Cancellation
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This action cannot be undone. Your order will be cancelled and a refund will be initiated.
                </AlertDescription>
              </Alert>

              <div className="space-y-3 p-4 rounded-xl bg-muted/50">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Order</span>
                  <span className="font-medium">{orderNumber}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Reason</span>
                  <span className="font-medium">{selectedReasonLabel}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Refund Amount</span>
                  <Badge className="bg-success/10 text-success border-success/20 font-semibold">
                    {formatPrice(totalAmount)}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Refund Timeline</span>
                  <span className="text-xs">5-7 business days</span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('reason')}>
                Go Back
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancel}
                disabled={cancelOrder.isPending}
                className="gap-2"
              >
                {cancelOrder.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    Cancel Order
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
