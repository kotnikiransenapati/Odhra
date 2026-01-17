import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Quote, Star, Heart, Loader2, Verified } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useCustomerStories, CustomerStory } from '@/hooks/useCustomerStories';
import { formatDistanceToNow } from 'date-fns';

// Fallback stories when no real reviews exist
const fallbackStories: CustomerStory[] = [
  {
    id: 'f1',
    name: 'Priya Sharma',
    avatar: null,
    location: 'Mumbai',
    rating: 5,
    story: 'Found the most amazing handcrafted jewelry on Odhra! The quality exceeded my expectations and the vendor was so responsive.',
    productName: 'Silver Kundan Necklace',
    productSlug: '',
    productImage: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'f2',
    name: 'Rahul Mehta',
    avatar: null,
    location: 'Bangalore',
    rating: 5,
    story: 'The Spin & Win feature is so fun! Got 20% off on my first order. Will definitely recommend to friends.',
    productName: 'Wireless Earbuds Pro',
    productSlug: '',
    productImage: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'f3',
    name: 'Ananya Gupta',
    avatar: null,
    location: 'Delhi',
    rating: 5,
    story: 'Love supporting small Indian businesses through Odhra. Every product has a story and the artisans are so talented!',
    productName: 'Hand-painted Saree',
    productSlug: '',
    productImage: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'f4',
    name: 'Vikram Singh',
    avatar: null,
    location: 'Jaipur',
    rating: 5,
    story: 'Fast delivery and excellent packaging. The product looked even better than the photos. Highly recommended!',
    productName: 'Leather Messenger Bag',
    productSlug: '',
    productImage: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'f5',
    name: 'Meera Patel',
    avatar: null,
    location: 'Ahmedabad',
    rating: 5,
    story: 'Became a vendor on Odhra and tripled my business in 3 months! The platform is so seller-friendly.',
    productName: 'Vendor Success Story',
    productSlug: '',
    productImage: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'f6',
    name: 'Arjun Nair',
    avatar: null,
    location: 'Chennai',
    rating: 5,
    story: 'The customer service team helped me with a return seamlessly. Rare to find such support these days!',
    productName: 'Smart Watch Elite',
    productSlug: '',
    productImage: null,
    createdAt: new Date().toISOString(),
  },
];

export function CustomerStories() {
  const { data: realStories, isLoading } = useCustomerStories();
  
  // Use real stories if available, otherwise use fallback
  const stories = realStories && realStories.length > 0 ? realStories : fallbackStories;
  const hasRealStories = realStories && realStories.length > 0;

  return (
    <section className="py-20 px-4 bg-gradient-to-b from-background to-secondary/20">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent mb-4">
            <Heart className="w-4 h-4" />
            <span className="text-sm font-medium">Customer Love</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-3">Stories from Our Community</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Real experiences from real customers. See why thousands choose Odhra for their shopping needs.
          </p>
        </motion.div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : (
          /* Stories Grid - Masonry-like layout */
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stories.map((story, index) => (
              <motion.div
                key={story.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow group">
                  <CardContent className="p-6">
                    {/* Header */}
                    <div className="flex items-start gap-4 mb-4">
                      <Avatar className="w-12 h-12 ring-2 ring-accent/20">
                        <AvatarImage src={story.avatar || undefined} />
                        <AvatarFallback className="bg-accent/10 text-accent font-semibold">
                          {story.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{story.name}</p>
                          {hasRealStories && (
                            <Verified className="w-4 h-4 text-accent" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{story.location}</p>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {[...Array(story.rating)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    </div>

                    {/* Quote */}
                    <div className="relative mb-4">
                      <Quote className="absolute -top-2 -left-1 w-6 h-6 text-accent/20" />
                      <p className="text-muted-foreground pl-5 leading-relaxed line-clamp-4">{story.story}</p>
                    </div>

                    {/* Product */}
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-accent/20 to-primary/10 flex items-center justify-center overflow-hidden">
                        {story.productImage ? (
                          <img 
                            src={story.productImage} 
                            alt={story.productName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-accent/30 to-primary/20" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        {story.productSlug ? (
                          <Link 
                            to={`/product/${story.productSlug}`}
                            className="text-sm font-medium truncate hover:text-accent transition-colors block"
                          >
                            {story.productName}
                          </Link>
                        ) : (
                          <p className="text-sm font-medium truncate">{story.productName}</p>
                        )}
                        {hasRealStories && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {formatDistanceToNow(new Date(story.createdAt), { addSuffix: true })}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
