import { Link } from 'react-router-dom';
import { Truck, ShieldCheck, Flame, Package, Leaf } from 'lucide-react';

/** Indian snacks ecommerce trust ribbon. */
export function FoodUtilityRibbon() {
  const items = [
    { icon: Truck, label: 'Free shipping over ₹499', to: '/shipping' },
    { icon: Package, label: 'Freshly packed weekly', to: '/about' },
    { icon: ShieldCheck, label: 'FSSAI certified brands', to: '/about' },
    { icon: Leaf, label: '100% veg · no preservatives', to: '/shop?diet=veg' },
    { icon: Flame, label: 'Today\'s snack deals', to: '/flash-sales' },
  ];
  return (
    <div className="bg-primary text-primary-foreground text-xs">
      <div className="max-w-7xl mx-auto px-3 py-1.5 flex items-center gap-5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <Link key={it.label} to={it.to} className="flex items-center gap-1.5 whitespace-nowrap opacity-95 hover:text-accent transition">
              <Icon className="w-3.5 h-3.5" />
              <span>{it.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
