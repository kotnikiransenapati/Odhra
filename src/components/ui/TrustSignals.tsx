import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Star, Users, Award, Clock, RefreshCw, Truck, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

// Compact trust badges for product pages
export function ProductTrustBadges({ className }: { className?: string }) {
  const badges = [
    { icon: Shield, label: '100% Genuine' },
    { icon: RefreshCw, label: '7 Day Returns' },
    { icon: Truck, label: 'Fast Delivery' },
    { icon: CreditCard, label: 'Secure Pay' },
  ];

  return (
    <div className={cn('grid grid-cols-2 sm:grid-cols-4 gap-2', className)}>
      {badges.map((badge) => (
        <div
          key={badge.label}
          className="flex items-center gap-2 p-2.5 rounded-xl bg-secondary/50 border border-border/50"
        >
          <badge.icon className="w-4 h-4 text-accent shrink-0" />
          <span className="text-xs font-medium text-muted-foreground">{badge.label}</span>
        </div>
      ))}
    </div>
  );
}

// Social proof stats
interface SocialProofStatsProps {
  rating?: number;
  reviewCount?: number;
  soldCount?: number;
  className?: string;
}

export function SocialProofStats({ rating, reviewCount, soldCount, className }: SocialProofStatsProps) {
  return (
    <div className={cn('flex items-center gap-4 text-sm', className)}>
      {rating && reviewCount && (
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 fill-accent text-accent" />
          <span className="font-semibold">{rating.toFixed(1)}</span>
          <span className="text-muted-foreground">({reviewCount.toLocaleString()} reviews)</span>
        </div>
      )}
      {soldCount && soldCount > 100 && (
        <div className="flex items-center gap-1 text-muted-foreground">
          <Users className="w-4 h-4" />
          <span>{soldCount.toLocaleString()}+ sold</span>
        </div>
      )}
    </div>
  );
}

// Vendor trust badge
interface VendorTrustBadgeProps {
  isVerified?: boolean;
  rating?: number;
  responseTime?: string;
  className?: string;
}

export function VendorTrustBadge({ isVerified, rating, responseTime, className }: VendorTrustBadgeProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      {isVerified && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 text-success text-xs font-medium">
          <Award className="w-3.5 h-3.5" />
          Verified Seller
        </div>
      )}
      {rating && rating >= 4.5 && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/10 text-accent-foreground text-xs font-medium">
          <Star className="w-3.5 h-3.5 fill-current" />
          Top Rated
        </div>
      )}
      {responseTime && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-info/10 text-info text-xs font-medium">
          <Clock className="w-3.5 h-3.5" />
          {responseTime}
        </div>
      )}
    </div>
  );
}

// Guarantee badge
export function GuaranteeBadge({ className }: { className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative overflow-hidden rounded-xl border border-accent/30 bg-gradient-to-r from-accent/5 to-accent/10 p-4',
        className
      )}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
            backgroundSize: '20px 20px',
          }}
        />
      </div>

      <div className="relative flex items-center gap-4">
        <div className="shrink-0 w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
          <Shield className="w-6 h-6 text-accent" />
        </div>
        <div>
          <h4 className="font-semibold text-sm">Odhra Buyer Protection</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Full refund if item is not as described or doesn't arrive
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// Payment methods display
export function PaymentMethodsDisplay({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-4', className)}>
      <span className="text-xs text-muted-foreground">We accept:</span>
      <div className="flex items-center gap-2">
        {/* Payment icons using simple text badges */}
        {['UPI', 'Cards', 'COD', 'EMI'].map((method) => (
          <div
            key={method}
            className="px-2 py-1 rounded bg-muted text-[10px] font-medium text-muted-foreground"
          >
            {method}
          </div>
        ))}
      </div>
    </div>
  );
}
