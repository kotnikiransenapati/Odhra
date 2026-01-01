import React from 'react';
import { motion } from 'framer-motion';
import { Quote, Star, Play, Heart, MessageCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface Story {
  id: string;
  name: string;
  avatar: string;
  location: string;
  rating: number;
  story: string;
  productName: string;
  productImage: string;
  isVideo?: boolean;
  likes: number;
}

const stories: Story[] = [
  {
    id: '1',
    name: 'Priya Sharma',
    avatar: '',
    location: 'Mumbai',
    rating: 5,
    story: 'Found the most amazing handcrafted jewelry on Odhra! The quality exceeded my expectations and the vendor was so responsive.',
    productName: 'Silver Kundan Necklace',
    productImage: '',
    likes: 234,
  },
  {
    id: '2',
    name: 'Rahul Mehta',
    avatar: '',
    location: 'Bangalore',
    rating: 5,
    story: 'The Spin & Win feature is so fun! Got 20% off on my first order. Will definitely recommend to friends.',
    productName: 'Wireless Earbuds Pro',
    productImage: '',
    isVideo: true,
    likes: 456,
  },
  {
    id: '3',
    name: 'Ananya Gupta',
    avatar: '',
    location: 'Delhi',
    rating: 5,
    story: 'Love supporting small Indian businesses through Odhra. Every product has a story and the artisans are so talented!',
    productName: 'Hand-painted Saree',
    productImage: '',
    likes: 189,
  },
  {
    id: '4',
    name: 'Vikram Singh',
    avatar: '',
    location: 'Jaipur',
    rating: 5,
    story: 'Fast delivery and excellent packaging. The product looked even better than the photos. Highly recommended!',
    productName: 'Leather Messenger Bag',
    productImage: '',
    likes: 312,
  },
  {
    id: '5',
    name: 'Meera Patel',
    avatar: '',
    location: 'Ahmedabad',
    rating: 5,
    story: 'Became a vendor on Odhra and tripled my business in 3 months! The platform is so seller-friendly.',
    productName: 'Vendor Success Story',
    productImage: '',
    isVideo: true,
    likes: 567,
  },
  {
    id: '6',
    name: 'Arjun Nair',
    avatar: '',
    location: 'Chennai',
    rating: 5,
    story: 'The customer service team helped me with a return seamlessly. Rare to find such support these days!',
    productName: 'Smart Watch Elite',
    productImage: '',
    likes: 145,
  },
];

export function CustomerStories() {
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

        {/* Stories Grid - Masonry-like layout */}
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
                      <AvatarImage src={story.avatar} />
                      <AvatarFallback className="bg-accent/10 text-accent font-semibold">
                        {story.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{story.name}</p>
                      <p className="text-sm text-muted-foreground">{story.location}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {[...Array(story.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                  </div>

                  {/* Quote */}
                  <div className="relative mb-4">
                    <Quote className="absolute -top-2 -left-1 w-6 h-6 text-accent/20" />
                    <p className="text-muted-foreground pl-5 leading-relaxed">{story.story}</p>
                  </div>

                  {/* Product */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-accent/20 to-primary/10 flex items-center justify-center overflow-hidden">
                      {story.isVideo ? (
                        <div className="relative w-full h-full flex items-center justify-center">
                          <Play className="w-5 h-5 text-accent" />
                        </div>
                      ) : story.productImage ? (
                        <img src={story.productImage} alt={story.productName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-accent/30 to-primary/20" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{story.productName}</p>
                      {story.isVideo && (
                        <Badge variant="outline" className="text-xs mt-1">Video Story</Badge>
                      )}
                    </div>
                  </div>

                  {/* Engagement */}
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
                    <button className="flex items-center gap-1.5 text-muted-foreground hover:text-accent transition-colors">
                      <Heart className="w-4 h-4" />
                      <span className="text-sm">{story.likes}</span>
                    </button>
                    <button className="flex items-center gap-1.5 text-muted-foreground hover:text-accent transition-colors">
                      <MessageCircle className="w-4 h-4" />
                      <span className="text-sm">Reply</span>
                    </button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
