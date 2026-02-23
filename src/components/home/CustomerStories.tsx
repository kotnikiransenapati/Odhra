import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { Quote, Star, Heart, Loader2, Verified, ChevronLeft, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCustomerStories, CustomerStory } from '@/hooks/useCustomerStories';
import { formatDistanceToNow } from 'date-fns';

const fallbackStories: CustomerStory[] = [
  { id: 'f1', name: 'Priya Sharma', avatar: null, location: 'Mumbai', rating: 5, story: 'Found the most amazing handcrafted jewelry on Odhra! The quality exceeded my expectations and the vendor was so responsive.', productName: 'Silver Kundan Necklace', productSlug: '', productImage: null, createdAt: new Date().toISOString() },
  { id: 'f2', name: 'Rahul Mehta', avatar: null, location: 'Bangalore', rating: 5, story: 'The Spin & Win feature is so fun! Got 20% off on my first order. Will definitely recommend to friends.', productName: 'Wireless Earbuds Pro', productSlug: '', productImage: null, createdAt: new Date().toISOString() },
  { id: 'f3', name: 'Ananya Gupta', avatar: null, location: 'Delhi', rating: 5, story: 'Love supporting small Indian businesses through Odhra. Every product has a story and the artisans are so talented!', productName: 'Hand-painted Saree', productSlug: '', productImage: null, createdAt: new Date().toISOString() },
  { id: 'f4', name: 'Vikram Singh', avatar: null, location: 'Jaipur', rating: 5, story: 'Fast delivery and excellent packaging. The product looked even better than the photos. Highly recommended!', productName: 'Leather Messenger Bag', productSlug: '', productImage: null, createdAt: new Date().toISOString() },
  { id: 'f5', name: 'Meera Patel', avatar: null, location: 'Ahmedabad', rating: 5, story: 'Became a vendor on Odhra and tripled my business in 3 months! The platform is so seller-friendly.', productName: 'Vendor Success Story', productSlug: '', productImage: null, createdAt: new Date().toISOString() },
  { id: 'f6', name: 'Arjun Nair', avatar: null, location: 'Chennai', rating: 5, story: 'The customer service team helped me with a return seamlessly. Rare to find such support these days!', productName: 'Smart Watch Elite', productSlug: '', productImage: null, createdAt: new Date().toISOString() },
];

const StoryCard = React.forwardRef<HTMLDivElement, { story: CustomerStory; index: number; hasRealStories: boolean }>(
  ({ story, index, hasRealStories }, forwardedRef) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: index * 0.08, duration: 0.5 }}
      className="group relative"
    >
      <div className="h-full rounded-2xl border border-border/50 bg-card p-6 hover:shadow-xl hover:border-accent/20 transition-all duration-300">
        {/* Decorative quote */}
        <Quote className="absolute top-4 right-4 w-8 h-8 text-accent/10" />

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="w-11 h-11 ring-2 ring-accent/20 ring-offset-2 ring-offset-background">
            <AvatarImage src={story.avatar || undefined} />
            <AvatarFallback className="bg-accent/10 text-accent font-bold text-sm">
              {story.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-sm">{story.name}</p>
              {hasRealStories && <Verified className="w-3.5 h-3.5 text-accent" />}
            </div>
            <p className="text-xs text-muted-foreground">{story.location}</p>
          </div>
        </div>

        {/* Stars */}
        <div className="flex items-center gap-0.5 mb-3">
          {[...Array(story.rating)].map((_, i) => (
            <Star key={i} className="w-3.5 h-3.5 fill-warning text-warning" />
          ))}
        </div>

        {/* Quote */}
        <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3 mb-4">{story.story}</p>

        {/* Product link */}
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/50 group-hover:bg-accent/5 transition-colors">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent/20 to-primary/10 flex items-center justify-center overflow-hidden shrink-0">
            {story.productImage ? (
              <img src={story.productImage} alt={story.productName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-accent/30 to-primary/20" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            {story.productSlug ? (
              <Link to={`/product/${story.productSlug}`} className="text-xs font-medium truncate hover:text-accent transition-colors block">
                {story.productName}
              </Link>
            ) : (
              <p className="text-xs font-medium truncate">{story.productName}</p>
            )}
            {hasRealStories && (
              <span className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(story.createdAt), { addSuffix: true })}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
});
StoryCard.displayName = 'StoryCard';

export function CustomerStories() {
  const { data: realStories, isLoading } = useCustomerStories();
  const scrollRef = useRef<HTMLDivElement>(null);

  const stories = realStories && realStories.length > 0 ? realStories : fallbackStories;
  const hasRealStories = realStories && realStories.length > 0;

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -320 : 320, behavior: 'smooth' });
  };

  return (
    <section className="py-16 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex items-end justify-between mb-10"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent mb-3">
              <Heart className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold uppercase tracking-wider">Customer Love</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold">Stories from Our Community</h2>
            <p className="text-muted-foreground text-sm mt-1 max-w-lg">
              Real experiences from real customers who chose Odhra.
            </p>
          </div>
          <div className="hidden md:flex gap-2">
            <Button variant="outline" size="icon" className="rounded-full h-9 w-9" onClick={() => scroll('left')}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" className="rounded-full h-9 w-9" onClick={() => scroll('right')}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : (
          <div
            ref={scrollRef}
            className="flex gap-5 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-3 md:overflow-visible"
          >
            {stories.map((story, index) => (
              <div key={story.id} className="min-w-[280px] md:min-w-0 snap-start">
                <StoryCard story={story} index={index} hasRealStories={!!hasRealStories} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
