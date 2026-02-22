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
  gradient: string;
}

const services: Service[] = [
  { icon: Sparkles, label: 'Spin & Win', href: '/spin-to-win', gradient: 'from-accent/20 to-accent/5' },
  { icon: Tag, label: 'Deals', href: '/shop?filter=deals', gradient: 'from-destructive/20 to-destructive/5' },
  { icon: Truck, label: 'Track Order', href: '/orders', gradient: 'from-success/20 to-success/5' },
  { icon: Gift, label: 'Rewards', href: '/wallet', gradient: 'from-accent/20 to-accent/5' },
  { icon: Wallet, label: 'Wallet', href: '/wallet', gradient: 'from-info/20 to-info/5' },
  { icon: HeadphonesIcon, label: 'Support', href: '/support', gradient: 'from-primary/20 to-primary/5' },
  { icon: ShoppingBag, label: 'New Arrivals', href: '/shop?filter=new', gradient: 'from-success/20 to-success/5' },
  { icon: Percent, label: 'Coupons', href: '/wallet', gradient: 'from-warning/20 to-warning/5' },
];

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.04 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const } }
};

export function QuickServices() {
  return (
    <section className="py-3 bg-background">
      <div className="overflow-x-auto scrollbar-hide">
        <motion.div 
          className="flex gap-4 px-4 min-w-max"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {services.map((service) => (
            <motion.div key={service.label} variants={itemVariants}>
              <Link
                to={service.href}
                className="group flex flex-col items-center gap-2 min-w-[64px]"
              >
                <motion.div 
                  whileHover={{ scale: 1.08, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br ${service.gradient} border border-border/30 flex items-center justify-center transition-all duration-300 group-hover:border-accent/30 group-hover:shadow-md overflow-hidden`}
                >
                  <service.icon className="w-5.5 h-5.5 text-foreground group-hover:text-accent relative z-10 transition-colors duration-200" strokeWidth={1.8} />
                </motion.div>
                <span className="text-[11px] font-semibold text-foreground/80 text-center whitespace-nowrap group-hover:text-accent transition-colors duration-200">
                  {service.label}
                </span>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
