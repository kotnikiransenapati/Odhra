import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Truck, RotateCcw, CreditCard, Headphones, Award } from 'lucide-react';

const badges = [
  {
    icon: Shield,
    title: 'Secure Payments',
    description: 'Bank-grade encryption',
  },
  {
    icon: Truck,
    title: 'Fast Delivery',
    description: 'Free shipping on ₹999+',
  },
  {
    icon: RotateCcw,
    title: 'Easy Returns',
    description: '7-day return policy',
  },
  {
    icon: CreditCard,
    title: 'Multiple Payment Options',
    description: 'UPI, Cards, Wallets',
  },
  {
    icon: Headphones,
    title: '24/7 Support',
    description: 'Always here to help',
  },
  {
    icon: Award,
    title: 'Quality Assured',
    description: 'Verified vendors only',
  },
];

export function TrustBadges() {
  return (
    <section className="py-16 px-4 border-y border-border">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {badges.map((badge, index) => (
            <motion.div
              key={badge.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="flex flex-col items-center text-center group"
            >
              <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-3 group-hover:bg-accent group-hover:text-accent-foreground transition-colors duration-300">
                <badge.icon className="w-6 h-6 text-accent group-hover:text-accent-foreground transition-colors" />
              </div>
              <h3 className="font-semibold text-sm mb-1">{badge.title}</h3>
              <p className="text-xs text-muted-foreground">{badge.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
