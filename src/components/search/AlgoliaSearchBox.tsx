import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Loader2, TrendingUp, Clock, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAlgoliaAutocomplete, AlgoliaProduct } from '@/hooks/useAlgoliaSearch';

const RECENT_SEARCHES_KEY = 'algolia-recent-searches';

interface AlgoliaSearchBoxProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export function AlgoliaSearchBox({ 
  onSearch, 
  placeholder = "Search products...",
  className = "",
  autoFocus = false,
}: AlgoliaSearchBoxProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { query, setQuery, suggestions, isLoading, clearSuggestions } = useAlgoliaAutocomplete();
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load recent searches
  useEffect(() => {
    const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (saved) {
      setRecentSearches(JSON.parse(saved).slice(0, 5));
    }
  }, []);

  // Save search to recent
  const saveRecentSearch = (search: string) => {
    const updated = [search, ...recentSearches.filter(s => s !== search)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  };

  // Handle search submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      saveRecentSearch(query.trim());
      onSearch?.(query.trim());
      navigate(`/shop?search=${encodeURIComponent(query.trim())}`);
      setIsFocused(false);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (product: AlgoliaProduct) => {
    saveRecentSearch(product.title);
    navigate(`/product/${product.slug}`);
    clearSuggestions();
    setIsFocused(false);
  };

  // Handle recent search click
  const handleRecentClick = (search: string) => {
    setQuery(search);
    onSearch?.(search);
    navigate(`/shop?search=${encodeURIComponent(search)}`);
    setIsFocused(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showDropdown = isFocused && (suggestions.length > 0 || (recentSearches.length > 0 && !query));

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            placeholder={placeholder}
            className="pl-10 pr-10 h-11"
            autoFocus={autoFocus}
          />
          {isLoading ? (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
          ) : query && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
              onClick={() => {
                setQuery('');
                clearSuggestions();
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </form>

      {/* Dropdown */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden"
          >
            {/* Product Suggestions */}
            {suggestions.length > 0 && (
              <div className="p-2">
                <div className="text-xs font-medium text-muted-foreground px-2 py-1.5 mb-1">
                  Products
                </div>
                {suggestions.map((product) => (
                  <button
                    key={product.objectID}
                    onClick={() => handleSuggestionClick(product)}
                    className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-accent/50 transition-colors text-left"
                  >
                    {product.image && (
                      <img
                        src={product.image}
                        alt={product.title}
                        className="w-10 h-10 object-cover rounded-md"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{product.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>₹{product.price.toLocaleString('en-IN')}</span>
                        {product.category && (
                          <>
                            <span>•</span>
                            <span>{product.category}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))}
                
                {/* View all results */}
                <Button
                  variant="ghost"
                  className="w-full mt-2 text-sm gap-2"
                  onClick={handleSubmit}
                >
                  <Search className="w-4 h-4" />
                  View all results for "{query}"
                </Button>
              </div>
            )}

            {/* Recent Searches */}
            {!query && recentSearches.length > 0 && (
              <div className="p-2">
                <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                  <span className="text-xs font-medium text-muted-foreground">Recent Searches</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => {
                      setRecentSearches([]);
                      localStorage.removeItem(RECENT_SEARCHES_KEY);
                    }}
                  >
                    Clear
                  </Button>
                </div>
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => handleRecentClick(search)}
                    className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-accent/50 transition-colors text-left"
                  >
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{search}</span>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
