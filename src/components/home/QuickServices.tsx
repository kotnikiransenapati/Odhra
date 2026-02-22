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
  Percent,
  type LucideIcon
} from 'lucide-react';

interface Service {
  icon: LucideIcon;
  label: string;
  href: string;
}

const services: Service[] = [
  { icon: Sparkles, label: 'Spin & Win', href: '/spin-to-win' },
  { icon: Tag, label: 'Deals', href: '/shop?filter=deals' },
  { icon: Truck, label: 'Track Order', href: '/orders' },
  { icon: Gift, label: 'Rewards', href: '/wallet' },
  { icon: Wallet, label: 'Wallet', href: '/wallet' },
  { icon: HeadphonesIcon, label: 'Support', href: '/support' },
  { icon: ShoppingBag, label: 'New Arrivals', href: '/shop?filter=new' },
  { icon: Percent, label: 'Coupons', href: '/wallet' },
];

export function QuickServices() {
  return (
    <section className="py-4 bg-background">
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-5 px-4 min-w-max">
          {services.map((service, index) => (
            <motion.div
              key={service.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                to={service.href}
                className="group flex flex-col items-center gap-2.5 min-w-[68px]"
              >
                {/* Navy icon container with gold hover glow */}
                <motion.div 
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-md transition-shadow duration-300 group-hover:shadow-[0_8px_24px_hsl(222_60%_18%/0.3)] overflow-hidden"
                >
                  {/* Subtle shimmer line on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-primary-foreground/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  </div>
                  {/* Gold accent line at top */}
                  <div className="absolute top-0 left-2 right-2 h-[2px] bg-gradient-to-r from-transparent via-accent/60 to-transparent rounded-full" />
                  <service.icon className="w-5.5 h-5.5 text-primary-foreground relative z-10" strokeWidth={1.8} />
                </motion.div>
                <span className="text-[11px] font-semibold text-foreground/75 text-center whitespace-nowrap group-hover:text-foreground transition-colors">
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
