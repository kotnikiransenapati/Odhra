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
  textColor = 'text-white',
  imageUrl,
  link 
}: DealBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <Link 
        to={link}
        className={`block rounded-2xl ${bgColor} overflow-hidden shadow-md hover:shadow-lg transition-shadow`}
      >
        <div className="flex items-center justify-between p-4 min-h-[120px]">
          <div className={`${textColor} flex-1`}>
            <p className="text-sm font-medium opacity-90">{subtitle}</p>
            <p className="text-2xl font-bold">{discount}</p>
            <p className="text-xs opacity-80 mt-1">{title}</p>
          </div>
          {imageUrl && (
            <div className="w-24 h-24 flex-shrink-0">
              <img 
                src={imageUrl} 
                alt={title}
                className="w-full h-full object-contain"
              />
            </div>
          )}
          <ArrowRight className={`w-5 h-5 ${textColor} opacity-60 flex-shrink-0`} />
        </div>
      </Link>
    </motion.div>
  );
}

export function DealBannerSection() {
  const deals = [
    {
      title: 'Electronics Sale',
      subtitle: 'Limited Time Offer',
      discount: 'Min. 40% Off',
      bgColor: 'bg-gradient-to-r from-blue-500 to-blue-600',
      link: '/shop?category=electronics',
    },
    {
      title: 'Fashion Week',
      subtitle: 'Trending Styles',
      discount: 'Min. 50% Off',
      bgColor: 'bg-gradient-to-r from-rose-400 to-pink-500',
      link: '/shop?category=fashion',
    },
    {
      title: 'Home Essentials',
      subtitle: 'Upgrade Your Space',
      discount: 'Up to 60% Off',
      bgColor: 'bg-gradient-to-r from-amber-400 to-orange-500',
      link: '/shop?category=home-living',
    },
  ];

  return (
    <section className="py-4 px-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl mx-auto">
        {deals.map((deal, index) => (
          <DealBanner key={index} {...deal} />
        ))}
      </div>
    </section>
  );
}
