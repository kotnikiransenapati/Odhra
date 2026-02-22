import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Truck, RotateCcw, CreditCard, Headphones, Award, type LucideIcon } from 'lucide-react';

interface Badge {
  icon: LucideIcon;
  title: string;
  description: string;
  stat: string;
}

const badges: Badge[] = [
  { icon: Shield, title: 'Secure Payments', description: '256-bit SSL encryption', stat: '100%' },
  { icon: Truck, title: 'Express Delivery', description: 'Free on orders ₹999+', stat: '96%' },
  { icon: RotateCcw, title: 'Easy Returns', description: '7-day hassle-free', stat: '24hr' },
  { icon: CreditCard, title: 'Pay Your Way', description: 'UPI, Cards, COD', stat: '10+' },
  { icon: Headphones, title: '24/7 Support', description: 'Always here to help', stat: '<1m' },
  { icon: Award, title: 'Quality Assured', description: 'Verified vendors only', stat: '500+' },
];

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } }
};

export function TrustBadges() {
  return (
    <section className="py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div 
          className="flex md:grid md:grid-cols-6 gap-3 md:gap-4 overflow-x-auto scrollbar-hide pb-2 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0"
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          {badges.map((badge) => (
            <motion.div
              key={badge.title}
              variants={itemVariants}
              className="flex-shrink-0 w-[130px] md:w-auto"
            >
              <div className="group flex flex-col items-center text-center p-4 rounded-2xl border border-transparent hover:border-border/60 hover:bg-card/50 transition-all duration-300">
                {/* Icon with stat overlay */}
                <div className="relative mb-3">
                  <motion.div
                    whileHover={{ scale: 1.06 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className="w-12 h-12 rounded-xl bg-primary/[0.06] flex items-center justify-center group-hover:bg-accent/10 transition-colors duration-300"
                  >
                    <badge.icon 
                      className="w-5.5 h-5.5 text-primary/70 group-hover:text-accent transition-colors duration-300" 
                      strokeWidth={1.6}
                      aria-hidden="true" 
                    />
                  </motion.div>
                  {/* Animated stat */}
                  <span className="absolute -top-1 -right-1 text-[9px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {badge.stat}
                  </span>
                </div>
                <p className="font-semibold text-xs mb-0.5 text-foreground/90">{badge.title}</p>
                <p className="text-[10.5px] text-muted-foreground leading-tight">{badge.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
