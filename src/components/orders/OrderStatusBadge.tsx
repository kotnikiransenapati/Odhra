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
    className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  },
  confirmed: {
    label: 'Confirmed',
    variant: 'secondary',
    icon: CheckCircle,
    className: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  },
  processing: {
    label: 'Processing',
    variant: 'secondary',
    icon: Package,
    className: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  },
  shipped: {
    label: 'Shipped',
    variant: 'secondary',
    icon: Truck,
    className: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  },
  delivered: {
    label: 'Delivered',
    variant: 'secondary',
    icon: MapPin,
    className: 'bg-green-500/10 text-green-600 border-green-500/20',
  },
  cancelled: {
    label: 'Cancelled',
    variant: 'destructive',
    icon: XCircle,
    className: 'bg-red-500/10 text-red-600 border-red-500/20',
  },
  refunded: {
    label: 'Refunded',
    variant: 'secondary',
    icon: RotateCcw,
    className: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
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
