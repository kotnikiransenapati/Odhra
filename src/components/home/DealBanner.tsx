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
      className={`block rounded-3xl ${bgColor} overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 group relative`}
    >
      <div className="flex items-center justify-between p-7 md:p-8 min-h-[160px] relative">
        <div className={`${textColor} flex-1 relative z-10`}>
          <p className="text-[10px] font-semibold opacity-70 uppercase tracking-[0.18em]">{subtitle}</p>
          <p className="text-3xl md:text-4xl font-display font-normal leading-tight mt-2 tracking-tight">{discount}</p>
          <p className="text-xs opacity-75 mt-2 font-medium">{title}</p>
          <span className={`inline-flex items-center gap-1.5 mt-4 text-[11px] font-semibold uppercase tracking-widest opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-300`}>
            Shop now <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
        {imageUrl && (
          <div className="w-28 h-28 flex-shrink-0 transition-transform duration-500 group-hover:scale-105 group-hover:rotate-2">
            <img src={imageUrl} alt={title} className="w-full h-full object-contain" />
          </div>
        )}
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
