import React from 'react';
import { motion } from 'framer-motion';
import { Truck, Star, Package, Clock, ThumbsUp, MapPin, ShieldCheck } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';
import { useDeliveryReviews } from '@/hooks/useDeliveryReviews';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const day = 24 * 60 * 60 * 1000;
  if (diff < day) return 'Today';
  const d = Math.floor(diff / day);
  if (d === 1) return 'Yesterday';
  if (d < 7) return `${d} days ago`;
  if (d < 30) return `${Math.floor(d / 7)} weeks ago`;
  if (d < 365) return `${Math.floor(d / 30)} months ago`;
  return `${Math.floor(d / 365)} years ago`;
}

const deliveryStats = {
  onTimeDelivery: 96,
  averageRating: 4.8,
  fastDeliveries: 85,
  happyCustomers: '50K+',
};

export function DeliveryReviews() {
  const { isEnabled } = useFeatureFlag('delivery_reviews');
  const { data: reviews, isLoading } = useDeliveryReviews(6);

  if (!isEnabled) return null;
  // Hide section entirely when there are no real verified reviews yet — never show mock.
  if (!isLoading && (!reviews || reviews.length === 0)) return null;

  return (
    <section className="py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 text-success mb-4">
            <Truck className="w-4 h-4" />
            <span className="text-sm font-medium">Real Customer Stories</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">From our community</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Verified buyers. Real names, real states, real products.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <Stat icon={<Clock className="w-5 h-5 text-success" />} value={`${deliveryStats.onTimeDelivery}%`} label="On-Time Delivery" tone="success" />
          <Stat icon={<Star className="w-5 h-5 text-warning fill-warning" />} value={deliveryStats.averageRating} label="Average Rating" tone="warning" />
          <Stat icon={<Package className="w-5 h-5 text-info" />} value={`${deliveryStats.fastDeliveries}%`} label="Early Arrivals" tone="info" />
          <Stat icon={<ThumbsUp className="w-5 h-5 text-accent" />} value={deliveryStats.happyCustomers} label="Happy Customers" tone="accent" />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-2xl" />
              ))
            : reviews!.map((review, index) => (
                <motion.article
                  key={review.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="p-6 rounded-2xl border border-border bg-card hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="bg-accent/10 text-accent font-semibold">
                        {review.firstName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <p className="font-semibold truncate">{review.firstName}</p>
                        <div className="flex items-center gap-1 shrink-0">
                          {Array.from({ length: review.rating }).map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-warning text-warning" />
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3 flex-wrap">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {review.state}
                        </span>
                        <span>•</span>
                        <span>{timeAgo(review.createdAt)}</span>
                        <Badge variant="outline" className="gap-1 text-[10px] py-0">
                          <ShieldCheck className="w-3 h-3 text-success" /> Verified buyer
                        </Badge>
                      </div>

                      <p className="text-foreground/90 mb-3 line-clamp-4">{review.comment}</p>

                      <div className="text-xs text-muted-foreground">
                        Purchased: <span className="font-medium text-foreground">{review.productName}</span>
                      </div>
                    </div>
                  </div>
                </motion.article>
              ))}
        </div>
      </div>
    </section>
  );
}

function Stat({ icon, value, label, tone }: { icon: React.ReactNode; value: React.ReactNode; label: string; tone: 'success' | 'warning' | 'info' | 'accent' }) {
  const toneClass = {
    success: 'bg-success/5 border-success/20 text-success',
    warning: 'bg-warning/5 border-warning/20 text-warning',
    info: 'bg-info/5 border-info/20 text-info',
    accent: 'bg-accent/5 border-accent/20 text-accent',
  }[tone];
  return (
    <div className={`text-center p-6 rounded-2xl border ${toneClass}`}>
      <div className="flex items-center justify-center gap-2 mb-2">
        {icon}
        <span className="text-3xl font-bold">{value}</span>
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
