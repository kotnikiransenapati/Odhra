import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Truck, RotateCcw, CreditCard, Headphones, Award, type LucideIcon } from 'lucide-react';

interface Badge {
  icon: LucideIcon;
  title: string;
  description: string;
}

const badges: Badge[] = [
  { icon: Shield, title: 'Secure Payments', description: '256-bit SSL encryption' },
  { icon: Truck, title: 'Express Delivery', description: 'Free on orders ₹999+' },
  { icon: RotateCcw, title: 'Easy Returns', description: '7-day hassle-free' },
  { icon: CreditCard, title: 'Pay Your Way', description: 'UPI, Cards, COD' },
  { icon: Headphones, title: '24/7 Support', description: 'Always here to help' },
  { icon: Award, title: 'Quality Assured', description: 'Verified vendors only' },
];

export function TrustBadges() {
  return (
    <section className="py-10 px-4 bg-primary/[0.03] border-y border-border/40">
      <div className="max-w-7xl mx-auto">
        <div className="flex md:grid md:grid-cols-6 gap-4 md:gap-6 overflow-x-auto scrollbar-hide pb-2 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0">
          {badges.map((badge, index) => (
            <motion.div
              key={badge.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.06, duration: 0.4 }}
              className="flex-shrink-0 w-[140px] md:w-auto"
            >
              <div className="group flex flex-col items-center text-center p-4 rounded-xl hover:bg-card transition-all duration-300">
                {/* Premium icon container */}
                <motion.div
                  whileHover={{ scale: 1.08, rotate: 3 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className="relative w-14 h-14 rounded-2xl bg-primary/[0.06] border border-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary group-hover:border-primary transition-all duration-300 overflow-hidden"
                >
                  {/* Shimmer on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute top-0 left-1.5 right-1.5 h-[1.5px] bg-gradient-to-r from-transparent via-accent/50 to-transparent rounded-full" />
                  </div>
                  <badge.icon 
                    className="w-6 h-6 text-primary group-hover:text-primary-foreground transition-colors duration-300 relative z-10" 
                    strokeWidth={1.6}
                    aria-hidden="true" 
                  />
                </motion.div>
                <p className="font-semibold text-sm mb-0.5 text-foreground">{badge.title}</p>
                <p className="text-xs text-muted-foreground leading-tight">{badge.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
