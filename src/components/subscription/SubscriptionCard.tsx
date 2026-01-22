import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Calendar,
  Package,
  Pause,
  Play,
  X,
  Edit3,
  SkipForward,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Minus,
  Plus,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Subscription,
  formatInterval,
  usePauseSubscription,
  useResumeSubscription,
  useCancelSubscription,
  useUpdateSubscriptionQuantity,
  useSkipNextOrder,
} from '@/hooks/useSubscriptions';
import { cn } from '@/lib/utils';

interface SubscriptionCardProps {
  subscription: Subscription;
}

export function SubscriptionCard({ subscription }: SubscriptionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [pauseDate, setPauseDate] = useState<Date>();

  const pauseMutation = usePauseSubscription();
  const resumeMutation = useResumeSubscription();
  const cancelMutation = useCancelSubscription();
  const updateQuantityMutation = useUpdateSubscriptionQuantity();
  const skipOrderMutation = useSkipNextOrder();

  const isActive = subscription.status === 'active';
  const isPaused = subscription.status === 'paused';
  const isCancelled = subscription.status === 'cancelled';

  const primaryImage = subscription.product?.product_images?.find(img => img.is_primary) 
    || subscription.product?.product_images?.[0];

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handlePause = () => {
    if (pauseDate) {
      pauseMutation.mutate({ subscriptionId: subscription.id, pauseUntil: pauseDate });
      setShowPauseDialog(false);
    }
  };

  const handleResume = () => {
    resumeMutation.mutate(subscription.id);
  };

  const handleCancel = () => {
    cancelMutation.mutate({ subscriptionId: subscription.id, reason: cancelReason });
    setShowCancelDialog(false);
  };

  const handleQuantityChange = (delta: number) => {
    const newQuantity = Math.max(1, subscription.quantity + delta);
    updateQuantityMutation.mutate({ subscriptionId: subscription.id, quantity: newQuantity });
  };

  const handleSkip = () => {
    skipOrderMutation.mutate(subscription.id);
  };

  const statusConfig = {
    active: { label: 'Active', color: 'bg-green-500/10 text-green-600 border-green-500/20', icon: CheckCircle },
    paused: { label: 'Paused', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', icon: Pause },
    cancelled: { label: 'Cancelled', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: X },
    expired: { label: 'Expired', color: 'bg-muted text-muted-foreground border-muted', icon: AlertCircle },
  };

  const status = statusConfig[subscription.status];
  const StatusIcon = status.icon;

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className={cn(
          'overflow-hidden transition-all',
          isCancelled && 'opacity-60'
        )}>
          <CardHeader className="p-4 pb-0">
            <div className="flex items-start gap-4">
              {/* Product Image */}
              <Link to={`/product/${subscription.product?.slug}`} className="shrink-0">
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-muted">
                  <img
                    src={primaryImage?.url || '/placeholder.svg'}
                    alt={subscription.product?.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              </Link>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link 
                      to={`/product/${subscription.product?.slug}`}
                      className="font-semibold hover:text-accent transition-colors line-clamp-1"
                    >
                      {subscription.product?.title}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      by {subscription.vendor?.brand_name}
                    </p>
                  </div>
                  <Badge variant="outline" className={cn('shrink-0', status.color)}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {status.label}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
                  <span className="font-semibold text-accent">
                    {formatPrice((subscription.plan?.price || 0) * subscription.quantity)}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    <RefreshCw className="w-3 h-3 mr-1" />
                    {formatInterval(subscription.plan?.interval || 'monthly', subscription.plan?.interval_count)}
                  </Badge>
                  <span className="text-muted-foreground">
                    Qty: {subscription.quantity}
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 space-y-4">
            {/* Next Billing Info */}
            {!isCancelled && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    {isPaused ? (
                      <>Paused until {format(new Date(subscription.pause_until!), 'MMM d, yyyy')}</>
                    ) : (
                      <>Next delivery: {format(new Date(subscription.next_billing_date), 'MMM d, yyyy')}</>
                    )}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(subscription.next_billing_date), { addSuffix: true })}
                </span>
              </div>
            )}

            {/* Quick Actions */}
            {!isCancelled && (
              <div className="flex flex-wrap gap-2">
                {isActive && (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleSkip}
                      disabled={skipOrderMutation.isPending}
                    >
                      <SkipForward className="w-4 h-4 mr-1" />
                      Skip Next
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowPauseDialog(true)}
                    >
                      <Pause className="w-4 h-4 mr-1" />
                      Pause
                    </Button>
                  </>
                )}
                {isPaused && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleResume}
                    disabled={resumeMutation.isPending}
                  >
                    <Play className="w-4 h-4 mr-1" />
                    Resume
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="w-4 h-4 mr-1" />
                      Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4 mr-1" />
                      More
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Expanded Section */}
            {isExpanded && !isCancelled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 pt-4 border-t border-border"
              >
                {/* Quantity Adjustment */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Quantity</span>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleQuantityChange(-1)}
                      disabled={subscription.quantity <= 1 || updateQuantityMutation.isPending}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="w-8 text-center font-semibold">{subscription.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleQuantityChange(1)}
                      disabled={updateQuantityMutation.isPending}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-secondary/30 text-center">
                    <p className="text-2xl font-bold text-accent">{subscription.total_orders}</p>
                    <p className="text-xs text-muted-foreground">Total Orders</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/30 text-center">
                    <p className="text-2xl font-bold text-accent">{formatPrice(subscription.total_spent)}</p>
                    <p className="text-xs text-muted-foreground">Total Spent</p>
                  </div>
                </div>

                {/* Cancel Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setShowCancelDialog(true)}
                >
                  <X className="w-4 h-4 mr-1" />
                  Cancel Subscription
                </Button>
              </motion.div>
            )}

            {/* Cancelled Info */}
            {isCancelled && subscription.cancellation_reason && (
              <div className="p-3 rounded-lg bg-destructive/5 text-sm">
                <p className="font-medium text-destructive">Cancelled</p>
                <p className="text-muted-foreground mt-1">{subscription.cancellation_reason}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Pause Dialog */}
      <AlertDialog open={showPauseDialog} onOpenChange={setShowPauseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pause Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              Choose when you'd like to resume your subscription.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="w-4 h-4 mr-2" />
                  {pauseDate ? format(pauseDate, 'PPP') : 'Select resume date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarPicker
                  mode="single"
                  selected={pauseDate}
                  onSelect={setPauseDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handlePause}
              disabled={!pauseDate || pauseMutation.isPending}
            >
              Pause Subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              We're sorry to see you go. Please let us know why you're cancelling.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Reason for cancellation (optional)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={cancelMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancel Subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
