import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  CheckCircle,
  Package,
  Truck,
  MapPin,
  XCircle,
  RotateCcw,
} from 'lucide-react';

type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

interface OrderStatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

const statusConfig: Record<
  OrderStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType; className: string }
> = {
  pending: {
    label: 'Pending',
    variant: 'secondary',
    icon: Clock,
    className: 'bg-warning/10 text-warning border-warning/20',
  },
  confirmed: {
    label: 'Confirmed',
    variant: 'secondary',
    icon: CheckCircle,
    className: 'bg-info/10 text-info border-info/20',
  },
  processing: {
    label: 'Processing',
    variant: 'secondary',
    icon: Package,
    className: 'bg-primary/10 text-primary border-primary/20',
  },
  shipped: {
    label: 'Shipped',
    variant: 'secondary',
    icon: Truck,
    className: 'bg-accent/10 text-accent-foreground border-accent/20',
  },
  delivered: {
    label: 'Delivered',
    variant: 'secondary',
    icon: MapPin,
    className: 'bg-success/10 text-success border-success/20',
  },
  cancelled: {
    label: 'Cancelled',
    variant: 'destructive',
    icon: XCircle,
    className: 'bg-destructive/10 text-destructive border-destructive/20',
  },
  refunded: {
    label: 'Refunded',
    variant: 'secondary',
    icon: RotateCcw,
    className: 'bg-muted text-muted-foreground border-border',
  },
};

export function OrderStatusBadge({ status, size = 'md' }: OrderStatusBadgeProps) {
  const config = statusConfig[status as OrderStatus] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={`${config.className} ${size === 'sm' ? 'text-xs px-2 py-0.5' : 'px-3 py-1'}`}
    >
      <Icon className={`${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} mr-1`} />
      {config.label}
    </Badge>
  );
}
