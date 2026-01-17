import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  Tag, 
  Truck, 
  Gift, 
  Wallet, 
  HeadphonesIcon,
  ShoppingBag,
  Percent
} from 'lucide-react';

const services = [
  { 
    icon: Sparkles, 
    label: 'Spin & Win', 
    href: '/spin-to-win', 
    color: 'bg-gradient-to-br from-purple-500 to-pink-500',
    iconColor: 'text-white'
  },
  { 
    icon: Tag, 
    label: 'Deals', 
    href: '/shop?filter=deals', 
    color: 'bg-gradient-to-br from-orange-500 to-red-500',
    iconColor: 'text-white'
  },
  { 
    icon: Truck, 
    label: 'Track Order', 
    href: '/orders', 
    color: 'bg-gradient-to-br from-blue-500 to-cyan-500',
    iconColor: 'text-white'
  },
  { 
    icon: Gift, 
    label: 'Rewards', 
    href: '/wallet', 
    color: 'bg-gradient-to-br from-green-500 to-emerald-500',
    iconColor: 'text-white'
  },
  { 
    icon: Wallet, 
    label: 'Wallet', 
    href: '/wallet', 
    color: 'bg-gradient-to-br from-amber-500 to-yellow-500',
    iconColor: 'text-white'
  },
  { 
    icon: HeadphonesIcon, 
    label: 'Support', 
    href: '/support', 
    color: 'bg-gradient-to-br from-teal-500 to-green-500',
    iconColor: 'text-white'
  },
  { 
    icon: ShoppingBag, 
    label: 'New Arrivals', 
    href: '/shop?filter=new', 
    color: 'bg-gradient-to-br from-indigo-500 to-purple-500',
    iconColor: 'text-white'
  },
  { 
    icon: Percent, 
    label: 'Coupons', 
    href: '/wallet', 
    color: 'bg-gradient-to-br from-rose-500 to-pink-500',
    iconColor: 'text-white'
  },
];

export function QuickServices() {
  return (
    <section className="py-3 bg-background">
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-4 px-4 min-w-max">
          {services.map((service, index) => (
            <motion.div
              key={service.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                to={service.href}
                className="flex flex-col items-center gap-2 min-w-[64px]"
              >
                <div className={`w-12 h-12 rounded-xl ${service.color} flex items-center justify-center shadow-md hover:shadow-lg transition-shadow`}>
                  <service.icon className={`w-5 h-5 ${service.iconColor}`} />
                </div>
                <span className="text-xs font-medium text-foreground/80 text-center whitespace-nowrap">
                  {service.label}
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
