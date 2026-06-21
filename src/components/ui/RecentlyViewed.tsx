import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, X, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ViewedProduct {
  id: string;
  slug: string;
  title: string;
  price: number;
  imageUrl: string;
  viewedAt: number;
}

const STORAGE_KEY = 'odhra_recently_viewed';
const MAX_ITEMS = 8;

// Hook to manage recently viewed products
export function useRecentlyViewed() {
  const [items, setItems] = useState<ViewedProduct[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setItems(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse recently viewed:', e);
      }
    }
  }, []);

  const addItem = useCallback((product: Omit<ViewedProduct, 'viewedAt'>) => {
    setItems((prev) => {
      const filtered = prev.filter((p) => p.id !== product.id);
      const updated = [
        { ...product, viewedAt: Date.now() },
        ...filtered,
      ].slice(0, MAX_ITEMS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearItems = useCallback(() => {
    setItems([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { items, addItem, clearItems };
}

// Floating widget component
export function RecentlyViewedWidget() {
  const { items, clearItems } = useRecentlyViewed();
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show widget after 2 seconds if there are items
    const timer = setTimeout(() => {
      if (items.length > 0) {
        setIsVisible(true);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [items.length]);

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (!isVisible || items.length === 0) return null;

  return (
    <motion.div
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="fixed right-4 bottom-20 z-40 hidden md:block"
    >
      <div className="glass rounded-2xl shadow-xl overflow-hidden w-72">
        {/* Header */}
        <div
          className="flex items-center justify-between p-3 bg-accent/10 cursor-pointer"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium">Recently Viewed ({items.length})</span>
          </div>
          <div className="flex items-center gap-1">
            {isOpen && (
              <Button
                variant="ghost"
                size="icon"
                className="w-6 h-6"
                onClick={(e) => {
                  e.stopPropagation();
                  clearItems();
                  setIsVisible(false);
                }}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
            {isOpen ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </div>
        </div>

        {/* Content */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="max-h-80 overflow-y-auto p-2 space-y-2">
                {items.map((item) => (
                  <Link
                    key={item.id}
                    to={`/product/${item.slug}`}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-secondary/50 transition-colors group"
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted shrink-0">
                      <img
                        src={item.imageUrl || '/placeholder.svg'}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-sm text-accent font-semibold">
                        {formatPrice(item.price)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
