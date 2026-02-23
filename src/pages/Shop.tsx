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
  ChevronLeft,
  ChevronRight,
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
import { usePaginatedProducts, useCategories } from '@/hooks/useProducts';
import { useAlgoliaSearch } from '@/hooks/useAlgoliaSearch';
import { ProductGridSkeleton } from '@/components/shop/ProductGridSkeleton';
import { useViewMode, getGridClasses } from '@/hooks/useViewMode';
import { SEOHead } from '@/components/SEOHead';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';
import { useQueryClient } from '@tanstack/react-query';

type SortOption = 'newest' | 'price-asc' | 'price-desc' | 'popular' | 'rating';
type RatingFilter = 0 | 3 | 4 | 4.5;
const PAGE_SIZE = 24;

const sortOptions: { value: SortOption; label: string; icon?: React.ReactNode }[] = [
  { value: 'newest', label: 'Newest First', icon: <Sparkles className="w-4 h-4" /> },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'popular', label: 'Most Popular', icon: <TrendingUp className="w-4 h-4" /> },
  { value: 'rating', label: 'Highest Rated', icon: <Star className="w-4 h-4" /> },
];

export default function Shop() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const categorySlug = searchParams.get('category');
  const urlSearchQuery = searchParams.get('search') || '';
  const urlPage = parseInt(searchParams.get('page') || '1', 10);
  const [searchQuery, setSearchQuery] = useState(urlSearchQuery);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const { viewMode, setViewMode } = useViewMode('list', { pageKey: 'shop' });
  const [priceRange, setPriceRange] = useState([0, 50000]);
  const [showFeatured, setShowFeatured] = useState(false);
  const [showInStock, setShowInStock] = useState(false);
  const [minRating, setMinRating] = useState<RatingFilter>(0);
  const [filterOpen, setFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(urlPage);

  useEffect(() => { setSearchQuery(urlSearchQuery); }, [urlSearchQuery]);
  useEffect(() => { setCurrentPage(urlPage); }, [urlPage]);

  // Reset page on filter/sort change
  useEffect(() => { setCurrentPage(1); }, [categorySlug, sortBy, showFeatured, searchQuery]);

  const { results: algoliaResults, isLoading: algoliaLoading, setQuery: setAlgoliaQuery } = useAlgoliaSearch();
  useEffect(() => { if (urlSearchQuery) setAlgoliaQuery(urlSearchQuery); }, [urlSearchQuery, setAlgoliaQuery]);

  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const { data: paginatedData, isLoading: productsLoading } = usePaginatedProducts({
    categorySlug,
    searchQuery: searchQuery || undefined,
    featured: showFeatured || undefined,
    sortBy: sortBy as any,
    page: currentPage,
    pageSize: PAGE_SIZE,
  });

  const products = paginatedData?.products || [];
  const totalCount = paginatedData?.totalCount || 0;
  const totalPages = paginatedData?.totalPages || 1;

  const { isRefreshing, pullDistance } = usePullToRefresh({
    onRefresh: async () => {
      await queryClient.invalidateQueries({ queryKey: ['products-paginated'] });
    },
  });

  const displayProducts = useMemo(() => {
    if (urlSearchQuery && algoliaResults && algoliaResults.hits.length > 0) {
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
    let result = [...products];
    result = result.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1]);
    if (showInStock) result = result.filter(p => p.stock > 0);
    if (minRating > 0) result = result.filter(p => (p.avg_rating || 0) >= minRating);
    return result;
  }, [products, priceRange, showInStock, urlSearchQuery, algoliaResults]);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    const params = new URLSearchParams(searchParams);
    if (page > 1) params.set('page', String(page));
    else params.delete('page');
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCategoryChange = (slug: string | null) => {
    const params = new URLSearchParams();
    if (slug) params.set('category', slug);
    params.delete('page');
    setSearchParams(params);
  };

  const clearFilters = () => {
    setPriceRange([0, 50000]);
    setShowFeatured(false);
    setShowInStock(false);
    setMinRating(0);
    setSortBy('newest');
    setSearchQuery('');
    setSearchParams({});
  };

  const activeFiltersCount = [categorySlug, priceRange[0] > 0 || priceRange[1] < 50000, showFeatured, showInStock, minRating > 0, searchQuery].filter(Boolean).length;
  const selectedCategory = categories.find(c => c.slug === categorySlug);

  const FilterContent = () => (
    <div className="space-y-6">
      <div>
        <h4 className="font-medium mb-4">Price Range</h4>
        <Slider value={priceRange} min={0} max={50000} step={500} onValueChange={setPriceRange} className="mb-4" />
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>₹{priceRange[0].toLocaleString()}</span>
          <span>₹{priceRange[1].toLocaleString()}</span>
        </div>
      </div>
      <Separator />
      <div className="space-y-4">
        <h4 className="font-medium">Filters</h4>
        <div className="flex items-center space-x-2">
          <Checkbox id="featured" checked={showFeatured} onCheckedChange={(checked) => setShowFeatured(checked as boolean)} />
          <Label htmlFor="featured" className="text-sm cursor-pointer">Featured Only</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="instock" checked={showInStock} onCheckedChange={(checked) => setShowInStock(checked as boolean)} />
          <Label htmlFor="instock" className="text-sm cursor-pointer">In Stock Only</Label>
        </div>
        </div>
        <Separator />
        <div className="space-y-3">
          <h4 className="font-medium">Minimum Rating</h4>
          <div className="flex flex-wrap gap-2">
            {([0, 3, 4, 4.5] as RatingFilter[]).map(r => (
              <Button
                key={r}
                variant={minRating === r ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMinRating(r)}
                className="gap-1"
              >
                {r === 0 ? 'All' : <><Star className="w-3 h-3 fill-current" />{r}+</>}
              </Button>
            ))}
          </div>
        </div>
      {activeFiltersCount > 0 && (
        <Button variant="outline" onClick={clearFilters} className="w-full">Clear All Filters</Button>
      )}
    </div>
  );

  const renderProduct = (product: typeof displayProducts[0], index: number) => {
    const primaryImage = product.product_images?.find(img => img.is_primary);
    const commonProps = {
      id: product.id, title: product.title, slug: product.slug, price: product.price,
      compareAtPrice: product.compare_at_price, imageUrl: primaryImage?.url,
      rating: product.avg_rating || 0, reviewCount: product.review_count || 0,
      vendorName: product.vendors_public?.brand_name, vendorSlug: product.vendors_public?.slug, isFeatured: product.is_featured, stock: product.stock,
    };
    switch (viewMode) {
      case 'compact': return <ProductCompactCard key={product.id} {...commonProps} />;
      case 'list': return <ProductListCard key={product.id} {...commonProps} description={product.description} />;
      default: return (
        <motion.div key={product.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ delay: index * 0.02 }}>
          <ProductCard {...commonProps} />
        </motion.div>
      );
    }
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('ellipsis');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />
      <SEOHead
        title={selectedCategory ? selectedCategory.name : 'Shop All Products'}
        description={selectedCategory?.description || 'Explore our curated collection of premium products from 500+ verified vendors.'}
        keywords="shop, products, online shopping, premium, curated"
      />
      <Navbar />

      <main className="pt-4 sm:pt-6 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
              <span>Shop</span>
              {selectedCategory && (<><span className="text-border">/</span><span className="text-foreground font-medium">{selectedCategory.name}</span></>)}
            </div>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-display font-bold mb-1.5 tracking-tight">
                  {selectedCategory ? selectedCategory.name : 'All Products'}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {selectedCategory ? selectedCategory.description : 'Explore our curated collection of premium products'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs">
                  <Users className="w-3 h-3" /><span className="font-semibold">50K+</span> Customers
                </Badge>
                <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs">
                  <ShieldCheck className="w-3 h-3 text-success" />Verified
                </Badge>
              </div>
            </div>
          </motion.div>

          {/* Toolbar */}
          <div className="flex flex-col lg:flex-row gap-4 mb-8">
            <AlgoliaSearchBox onSearch={setSearchQuery} placeholder="Search products..." className="flex-1 max-w-md" />
            <div className="flex-1 overflow-x-auto scrollbar-hide pb-2 lg:pb-0">
              {!categoriesLoading && <CategoryFilter categories={categories} selectedCategory={categorySlug} onSelectCategory={handleCategoryChange} />}
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">{sortOptions.find(o => o.value === sortBy)?.label}<ChevronDown className="w-4 h-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {sortOptions.map((option) => (
                    <DropdownMenuItem key={option.value} onClick={() => setSortBy(option.value)} className={sortBy === option.value ? 'bg-accent/10' : ''}>{option.label}</DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} className="hidden md:flex" />
              <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="gap-2 lg:hidden relative">
                    <SlidersHorizontal className="w-4 h-4" />Filters
                    {activeFiltersCount > 0 && <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center">{activeFiltersCount}</Badge>}
                  </Button>
                </SheetTrigger>
                <SheetContent><SheetHeader><SheetTitle>Filters</SheetTitle></SheetHeader><div className="mt-6"><FilterContent /></div></SheetContent>
              </Sheet>
            </div>
          </div>

          <div className="md:hidden mb-4"><ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} showLabels /></div>

          <div className="flex gap-8">
            <motion.aside initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="hidden lg:block w-64 shrink-0">
              <div className="rounded-2xl border border-border/40 bg-card p-6 sticky top-24">
                <h3 className="font-display font-semibold mb-6 text-sm">Filters</h3>
                <FilterContent />
              </div>
            </motion.aside>

            <div className="flex-1">
              {productsLoading ? (
                <ProductGridSkeleton count={viewMode === 'compact' ? 12 : 8} viewMode={viewMode} />
              ) : displayProducts.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
                  <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: "spring" }} className="w-24 h-24 rounded-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mx-auto mb-4">
                    <Search className="w-10 h-10 text-muted-foreground" />
                  </motion.div>
                  <h3 className="text-xl font-bold mb-2">No products found</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">Try adjusting your search or filters to discover amazing products.</p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button onClick={clearFilters} className="gap-2"><Sparkles className="w-4 h-4" /> Clear Filters</Button>
                    <Button variant="outline" onClick={() => handleCategoryChange(null)} className="gap-2"><TrendingUp className="w-4 h-4" /> Browse All</Button>
                  </div>
                </motion.div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-6">
                    Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount} products
                    {urlSearchQuery && algoliaResults && (
                      <span className="ml-2 text-accent font-medium">⚡ Powered by Algolia ({algoliaResults.processingTimeMS}ms)</span>
                    )}
                  </p>
                  <div className={`grid gap-4 md:gap-6 ${getGridClasses(viewMode)}`}>
                    <AnimatePresence mode="popLayout">
                      {displayProducts.map((product, index) => renderProduct(product, index))}
                    </AnimatePresence>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <nav aria-label="Pagination" className="flex items-center justify-center gap-1 mt-10">
                      <Button variant="outline" size="icon" onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1} aria-label="Previous page">
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      {getPageNumbers().map((p, i) =>
                        p === 'ellipsis' ? (
                          <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground">…</span>
                        ) : (
                          <Button key={p} variant={currentPage === p ? 'default' : 'outline'} size="icon" onClick={() => goToPage(p)} aria-current={currentPage === p ? 'page' : undefined} className="w-10 h-10">
                            {p}
                          </Button>
                        )
                      )}
                      <Button variant="outline" size="icon" onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= totalPages} aria-label="Next page">
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </nav>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}
