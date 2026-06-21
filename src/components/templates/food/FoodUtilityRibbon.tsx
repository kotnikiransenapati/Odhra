import { Link } from 'react-router-dom';
import { Clock, ShieldCheck, Flame, Bike, Leaf } from 'lucide-react';

/** Food-template trust ribbon — appetite + delivery signals. */
export function FoodUtilityRibbon() {
  const items = [
    { icon: Clock, label: 'Avg delivery in 32 min', to: '/shipping' },
    { icon: Bike, label: 'Free delivery over ₹299', to: '/shipping' },
    { icon: ShieldCheck, label: 'FSSAI verified kitchens', to: '/about' },
    { icon: Leaf, label: 'Veg-only filter available', to: '/shop?diet=veg' },
    { icon: Flame, label: 'Daily live deals', to: '/flash-sales' },
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
