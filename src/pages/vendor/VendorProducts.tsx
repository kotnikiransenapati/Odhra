import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { haptic } from '@/lib/haptics';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVendorId } from '@/hooks/useVendorDashboard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { BulkProductUpload } from '@/components/vendor/BulkProductUpload';
import { PDFProductUpload } from '@/components/vendor/PDFProductUpload';
import { PDFImageCatalogUpload } from '@/components/vendor/PDFImageCatalogUpload';
import {
  ArrowLeft,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Eye,
  Trash2,
  Package,
  AlertTriangle,
  Upload,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function VendorProducts() {
  const { data: vendorId, isLoading: vendorLoading } = useVendorId();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('q') || '';
  const statusFilter = searchParams.get('status') || 'all';
  const setSearch = (v: string) => {
    const p = new URLSearchParams(searchParams);
    if (v) p.set('q', v); else p.delete('q');
    setSearchParams(p, { replace: true });
  };
  const setStatusFilter = (v: string) => {
    haptic('light');
    const p = new URLSearchParams(searchParams);
    if (v && v !== 'all') p.set('status', v); else p.delete('status');
    setSearchParams(p, { replace: true });
  };

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['vendor-products', vendorId],
    queryFn: async () => {
      if (!vendorId) return [];
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          product_images (url, is_primary),
          categories (name)
        `)
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!vendorId,
  });

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (statusFilter === 'active') return p.is_active;
    if (statusFilter === 'draft') return !p.is_active;
    if (statusFilter === 'low-stock') return p.stock <= (p.low_stock_threshold || 5);
    return true;
  });

  const statusChips = [
    { key: 'all', label: 'All', count: products.length },
    { key: 'active', label: 'Active', count: products.filter((p) => p.is_active).length },
    { key: 'draft', label: 'Draft', count: products.filter((p) => !p.is_active).length },
    {
      key: 'low-stock',
      label: 'Low stock',
      count: products.filter((p) => p.stock <= (p.low_stock_threshold || 5)).length,
    },
  ];

  if (vendorLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <a href="#vendor-products-main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-accent focus:text-accent-foreground focus:shadow-lg">Skip to main content</a>
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="min-h-11 min-w-11" asChild>
              <Link to="/vendor" aria-label="Back to vendor dashboard"><ArrowLeft className="w-5 h-5" /></Link>
            </Button>
            <div>
              <h1 className="font-bold text-lg">Products</h1>
              <p className="text-xs text-muted-foreground">Manage your product catalog</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Bulk Upload Dialog */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Upload className="w-4 h-4" /> Bulk Upload
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Bulk Product Upload</DialogTitle>
                  <DialogDescription>
                    Upload multiple products at once using CSV or PDF files
                  </DialogDescription>
                </DialogHeader>
                <Tabs defaultValue="csv" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="csv" className="gap-2">
                      <FileSpreadsheet className="w-4 h-4" />
                      CSV
                    </TabsTrigger>
                    <TabsTrigger value="pdf" className="gap-2">
                      <FileText className="w-4 h-4" />
                      PDF Text
                    </TabsTrigger>
                    <TabsTrigger value="pdf-images" className="gap-2">
                      <ImageIcon className="w-4 h-4" />
                      PDF Images
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="csv" className="mt-4">
                    <BulkProductUpload />
                  </TabsContent>
                  <TabsContent value="pdf" className="mt-4">
                    <PDFProductUpload />
                  </TabsContent>
                  <TabsContent value="pdf-images" className="mt-4">
                    <PDFImageCatalogUpload />
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
            <Button className="gap-2" asChild>
              <Link to="/vendor/products/new">
                <Plus className="w-4 h-4" /> Add Product
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main id="vendor-products-main" tabIndex={-1} className="max-w-7xl mx-auto px-4 py-8 focus:outline-none" aria-labelledby="vendor-products-heading">
        <h2 id="vendor-products-heading" className="sr-only">Product catalog</h2>
        {/* Search & Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 space-y-3 sticky top-[73px] z-40 bg-background/80 backdrop-blur-sm py-3 -mx-4 px-4"
        >
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide" role="tablist" aria-label="Filter by status">
            {statusChips.map((chip) => {
              const active = statusFilter === chip.key;
              return (
                <button
                  key={chip.key}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setStatusFilter(chip.key)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {chip.label}
                  <span className="ml-1.5 opacity-70">{chip.count}</span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Products Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-0">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-16">
                  <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No products found</h3>
                  <p className="text-muted-foreground mb-4">
                    {search ? 'Try a different search term' : 'Start by adding your first product'}
                  </p>
                  <Button asChild>
                    <Link to="/vendor/products/new">
                      <Plus className="w-4 h-4 mr-2" /> Add Product
                    </Link>
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">Image</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => {
                      const primaryImage = product.product_images?.find((img: { is_primary: boolean }) => img.is_primary)?.url
                        || product.product_images?.[0]?.url;
                      const isLowStock = product.stock <= (product.low_stock_threshold || 5);

                      return (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden">
                              {primaryImage ? (
                                <img src={primaryImage} alt={product.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package className="w-5 h-5 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium line-clamp-1">{product.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {product.categories?.name || 'Uncategorized'}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {product.sku || '-'}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-semibold">₹{product.price.toLocaleString()}</p>
                              {product.compare_at_price && (
                                <p className="text-xs text-muted-foreground line-through">
                                  ₹{product.compare_at_price.toLocaleString()}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className={isLowStock ? 'text-destructive font-medium' : ''}>
                                {product.stock}
                              </span>
                              {isLowStock && (
                                <AlertTriangle className="w-4 h-4 text-destructive" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={product.is_active ? 'default' : 'secondary'}>
                              {product.is_active ? 'Active' : 'Draft'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link to={`/product/${product.slug}`}>
                                    <Eye className="w-4 h-4 mr-2" /> View
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link to={`/vendor/products/${product.id}/edit`}>
                                    <Edit className="w-4 h-4 mr-2" /> Edit
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive">
                                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
