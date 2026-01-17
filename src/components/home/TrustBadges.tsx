import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Truck, RotateCcw, CreditCard, Headphones, Award } from 'lucide-react';

const badges = [
  {
    icon: Shield,
    title: 'Secure Payments',
    description: '256-bit SSL encryption',
    color: 'from-emerald-500/20 to-emerald-500/5',
  },
  {
    icon: Truck,
    title: 'Express Delivery',
    description: 'Free on orders ₹999+',
    color: 'from-blue-500/20 to-blue-500/5',
  },
  {
    icon: RotateCcw,
    title: 'Easy Returns',
    description: '7-day hassle-free',
    color: 'from-purple-500/20 to-purple-500/5',
  },
  {
    icon: CreditCard,
    title: 'Pay Your Way',
    description: 'UPI, Cards, COD',
    color: 'from-amber-500/20 to-amber-500/5',
  },
  {
    icon: Headphones,
    title: '24/7 Support',
    description: 'Always here to help',
    color: 'from-rose-500/20 to-rose-500/5',
  },
  {
    icon: Award,
    title: 'Quality Assured',
    description: 'Verified vendors only',
    color: 'from-accent/20 to-accent/5',
  },
];

export function TrustBadges() {
  return (
    <section className="py-10 px-4 bg-secondary/40 border-y border-border/50">
      <div className="max-w-7xl mx-auto">
        {/* Scrolling container for mobile */}
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
              <div className="group flex flex-col items-center text-center p-4 rounded-xl hover:bg-card/80 transition-all duration-300 trust-shine">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${badge.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
                  <badge.icon className="w-6 h-6 text-foreground" aria-hidden="true" />
                </div>
                <p className="font-semibold text-sm mb-0.5 text-foreground">{badge.title}</p>
                <p className="text-xs text-muted-foreground leading-tight" style={{ color: 'hsl(var(--muted-foreground))' }}>{badge.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}