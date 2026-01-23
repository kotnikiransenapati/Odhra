import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  SlidersHorizontal, 
  ChevronDown,
  Sparkles,
  TrendingUp,
  Users,
  Star,
  ShieldCheck,
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { ProductCard } from '@/components/shop/ProductCard';
import { ProductCompactCard } from '@/components/shop/ProductCompactCard';
import { ProductListCard } from '@/components/shop/ProductListCard';
import { ViewModeToggle } from '@/components/shop/ViewModeToggle';
import { CategoryFilter } from '@/components/shop/CategoryFilter';
import { AlgoliaSearchBox } from '@/components/search/AlgoliaSearchBox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useProducts, useCategories } from '@/hooks/useProducts';
import { useAlgoliaSearch, AlgoliaProduct } from '@/hooks/useAlgoliaSearch';
import { ProductGridSkeleton } from '@/components/shop/ProductGridSkeleton';
import { useViewMode, getGridClasses } from '@/hooks/useViewMode';

type SortOption = 'newest' | 'price-asc' | 'price-desc' | 'popular' | 'rating';

const sortOptions: { value: SortOption; label: string; icon?: React.ReactNode }[] = [
  { value: 'newest', label: 'Newest First', icon: <Sparkles className="w-4 h-4" /> },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'popular', label: 'Most Popular', icon: <TrendingUp className="w-4 h-4" /> },
  { value: 'rating', label: 'Highest Rated', icon: <Star className="w-4 h-4" /> },
];

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categorySlug = searchParams.get('category');
  const urlSearchQuery = searchParams.get('search') || '';
  const [searchQuery, setSearchQuery] = useState(urlSearchQuery);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const { viewMode, setViewMode } = useViewMode('list', { pageKey: 'shop' });
  const [priceRange, setPriceRange] = useState([0, 50000]);
  const [showFeatured, setShowFeatured] = useState(false);
  const [showInStock, setShowInStock] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  // Sync search query from URL
  useEffect(() => {
    setSearchQuery(urlSearchQuery);
  }, [urlSearchQuery]);

  // Use Algolia for search - pass the query
  const { 
    results: algoliaResults, 
    isLoading: algoliaLoading, 
    setQuery: setAlgoliaQuery 
  } = useAlgoliaSearch();

  // Trigger Algolia search when URL search query changes
  useEffect(() => {
    if (urlSearchQuery) {
      setAlgoliaQuery(urlSearchQuery);
    }
  }, [urlSearchQuery, setAlgoliaQuery]);

  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const { data: products = [], isLoading: productsLoading } = useProducts({
    categorySlug,
    searchQuery: searchQuery || undefined,
    featured: showFeatured || undefined,
    sortBy: sortBy as any,
  });

  // Use Algolia results when searching, otherwise use regular products
  const displayProducts = useMemo(() => {
    // If we have Algolia results for the current search, use them
    if (urlSearchQuery && algoliaResults && algoliaResults.hits.length > 0) {
      // Transform Algolia hits to match Product shape
      return algoliaResults.hits.map(hit => ({
        id: hit.objectID,
        title: hit.title,
        slug: hit.slug,
        price: hit.price,
        compare_at_price: hit.compare_at_price || null,
        description: hit.description || null,
        stock: hit.in_stock ? 10 : 0,
        is_active: true,
        is_featured: false,
        avg_rating: hit.rating || 0,
        review_count: hit.review_count || 0,
        category_id: null,
        vendor_id: '',
        tags: hit.tags || null,
        created_at: '',
        product_images: hit.image ? [{ url: hit.image, is_primary: true, alt_text: hit.title }] : [],
        vendors_public: hit.vendor_name ? { brand_name: hit.vendor_name, slug: hit.vendor_slug || '' } : null,
        categories: hit.category ? { name: hit.category, slug: '' } : null,
      }));
    }
    
    // Otherwise filter regular products
    let result = [...products];

    // Filter by price
    result = result.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1]);

    // Filter in stock
    if (showInStock) {
      result = result.filter(p => p.stock > 0);
    }

    return result;
  }, [products, priceRange, showInStock, urlSearchQuery, algoliaResults]);

  const handleCategoryChange = (slug: string | null) => {
    if (slug) {
      setSearchParams({ category: slug });
    } else {
      setSearchParams({});
    }
  };

  const clearFilters = () => {
    setPriceRange([0, 50000]);
    setShowFeatured(false);
    setShowInStock(false);
    setSortBy('newest');
    setSearchQuery('');
    setSearchParams({});
  };

  const activeFiltersCount = [
    categorySlug,
    priceRange[0] > 0 || priceRange[1] < 50000,
    showFeatured,
    showInStock,
    searchQuery,
  ].filter(Boolean).length;

  const selectedCategory = categories.find(c => c.slug === categorySlug);

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Price Range */}
      <div>
        <h4 className="font-medium mb-4">Price Range</h4>
        <Slider
          value={priceRange}
          min={0}
          max={50000}
          step={500}
          onValueChange={setPriceRange}
          className="mb-4"
        />
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>₹{priceRange[0].toLocaleString()}</span>
          <span>₹{priceRange[1].toLocaleString()}</span>
        </div>
      </div>

      <Separator />

      {/* Filters */}
      <div className="space-y-4">
        <h4 className="font-medium">Filters</h4>
        
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="featured" 
            checked={showFeatured}
            onCheckedChange={(checked) => setShowFeatured(checked as boolean)}
          />
          <Label htmlFor="featured" className="text-sm cursor-pointer">
            Featured Only
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox 
            id="instock" 
            checked={showInStock}
            onCheckedChange={(checked) => setShowInStock(checked as boolean)}
          />
          <Label htmlFor="instock" className="text-sm cursor-pointer">
            In Stock Only
          </Label>
        </div>
      </div>

      <Separator />

      {/* Clear Filters */}
      {activeFiltersCount > 0 && (
        <Button variant="outline" onClick={clearFilters} className="w-full">
          Clear All Filters
        </Button>
      )}
    </div>
  );

  // Render product based on view mode
  const renderProduct = (product: typeof displayProducts[0], index: number) => {
    const primaryImage = product.product_images?.find(img => img.is_primary);
    
    const commonProps = {
      id: product.id,
      title: product.title,
      slug: product.slug,
      price: product.price,
      compareAtPrice: product.compare_at_price,
      imageUrl: primaryImage?.url,
      rating: product.avg_rating || 0,
      reviewCount: product.review_count || 0,
      vendorName: product.vendors_public?.brand_name,
      isFeatured: product.is_featured,
      stock: product.stock,
    };

    switch (viewMode) {
      case 'compact':
        return <ProductCompactCard key={product.id} {...commonProps} />;
      case 'list':
        return (
          <ProductListCard 
            key={product.id} 
            {...commonProps} 
            description={product.description}
          />
        );
      default:
        return (
          <motion.div
            key={product.id}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ delay: index * 0.02 }}
          >
            <ProductCard {...commonProps} />
          </motion.div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <Navbar />

      <div className="pt-24 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header with Psychology: Value proposition */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <span>Shop</span>
              {selectedCategory && (
                <>
                  <span>/</span>
                  <span className="text-foreground font-medium">{selectedCategory.name}</span>
                </>
              )}
            </div>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">
                  {selectedCategory ? selectedCategory.name : 'All Products'}
                </h1>
                <p className="text-muted-foreground">
                  {selectedCategory
                    ? selectedCategory.description
                    : 'Explore our curated collection of premium products'}
                </p>
              </div>
              {/* Psychology: Social proof & trust */}
              <div className="flex flex-wrap gap-3">
                <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span className="font-medium">50K+</span> Happy Customers
                </Badge>
                <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-success" />
                  Verified Vendors
                </Badge>
              </div>
            </div>
          </motion.div>

          {/* Toolbar */}
          <div className="flex flex-col lg:flex-row gap-4 mb-8">
            {/* Algolia Search */}
            <AlgoliaSearchBox 
              onSearch={setSearchQuery}
              placeholder="Search products..."
              className="flex-1 max-w-md"
            />

            {/* Category Filter */}
            <div className="flex-1 overflow-x-auto scrollbar-hide pb-2 lg:pb-0">
              {!categoriesLoading && (
                <CategoryFilter
                  categories={categories}
                  selectedCategory={categorySlug}
                  onSelectCategory={handleCategoryChange}
                />
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              {/* Sort */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    {sortOptions.find(o => o.value === sortBy)?.label}
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {sortOptions.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => setSortBy(option.value)}
                      className={sortBy === option.value ? 'bg-accent/10' : ''}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* View Mode Toggle */}
              <ViewModeToggle 
                viewMode={viewMode} 
                onViewModeChange={setViewMode}
                className="hidden md:flex"
              />

              {/* Mobile Filters */}
              <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="gap-2 lg:hidden relative">
                    <SlidersHorizontal className="w-4 h-4" />
                    Filters
                    {activeFiltersCount > 0 && (
                      <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center">
                        {activeFiltersCount}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Filters</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    <FilterContent />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* Mobile View Mode Toggle */}
          <div className="md:hidden mb-4">
            <ViewModeToggle 
              viewMode={viewMode} 
              onViewModeChange={setViewMode}
              showLabels
            />
          </div>

          <div className="flex gap-8">
            {/* Desktop Sidebar */}
            <motion.aside
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="hidden lg:block w-64 shrink-0"
            >
              <div className="glass rounded-2xl p-6 sticky top-24">
                <h3 className="font-semibold mb-6">Filters</h3>
                <FilterContent />
              </div>
            </motion.aside>

            {/* Products Grid */}
            <div className="flex-1">
              {productsLoading ? (
                <ProductGridSkeleton count={viewMode === 'compact' ? 12 : 8} viewMode={viewMode} />
              ) : displayProducts.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20"
                >
                  <motion.div 
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring" }}
                    className="w-24 h-24 rounded-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mx-auto mb-4"
                  >
                    <Search className="w-10 h-10 text-muted-foreground" />
                  </motion.div>
                  <h3 className="text-xl font-bold mb-2">No products found</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Try adjusting your search or filters to discover amazing products from our verified vendors.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button onClick={clearFilters} className="gap-2">
                      <Sparkles className="w-4 h-4" /> Clear Filters
                    </Button>
                    <Button variant="outline" onClick={() => handleCategoryChange(null)} className="gap-2">
                      <TrendingUp className="w-4 h-4" /> Browse All
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-6">
                    Showing {displayProducts.length} products
                    {urlSearchQuery && algoliaResults && (
                      <span className="ml-2 text-accent font-medium">
                        ⚡ Powered by Algolia ({algoliaResults.processingTimeMS}ms)
                      </span>
                    )}
                  </p>
                  <div className={`grid gap-4 md:gap-6 ${getGridClasses(viewMode)}`}>
                    <AnimatePresence mode="popLayout">
                      {displayProducts.map((product, index) => renderProduct(product, index))}
                    </AnimatePresence>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation for Mobile */}
      <BottomNavigation />
    </div>
  );
}
