import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  X, 
  Clock, 
  TrendingUp, 
  Package, 
  ShoppingBag,
  Grid3X3,
  Settings,
  HelpCircle,
  Headphones,
  ArrowRight,
  Loader2,
  Trash2
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SearchResult {
  id: string;
  type: 'product' | 'category' | 'order' | 'page' | 'support';
  title: string;
  subtitle?: string;
  image?: string;
  link: string;
}

// Quick access links for navigation
const quickLinks = [
  { icon: ShoppingBag, label: 'Shop All', link: '/shop', description: 'Browse products' },
  { icon: Package, label: 'My Orders', link: '/orders', description: 'Track orders' },
  { icon: Grid3X3, label: 'Categories', link: '/shop', description: 'Browse by category' },
  { icon: Settings, label: 'Settings', link: '/settings', description: 'Account settings' },
  { icon: Headphones, label: 'Support', link: '/support', description: 'Get help' },
  { icon: HelpCircle, label: 'FAQ', link: '/faq', description: 'Common questions' },
];

// Trending searches
const trendingSearches = [
  'Electronics',
  'Fashion',
  'Home Decor',
  'Jewelry',
  'Accessories',
  'Handmade',
];

const RECENT_SEARCHES_KEY = 'odhra_recent_searches';

export function SearchModal({ open, onOpenChange }: SearchModalProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [categories, setCategories] = useState<SearchResult[]>([]);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved).slice(0, 5));
      } catch {
        setRecentSearches([]);
      }
    }
  }, [open]);

  // Load categories
  useEffect(() => {
    if (open) {
      fetchCategories();
    }
  }, [open]);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('id, name, slug, image_url')
      .eq('is_active', true)
      .order('sort_order')
      .limit(8);

    if (data) {
      setCategories(data.map(cat => ({
        id: cat.id,
        type: 'category' as const,
        title: cat.name,
        subtitle: 'Category',
        image: cat.image_url || undefined,
        link: `/shop?category=${cat.slug}`,
      })));
    }
  };

  const saveRecentSearch = (search: string) => {
    const trimmed = search.trim();
    if (!trimmed) return;
    
    const updated = [trimmed, ...recentSearches.filter(s => s !== trimmed)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  };

  // Debounced search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    const searchResults: SearchResult[] = [];

    try {
      // Search products
      const { data: products } = await supabase
        .from('products')
        .select('id, title, slug, price')
        .eq('is_active', true)
        .ilike('title', `%${searchQuery}%`)
        .limit(5);

      if (products) {
        products.forEach(p => {
          searchResults.push({
            id: p.id,
            type: 'product',
            title: p.title,
            subtitle: `₹${p.price.toLocaleString()}`,
            link: `/product/${p.slug}`,
          });
        });
      }

      // Search categories
      const { data: cats } = await supabase
        .from('categories')
        .select('id, name, slug')
        .eq('is_active', true)
        .ilike('name', `%${searchQuery}%`)
        .limit(3);

      if (cats) {
        cats.forEach(c => {
          searchResults.push({
            id: c.id,
            type: 'category',
            title: c.name,
            subtitle: 'Category',
            link: `/shop?category=${c.slug}`,
          });
        });
      }

      // Search orders (if logged in)
      if (user) {
        const { data: orders } = await supabase
          .from('orders')
          .select('id, order_number, total_amount, created_at')
          .eq('customer_id', user.id)
          .ilike('order_number', `%${searchQuery}%`)
          .limit(3);

        if (orders) {
          orders.forEach(o => {
            searchResults.push({
              id: o.id,
              type: 'order',
              title: `Order #${o.order_number}`,
              subtitle: `₹${o.total_amount.toLocaleString()}`,
              link: `/orders/${o.id}`,
            });
          });
        }
      }

      // Add static page results based on keywords
      const pageMatches: { keyword: string; result: SearchResult }[] = [
        { keyword: 'support', result: { id: 'support', type: 'support', title: 'Customer Support', subtitle: 'Get help with your orders', link: '/support' } },
        { keyword: 'help', result: { id: 'support', type: 'support', title: 'Help Center', subtitle: 'FAQs and support', link: '/support' } },
        { keyword: 'faq', result: { id: 'faq', type: 'page', title: 'FAQ', subtitle: 'Frequently asked questions', link: '/faq' } },
        { keyword: 'setting', result: { id: 'settings', type: 'page', title: 'Account Settings', subtitle: 'Manage your account', link: '/settings' } },
        { keyword: 'order', result: { id: 'orders', type: 'page', title: 'My Orders', subtitle: 'Track your orders', link: '/orders' } },
        { keyword: 'track', result: { id: 'tracking', type: 'page', title: 'Order Tracking', subtitle: 'Track your shipment', link: '/orders' } },
        { keyword: 'wishlist', result: { id: 'wishlist', type: 'page', title: 'My Wishlist', subtitle: 'Saved items', link: '/wishlist' } },
        { keyword: 'cart', result: { id: 'cart', type: 'page', title: 'Shopping Cart', subtitle: 'View your cart', link: '/cart' } },
        { keyword: 'account', result: { id: 'account', type: 'page', title: 'My Account', subtitle: 'Profile and preferences', link: '/account' } },
        { keyword: 'wallet', result: { id: 'wallet', type: 'page', title: 'My Wallet', subtitle: 'Balance and transactions', link: '/wallet' } },
        { keyword: 'address', result: { id: 'addresses', type: 'page', title: 'My Addresses', subtitle: 'Saved addresses', link: '/addresses' } },
        { keyword: 'contact', result: { id: 'contact', type: 'page', title: 'Contact Us', subtitle: 'Get in touch', link: '/contact' } },
        { keyword: 'about', result: { id: 'about', type: 'page', title: 'About Odhra', subtitle: 'Our story', link: '/about' } },
        { keyword: 'privacy', result: { id: 'privacy', type: 'page', title: 'Privacy Policy', subtitle: 'How we protect your data', link: '/privacy' } },
        { keyword: 'terms', result: { id: 'terms', type: 'page', title: 'Terms & Conditions', subtitle: 'Legal terms', link: '/terms' } },
        { keyword: 'sell', result: { id: 'vendor', type: 'page', title: 'Sell on Odhra', subtitle: 'Become a vendor', link: '/vendor/onboarding' } },
        { keyword: 'vendor', result: { id: 'vendor', type: 'page', title: 'Vendor Dashboard', subtitle: 'Manage your store', link: '/vendor' } },
        { keyword: 'spin', result: { id: 'spin', type: 'page', title: 'Spin to Win', subtitle: 'Win discounts', link: '/spin-to-win' } },
      ];

      const lowerQuery = searchQuery.toLowerCase();
      pageMatches.forEach(pm => {
        if (pm.keyword.includes(lowerQuery) || lowerQuery.includes(pm.keyword)) {
          if (!searchResults.find(r => r.id === pm.result.id)) {
            searchResults.push(pm.result);
          }
        }
      });

      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  }, [user]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, performSearch]);

  const handleSelect = (result: SearchResult) => {
    saveRecentSearch(result.title);
    onOpenChange(false);
    navigate(result.link);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      saveRecentSearch(query);
      onOpenChange(false);
      navigate(`/shop?search=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleQuickSearch = (term: string) => {
    saveRecentSearch(term);
    onOpenChange(false);
    navigate(`/shop?search=${encodeURIComponent(term)}`);
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'product': return ShoppingBag;
      case 'category': return Grid3X3;
      case 'order': return Package;
      case 'support': return Headphones;
      default: return Search;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden">
        {/* Search Header */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-3 p-4 border-b">
          <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products, orders, settings..."
            className="border-0 focus-visible:ring-0 text-lg h-auto p-0 placeholder:text-muted-foreground/60"
            autoFocus
          />
          {isSearching && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
          {query && !isSearching && (
            <Button 
              type="button" 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => setQuery('')}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </form>

        <ScrollArea className="max-h-[60vh]">
          <div className="p-4 space-y-6">
            {/* Search Results */}
            {query && results.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Results
                </h3>
                <div className="space-y-1">
                  {results.map((result) => {
                    const Icon = getResultIcon(result.type);
                    return (
                      <button
                        key={`${result.type}-${result.id}`}
                        onClick={() => handleSelect(result)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors text-left"
                      >
                        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-5 h-5 text-accent" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{result.title}</p>
                          {result.subtitle && (
                            <p className="text-sm text-muted-foreground truncate">{result.subtitle}</p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs capitalize">
                          {result.type}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
                
                {/* View All Results */}
                <Button
                  variant="ghost"
                  className="w-full mt-2 text-accent hover:text-accent"
                  onClick={handleSearchSubmit}
                >
                  View all results for "{query}"
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}

            {/* No Results */}
            {query && !isSearching && results.length === 0 && (
              <div className="text-center py-8">
                <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No results found for "{query}"</p>
                <Button
                  variant="link"
                  className="text-accent mt-2"
                  onClick={() => {
                    onOpenChange(false);
                    navigate(`/shop?search=${encodeURIComponent(query)}`);
                  }}
                >
                  Search in shop →
                </Button>
              </div>
            )}

            {/* Default Content (when no query) */}
            {!query && (
              <>
                {/* Quick Links */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Quick Access
                  </h3>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {quickLinks.map((link) => (
                      <button
                        key={link.link}
                        onClick={() => {
                          onOpenChange(false);
                          navigate(link.link);
                        }}
                        className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-secondary transition-colors"
                      >
                        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                          <link.icon className="w-5 h-5 text-accent" />
                        </div>
                        <span className="text-xs font-medium text-center">{link.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Recent Searches
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs text-muted-foreground hover:text-destructive"
                        onClick={clearRecentSearches}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Clear
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {recentSearches.map((search, i) => (
                        <button
                          key={i}
                          onClick={() => handleQuickSearch(search)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary hover:bg-secondary/80 transition-colors text-sm"
                        >
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          {search}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Trending */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Trending
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {trendingSearches.map((term) => (
                      <button
                        key={term}
                        onClick={() => handleQuickSearch(term)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 hover:bg-accent/20 transition-colors text-sm text-accent"
                      >
                        <TrendingUp className="w-3 h-3" />
                        {term}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Categories */}
                {categories.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      Categories
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {categories.slice(0, 8).map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => handleSelect(cat)}
                          className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary transition-colors text-left"
                        >
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent/20 to-primary/10 flex items-center justify-center overflow-hidden">
                            {cat.image ? (
                              <img src={cat.image} alt={cat.title} className="w-full h-full object-cover" />
                            ) : (
                              <Grid3X3 className="w-4 h-4 text-accent" />
                            )}
                          </div>
                          <span className="text-sm font-medium truncate">{cat.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-3 border-t bg-secondary/30 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">↵</kbd>
              to search
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">esc</kbd>
              to close
            </span>
          </div>
          <span>Powered by Odhra</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
