import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Shield, Truck, Award, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';

const emailSchema = z.string().trim().email('Please enter a valid email').max(255);

export function Footer() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = emailSchema.safeParse(email);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('newsletter_subscribers')
        .upsert(
          { email: result.data, source: 'footer', status: 'active', subscribed_at: new Date().toISOString() },
          { onConflict: 'email' }
        );

      if (error) throw error;
      toast.success('Subscribed! You\'ll receive our latest updates.');
      setEmail('');
    } catch (err: any) {
      toast.error('Failed to subscribe. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer className="border-t border-border/50 py-14 px-4 bg-primary/[0.02]" role="contentinfo">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-display font-bold tracking-tight">Odhra</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-5">
              India's premium multi-vendor marketplace. Curated quality, trusted sellers, and seamless shopping.
            </p>
            {/* Newsletter */}
            <form onSubmit={handleNewsletterSubmit} className="flex gap-2 max-w-sm">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                aria-label="Email for newsletter"
                className="flex-1 h-9 text-sm"
                disabled={isSubmitting}
                required
              />
              <Button size="sm" type="submit" className="h-9 px-4 text-xs font-semibold" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Subscribe'}
              </Button>
            </form>
            <p className="text-[10px] text-muted-foreground/60 mt-2">Get exclusive deals & new arrivals. No spam, ever.</p>
          </div>
          <nav>
            <h3 className="font-display font-semibold mb-4 text-sm tracking-wide uppercase text-foreground/70">Shop</h3>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li><Link to="/shop" className="hover:text-accent transition-colors">All Products</Link></li>
              <li><Link to="/shop?filter=new" className="hover:text-accent transition-colors">New Arrivals</Link></li>
              <li><Link to="/shop?filter=featured" className="hover:text-accent transition-colors">Featured</Link></li>
              <li><Link to="/flash-sales" className="hover:text-accent transition-colors">Flash Sales</Link></li>
            </ul>
          </nav>
          <nav>
            <h3 className="font-display font-semibold mb-4 text-sm tracking-wide uppercase text-foreground/70">Support</h3>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li><Link to="/faq" className="hover:text-accent transition-colors">FAQ</Link></li>
              <li><Link to="/contact" className="hover:text-accent transition-colors">Contact</Link></li>
              <li><Link to="/about" className="hover:text-accent transition-colors">About Us</Link></li>
              <li><Link to="/support" className="hover:text-accent transition-colors">Help Center</Link></li>
            </ul>
          </nav>
          <nav>
            <h3 className="font-display font-semibold mb-4 text-sm tracking-wide uppercase text-foreground/70">Legal</h3>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li><Link to="/privacy" className="hover:text-accent transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-accent transition-colors">Terms of Service</Link></li>
              <li><Link to="/become-vendor" className="hover:text-accent transition-colors">Sell on Odhra</Link></li>
            </ul>
          </nav>
        </div>
        {/* Payment & Trust */}
        <div className="py-6 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-muted-foreground/50 text-xs">
            <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Secure Payments</span>
            <span className="flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" /> Fast Delivery</span>
            <span className="flex items-center gap-1.5"><Award className="w-3.5 h-3.5" /> Quality Assured</span>
          </div>
          <p className="text-xs text-muted-foreground/60 tracking-wide">
            © {new Date().getFullYear()} Odhra. Crafted with precision in India.
          </p>
        </div>
      </div>
    </footer>
  );
}
