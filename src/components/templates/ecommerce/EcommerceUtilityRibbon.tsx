import { Link } from 'react-router-dom';
import { Truck, ShieldCheck, RotateCcw, Headphones, Award } from 'lucide-react';

/**
 * Slim utility ribbon for the ecommerce template — Amazon-style trust signals
 * pinned above the navbar. Uses semantic tokens only.
 */
export function EcommerceUtilityRibbon() {
  const items = [
    { icon: Truck, label: 'Free delivery over ₹999', to: '/shipping' },
    { icon: RotateCcw, label: '7-day easy returns', to: '/returns' },
    { icon: ShieldCheck, label: 'Verified vendors', to: '/about' },
    { icon: Award, label: 'Lowest price guarantee', to: '/faq' },
    { icon: Headphones, label: '24x7 support', to: '/contact' },
  ];
  return (
    <div className="bg-primary text-primary-foreground text-xs">
      <div className="max-w-7xl mx-auto px-3 py-1.5 flex items-center gap-5 overflow-x-auto scrollbar-none">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <Link
              key={it.label}
              to={it.to}
              className="flex items-center gap-1.5 whitespace-nowrap opacity-90 hover:opacity-100 hover:text-accent transition-colors"
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{it.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
