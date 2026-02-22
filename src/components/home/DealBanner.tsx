import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

interface DealBannerProps {
  title: string;
  subtitle: string;
  discount: string;
  bgColor: string;
  textColor?: string;
  imageUrl?: string;
  link: string;
}

export function DealBanner({ 
  title, 
  subtitle, 
  discount, 
  bgColor, 
  textColor = 'text-primary-foreground',
  imageUrl,
  link 
}: DealBannerProps) {
  return (
    <Link 
      to={link}
      className={`block rounded-2xl ${bgColor} overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group`}
    >
      <div className="flex items-center justify-between p-5 min-h-[120px]">
        <div className={`${textColor} flex-1`}>
          <p className="text-xs font-medium opacity-80 uppercase tracking-wider">{subtitle}</p>
          <p className="text-2xl md:text-3xl font-display font-bold mt-1">{discount}</p>
          <p className="text-xs opacity-70 mt-1.5">{title}</p>
        </div>
        {imageUrl && (
          <div className="w-24 h-24 flex-shrink-0">
            <img src={imageUrl} alt={title} className="w-full h-full object-contain" />
          </div>
        )}
        <div className={`${textColor} opacity-0 group-hover:opacity-60 transition-opacity flex-shrink-0`}>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  );
}

export function DealBannerSection() {
  const deals = [
    {
      title: 'Electronics Sale',
      subtitle: 'Limited Time',
      discount: 'Min. 40% Off',
      bgColor: 'bg-gradient-to-br from-primary to-primary/80',
      textColor: 'text-primary-foreground',
      link: '/shop?category=electronics',
    },
    {
      title: 'Fashion Week',
      subtitle: 'Trending Styles',
      discount: 'Min. 50% Off',
      bgColor: 'bg-gradient-to-br from-destructive/90 to-destructive/70',
      textColor: 'text-destructive-foreground',
      link: '/shop?category=fashion',
    },
    {
      title: 'Home Essentials',
      subtitle: 'Upgrade Your Space',
      discount: 'Up to 60% Off',
      bgColor: 'bg-gradient-to-br from-accent to-accent/80',
      textColor: 'text-accent-foreground',
      link: '/shop?category=home-living',
    },
  ];

  return (
    <section className="py-4 px-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-7xl mx-auto">
        {deals.map((deal, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <DealBanner {...deal} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
