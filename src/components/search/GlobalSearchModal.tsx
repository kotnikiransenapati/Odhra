import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  X, 
  Loader2, 
  Clock, 
  ArrowRight, 
  Mic, 
  MicOff,
  TrendingUp,
  Sparkles,
  Tag,
  Zap,
  ShoppingBag
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAlgoliaAutocomplete, AlgoliaProduct } from '@/hooks/useAlgoliaSearch';
import { useVoiceSearch } from '@/hooks/useVoiceSearch';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';
import { supabase } from '@/integrations/supabase/client';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

const RECENT_SEARCHES_KEY = 'algolia-recent-searches';
const TRENDING_SEARCHES = ['Leather Jacket', 'Wireless Earbuds', 'Smart Watch', 'Running Shoes'];

interface GlobalSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SupabaseProduct {
  id: string;
  title: string;
  slug: string;
  price: number;
  product_images: { url: string; is_primary: boolean }[];
}

export function GlobalSearchModal({ open, onOpenChange }: GlobalSearchModalProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const { query, setQuery, suggestions, isLoading: algoliaLoading, clearSuggestions } = useAlgoliaAutocomplete();
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [supabaseResults, setSupabaseResults] = useState<SupabaseProduct[]>([]);
  const [isSupabaseSearching, setIsSupabaseSearching] = useState(false);
  
  // Feature flags
  const { isEnabled: voiceSearchEnabled } = useFeatureFlag('voice_search');
  
  // Voice search
  const { 
    isListening, 
    transcript, 
    startListening, 
    stopListening, 
    isSupported: voiceSupported 
  } = useVoiceSearch();

  // Load recent searches
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

  // Focus input when modal opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Handle voice transcript
  useEffect(() => {
    if (transcript) {
      setQuery(transcript);
    }
  }, [transcript, setQuery]);

  // Supabase fallback search when Algolia returns no results
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setSupabaseResults([]);
      return;
    }

    // If Algolia returned results, skip Supabase
    if (suggestions.length > 0) {
      setSupabaseResults([]);
      return;
    }

    // Wait for Algolia to finish first
    if (algoliaLoading) return;

    const timer = setTimeout(async () => {
      setIsSupabaseSearching(true);
      try {
        const { data } = await supabase
          .from('products')
          .select('id, title, slug, price, product_images(url, is_primary)')
          .eq('is_active', true)
          .ilike('title', `%${query}%`)
          .limit(6);

        setSupabaseResults(data || []);
      } catch {
        setSupabaseResults([]);
      } finally {
        setIsSupabaseSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, suggestions, algoliaLoading]);

  const isLoading = algoliaLoading || isSupabaseSearching;
  const hasAlgoliaResults = suggestions.length > 0;
  const hasSupabaseResults = supabaseResults.length > 0;
  const hasResults = hasAlgoliaResults || hasSupabaseResults;

  const saveRecentSearch = useCallback((search: string) => {
    const updated = [search, ...recentSearches.filter(s => s.toLowerCase() !== search.toLowerCase())].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  }, [recentSearches]);

  const handleSearch = useCallback((searchQuery: string) => {
    if (searchQuery.trim()) {
      saveRecentSearch(searchQuery.trim());
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
      onOpenChange(false);
      setQuery('');
      clearSuggestions();
      setSupabaseResults([]);
    }
  }, [navigate, onOpenChange, saveRecentSearch, setQuery, clearSuggestions]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  const handleSuggestionClick = (product: AlgoliaProduct) => {
    saveRecentSearch(product.title);
    navigate(`/product/${product.slug}`);
    onOpenChange(false);
    clearSuggestions();
  };

  const handleSupabaseProductClick = (product: SupabaseProduct) => {
    saveRecentSearch(product.title);
    navigate(`/product/${product.slug}`);
    onOpenChange(false);
    setSupabaseResults([]);
  };

  const handleClearRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden">
        <VisuallyHidden>
          <DialogTitle>Search Products</DialogTitle>
        </VisuallyHidden>
        
        {/* Search Input */}
        <form onSubmit={handleSubmit} className="p-4 border-b border-border">
          <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products, categories, brands..."
                className="pl-10 pr-10 h-12 text-lg"
                autoComplete="off"
              />
              {isLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-muted-foreground" />
              )}
              {query && !isLoading && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => {
                    setQuery('');
                    clearSuggestions();
                    setSupabaseResults([]);
                    inputRef.current?.focus();
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            
            {/* Voice Search Button */}
            {voiceSearchEnabled && voiceSupported && (
              <Button
                type="button"
                variant={isListening ? "destructive" : "outline"}
                size="icon"
                className="h-12 w-12 shrink-0"
                onClick={isListening ? stopListening : startListening}
              >
                {isListening ? (
                  <MicOff className="w-5 h-5 animate-pulse" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </Button>
            )}
          </div>
          
          {/* Voice listening indicator */}
          <AnimatePresence>
            {isListening && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 flex items-center gap-2 text-sm text-accent"
              >
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-accent" />
                </span>
                Listening... speak now
              </motion.div>
            )}
          </AnimatePresence>
        </form>

        {/* Results Area */}
        <ScrollArea className="max-h-[60vh]">
          <div className="p-4">
            <AnimatePresence mode="wait">
              {/* Algolia Product Suggestions */}
              {hasAlgoliaResults && (
                <motion.div
                  key="suggestions"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4 text-accent" />
                    <span className="text-sm font-medium text-muted-foreground">
                      Instant Results
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    {suggestions.map((product) => (
                      <motion.button
                        key={product.objectID}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => handleSuggestionClick(product)}
                        className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-accent/10 transition-colors text-left group"
                      >
                        {product.image ? (
                          <img src={product.image} alt={product.title} className="w-16 h-16 object-cover rounded-lg" />
                        ) : (
                          <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                            <ShoppingBag className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate group-hover:text-accent transition-colors">{product.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-accent font-semibold">{formatPrice(product.price)}</span>
                            {product.compare_at_price && product.compare_at_price > product.price && (
                              <>
                                <span className="text-sm text-muted-foreground line-through">{formatPrice(product.compare_at_price)}</span>
                                <Badge variant="destructive" className="text-xs">
                                  {Math.round((1 - product.price / product.compare_at_price) * 100)}% OFF
                                </Badge>
                              </>
                            )}
                          </div>
                          {product.category && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                              <Tag className="w-3 h-3" />
                              {product.category}
                              {product.vendor_name && <><span>•</span><span>{product.vendor_name}</span></>}
                            </div>
                          )}
                        </div>
                        <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-accent group-hover:translate-x-1 transition-all" />
                      </motion.button>
                    ))}
                  </div>

                  <Button variant="outline" className="w-full mt-4 gap-2" onClick={() => handleSearch(query)}>
                    <Search className="w-4 h-4" />
                    View all results for "{query}"
                  </Button>
                </motion.div>
              )}

              {/* Supabase fallback results (when Algolia unavailable) */}
              {!hasAlgoliaResults && hasSupabaseResults && (
                <motion.div
                  key="supabase-results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Search className="w-4 h-4 text-accent" />
                    <span className="text-sm font-medium text-muted-foreground">
                      Search Results
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    {supabaseResults.map((product) => {
                      const primaryImage = product.product_images?.find(img => img.is_primary);
                      return (
                        <motion.button
                          key={product.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          onClick={() => handleSupabaseProductClick(product)}
                          className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-accent/10 transition-colors text-left group"
                        >
                          {primaryImage?.url ? (
                            <img src={primaryImage.url} alt={product.title} className="w-16 h-16 object-cover rounded-lg" />
                          ) : (
                            <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                              <ShoppingBag className="w-6 h-6 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate group-hover:text-accent transition-colors">{product.title}</p>
                            <span className="text-accent font-semibold">{formatPrice(product.price)}</span>
                          </div>
                          <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-accent group-hover:translate-x-1 transition-all" />
                        </motion.button>
                      );
                    })}
                  </div>

                  <Button variant="outline" className="w-full mt-4 gap-2" onClick={() => handleSearch(query)}>
                    <Search className="w-4 h-4" />
                    View all results for "{query}"
                  </Button>
                </motion.div>
              )}

              {/* Empty state - show recent & trending */}
              {!query && !hasResults && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  {/* Recent Searches */}
                  {recentSearches.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-muted-foreground">Recent Searches</span>
                        </div>
                        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={handleClearRecent}>
                          Clear all
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {recentSearches.map((search, index) => (
                          <Button key={index} variant="secondary" size="sm" className="gap-2" onClick={() => handleSearch(search)}>
                            <Clock className="w-3 h-3" />
                            {search}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Trending Searches */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="w-4 h-4 text-accent" />
                      <span className="text-sm font-medium text-muted-foreground">Trending Searches</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {TRENDING_SEARCHES.map((search, index) => (
                        <Button key={index} variant="outline" size="sm" className="gap-2" onClick={() => handleSearch(search)}>
                          <TrendingUp className="w-3 h-3" />
                          {search}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Search Tips */}
                  <div className="p-4 rounded-xl bg-accent/5 border border-accent/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-accent" />
                      <span className="text-sm font-medium">Search Tips</span>
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Type product names, categories, or brands</li>
                      <li>• Use voice search by clicking the microphone</li>
                      <li>• Press Enter to see all matching products</li>
                    </ul>
                  </div>
                </motion.div>
              )}

              {/* No results found */}
              {query && !hasResults && !isLoading && (
                <motion.div
                  key="no-results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-8"
                >
                  <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-2">No products found</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Try different keywords or browse our categories
                  </p>
                  <Button onClick={() => handleSearch(query)} className="gap-2">
                    <Search className="w-4 h-4" />
                    Search in shop
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>

        {/* Keyboard shortcuts hint */}
        <div className="p-3 border-t border-border bg-muted/30 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px]">↵</kbd>
            Search
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px]">ESC</kbd>
            Close
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
