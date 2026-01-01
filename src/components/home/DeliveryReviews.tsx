import React from 'react';
import { motion } from 'framer-motion';
import { Truck, Star, Package, Clock, CheckCircle2, ThumbsUp, MapPin } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface DeliveryReview {
  id: string;
  customerName: string;
  customerAvatar: string;
  city: string;
  rating: number;
  deliveryDays: number;
  expectedDays: number;
  comment: string;
  productName: string;
  carrier: string;
  date: string;
}

const reviews: DeliveryReview[] = [
  {
    id: '1',
    customerName: 'Neha Kapoor',
    customerAvatar: '',
    city: 'Pune',
    rating: 5,
    deliveryDays: 2,
    expectedDays: 4,
    comment: 'Received 2 days early! Package was in perfect condition.',
    productName: 'Designer Kurta Set',
    carrier: 'Express Delivery',
    date: '2 days ago',
  },
  {
    id: '2',
    customerName: 'Aditya Kumar',
    customerAvatar: '',
    city: 'Hyderabad',
    rating: 5,
    deliveryDays: 3,
    expectedDays: 5,
    comment: 'Great packaging, product arrived safely. Very impressed!',
    productName: 'Electronics Kit',
    carrier: 'Standard Shipping',
    date: '1 week ago',
  },
  {
    id: '3',
    customerName: 'Sneha Reddy',
    customerAvatar: '',
    city: 'Kolkata',
    rating: 4,
    deliveryDays: 4,
    expectedDays: 5,
    comment: 'On-time delivery with tracking updates at every step.',
    productName: 'Home Decor Items',
    carrier: 'Priority Delivery',
    date: '3 days ago',
  },
  {
    id: '4',
    customerName: 'Karthik Iyer',
    customerAvatar: '',
    city: 'Lucknow',
    rating: 5,
    deliveryDays: 1,
    expectedDays: 3,
    comment: 'Same day delivery option is amazing! Will order again.',
    productName: 'Gift Hamper',
    carrier: 'Same Day Express',
    date: '5 days ago',
  },
];

const deliveryStats = {
  onTimeDelivery: 96,
  averageRating: 4.8,
  fastDeliveries: 85,
  happyCustomers: '50K+',
};

export function DeliveryReviews() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 text-green-600 mb-4">
            <Truck className="w-4 h-4" />
            <span className="text-sm font-medium">Delivery Excellence</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-3">Lightning-Fast Delivery</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            We partner with India's best logistics providers to ensure your orders arrive safely and on time.
          </p>
        </motion.div>

        {/* Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12"
        >
          <div className="text-center p-6 rounded-2xl bg-green-500/5 border border-green-500/20">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-green-600" />
              <span className="text-3xl font-bold text-green-600">{deliveryStats.onTimeDelivery}%</span>
            </div>
            <p className="text-sm text-muted-foreground">On-Time Delivery</p>
          </div>
          <div className="text-center p-6 rounded-2xl bg-amber-500/5 border border-amber-500/20">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              <span className="text-3xl font-bold text-amber-600">{deliveryStats.averageRating}</span>
            </div>
            <p className="text-sm text-muted-foreground">Average Rating</p>
          </div>
          <div className="text-center p-6 rounded-2xl bg-blue-500/5 border border-blue-500/20">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Package className="w-5 h-5 text-blue-600" />
              <span className="text-3xl font-bold text-blue-600">{deliveryStats.fastDeliveries}%</span>
            </div>
            <p className="text-sm text-muted-foreground">Early Arrivals</p>
          </div>
          <div className="text-center p-6 rounded-2xl bg-accent/5 border border-accent/20">
            <div className="flex items-center justify-center gap-2 mb-2">
              <ThumbsUp className="w-5 h-5 text-accent" />
              <span className="text-3xl font-bold text-accent">{deliveryStats.happyCustomers}</span>
            </div>
            <p className="text-sm text-muted-foreground">Happy Customers</p>
          </div>
        </motion.div>

        {/* Reviews Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {reviews.map((review, index) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="p-6 rounded-2xl border border-border bg-card hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start gap-4">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={review.customerAvatar} />
                  <AvatarFallback className="bg-accent/10 text-accent font-semibold">
                    {review.customerName.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold">{review.customerName}</p>
                    <div className="flex items-center gap-1">
                      {[...Array(review.rating)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <MapPin className="w-3.5 h-3.5" />
                    {review.city}
                    <span>•</span>
                    <span>{review.date}</span>
                  </div>
                  
                  <p className="text-muted-foreground mb-4">{review.comment}</p>
                  
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Delivery Speed</span>
                        <span className="font-medium text-green-600">
                          {review.deliveryDays < review.expectedDays ? (
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" />
                              {review.expectedDays - review.deliveryDays} days early
                            </span>
                          ) : 'On time'}
                        </span>
                      </div>
                      <Progress 
                        value={(1 - (review.deliveryDays / review.expectedDays)) * 100 + 50} 
                        className="h-2"
                      />
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {review.carrier}
                    </Badge>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
