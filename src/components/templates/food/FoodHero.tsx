import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, MapPin, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Bold appetite-driven hero for the food template. */
export function FoodHero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-accent/40" />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'radial-gradient(circle at 18% 30%, hsl(var(--accent) / 0.5), transparent 38%), radial-gradient(circle at 82% 70%, hsl(var(--warning) / 0.45), transparent 42%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 py-12 md:py-20 grid md:grid-cols-2 gap-10 items-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-primary-foreground"
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-background/15 backdrop-blur text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            Freshly prepared · 32 min average delivery
          </span>
          <h1 className="font-display text-4xl md:text-6xl font-extrabold leading-[1.05] mb-4 text-balance">
            Cravings, sorted.
            <br />
            <span className="text-accent">Hot food in 30.</span>
          </h1>
          <p className="text-base md:text-lg text-primary-foreground/85 mb-6 max-w-md">
            Order from FSSAI-verified kitchens near you. Live tracking, contactless delivery, and a 100% taste guarantee.
          </p>

          <form
            action="/shop"
            className="flex items-center gap-2 p-1.5 rounded-2xl bg-background shadow-2xl max-w-md"
          >
            <span className="pl-2 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 text-accent" />
              Pune
            </span>
            <div className="h-5 w-px bg-border" />
            <div className="flex-1 flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground ml-1" />
              <input
                name="q"
                placeholder="Search biryani, pizza, momos…"
                className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <Button size="sm" type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold">
              Find food
            </Button>
          </form>

          <div className="flex items-center gap-4 mt-5 text-xs text-primary-foreground/70">
            <span>★ 4.8 from 50K+ orders</span>
            <span>· 1000+ kitchens</span>
            <span>· 24×7</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="hidden md:grid grid-cols-2 gap-3"
        >
          {['🍕', '🍔', '🥗', '🍜', '🍣', '🥘'].map((emoji, i) => (
            <Link
              key={i}
              to="/shop"
              className="aspect-square rounded-3xl bg-background/95 backdrop-blur flex items-center justify-center text-5xl shadow-xl hover:scale-105 transition-transform"
              style={{ transform: `rotate(${(i % 2 ? 1 : -1) * 2}deg)` }}
            >
              {emoji}
            </Link>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
