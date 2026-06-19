import { useLocation, Link } from 'react-router-dom';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Home, Search, ArrowLeft, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/layout/Navbar';
import { SEOHead } from '@/components/SEOHead';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Page Not Found" description="The page you're looking for doesn't exist or has been moved. Head back to the Odhra homepage or browse our shop for premium products." noIndex />
      <Navbar />
      <main className="pt-24 pb-16 px-4">
        <div className="max-w-lg mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="w-32 h-32 rounded-full bg-gradient-to-br from-accent/20 to-primary/10 flex items-center justify-center mx-auto mb-8"
          >
            <span className="text-6xl font-display font-black text-accent">404</span>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <h1 className="text-3xl font-display font-bold mb-3">Page Not Found</h1>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              The page <code className="text-sm bg-muted px-2 py-1 rounded">{location.pathname}</code> doesn't exist or has been moved.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Button asChild size="lg" className="gap-2">
              <Link to="/"><Home className="w-4 h-4" /> Go Home</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="gap-2">
              <Link to="/shop"><ShoppingBag className="w-4 h-4" /> Browse Shop</Link>
            </Button>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-8"
          >
            <Button variant="ghost" onClick={() => window.history.back()} className="gap-2 text-muted-foreground">
              <ArrowLeft className="w-4 h-4" /> Go Back
            </Button>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default NotFound;
