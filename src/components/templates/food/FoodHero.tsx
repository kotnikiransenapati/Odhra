import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Sparkles, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Bold appetite-driven hero for the Indian snacks ecommerce template. */
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
            Freshly packed · FSSAI certified · Pan-India delivery
          </span>
          <h1 className="font-display text-4xl md:text-6xl font-extrabold leading-[1.05] mb-4 text-balance">
            Crunchy. Spicy.
            <br />
            <span className="text-accent">Authentically Indian.</span>
          </h1>
          <p className="text-base md:text-lg text-primary-foreground/85 mb-6 max-w-md">
            Shop handpicked namkeen, mithai, chips and regional snacks from trusted Indian brands. Free shipping over ₹499.
          </p>

          <form
            action="/shop"
            className="flex items-center gap-2 p-1.5 rounded-2xl bg-background shadow-2xl max-w-md"
          >
            <div className="flex-1 flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground ml-2" />
              <input
                name="q"
                placeholder="Search bhujia, ladoo, chivda, chips…"
                className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <Button size="sm" type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold">
              Shop snacks
            </Button>
          </form>

          <div className="flex items-center gap-4 mt-5 text-xs text-primary-foreground/70">
            <span>★ 4.8 from 50K+ orders</span>
            <span>· 500+ snack SKUs</span>
            <span className="hidden sm:inline-flex items-center gap-1"><Package className="w-3 h-3" /> Tamper-proof packaging</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="hidden md:grid grid-cols-2 gap-3"
        >
          {['🥜', '🍪', '🌶️', '🧁', '🥮', '🍡'].map((emoji, i) => (
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
