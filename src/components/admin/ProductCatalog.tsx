import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Package,
  Search,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Star,
  Store,
  Loader2,
  ImageIcon,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

interface Product {
  id: string;
  title: string;
  slug: string;
  price: number;
  compare_at_price: number | null;
  stock: number;
  is_active: boolean;
  is_featured: boolean;
  avg_rating: number;
  review_count: number;
  sold_count: number;
  view_count: number;
  created_at: string;
  vendor_id: string;
  vendor_name?: string;
  primary_image?: string;
}

export function ProductCatalog() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'featured' | 'low-stock'>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const { data: products, isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          product_images (url, is_primary)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const vendorIds = [...new Set(data?.map(p => p.vendor_id) || [])];
      const { data: vendors } = await supabase
        .from('vendors')
        .select('id, brand_name')
        .in('id', vendorIds);

      return (data || []).map(product => {
        const vendor = vendors?.find(v => v.id === product.vendor_id);
        const primaryImage = product.product_images?.find((img: any) => img.is_primary) || product.product_images?.[0];
        return {
          ...product,
          vendor_name: vendor?.brand_name || 'Unknown',
          primary_image: primaryImage?.url,
        };
      });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ productId, isActive }: { productId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('products')
        .update({ is_active: isActive })
        .eq('id', productId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Product updated');
    },
  });

  const toggleFeatured = useMutation({
    mutationFn: async ({ productId, isFeatured }: { productId: string; isFeatured: boolean }) => {
      const { error } = await supabase
        .from('products')
        .update({ is_featured: isFeatured })
        .eq('id', productId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Product updated');
    },
  });

  const filteredProducts = products?.filter((product) => {
    const matchesSearch =
      product.title.toLowerCase().includes(search.toLowerCase()) ||
      product.vendor_name?.toLowerCase().includes(search.toLowerCase());

    if (filter === 'active') return matchesSearch && product.is_active;
    if (filter === 'inactive') return matchesSearch && !product.is_active;
    if (filter === 'featured') return matchesSearch && product.is_featured;
    if (filter === 'low-stock') return matchesSearch && product.stock < 10;
    return matchesSearch;
  });

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Products', value: products?.length || 0, icon: Package, color: 'text-blue-500' },
          { label: 'Active', value: products?.filter(p => p.is_active).length || 0, icon: TrendingUp, color: 'text-green-500' },
          { label: 'Featured', value: products?.filter(p => p.is_featured).length || 0, icon: Star, color: 'text-yellow-500' },
          { label: 'Low Stock', value: products?.filter(p => p.stock < 10).length || 0, icon: TrendingDown, color: 'text-red-500' },
        ].map((stat, i) => (
          <Card key={i} className="glass">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-secondary flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['all', 'active', 'inactive', 'featured', 'low-stock'] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
              className="capitalize"
            >
              {f.replace('-', ' ')}
            </Button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Products ({filteredProducts?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts?.map((product, index) => (
                  <motion.tr
                    key={product.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="border-b border-border"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden">
                          {product.primary_image ? (
                            <img
                              src={product.primary_image}
                              alt={product.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="max-w-[200px]">
                          <p className="font-medium truncate">{product.title}</p>
                          <p className="text-xs text-muted-foreground">{product.sold_count} sold</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{product.vendor_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{formatPrice(product.price)}</p>
                        {product.compare_at_price && (
                          <p className="text-xs text-muted-foreground line-through">
                            {formatPrice(product.compare_at_price)}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.stock < 10 ? 'destructive' : 'outline'}>
                        {product.stock}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span>{(product.avg_rating || 0).toFixed(1)}</span>
                        <span className="text-xs text-muted-foreground">({product.review_count})</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {product.is_active ? (
                          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
                            Inactive
                          </Badge>
                        )}
                        {product.is_featured && (
                          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                            Featured
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedProduct(product)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleFeatured.mutate({ productId: product.id, isFeatured: !product.is_featured })}>
                            <Star className="w-4 h-4 mr-2" />
                            {product.is_featured ? 'Remove Featured' : 'Make Featured'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleActive.mutate({ productId: product.id, isActive: !product.is_active })}>
                            {product.is_active ? (
                              <>
                                <TrendingDown className="w-4 h-4 mr-2" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <TrendingUp className="w-4 h-4 mr-2" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Product Detail Dialog */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="aspect-square rounded-xl bg-muted overflow-hidden">
                {selectedProduct.primary_image ? (
                  <img
                    src={selectedProduct.primary_image}
                    alt={selectedProduct.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold">{selectedProduct.title}</h3>
                  <p className="text-sm text-muted-foreground">by {selectedProduct.vendor_name}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <p className="text-muted-foreground">Price</p>
                    <p className="font-bold">{formatPrice(selectedProduct.price)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <p className="text-muted-foreground">Stock</p>
                    <p className="font-bold">{selectedProduct.stock}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <p className="text-muted-foreground">Sold</p>
                    <p className="font-bold">{selectedProduct.sold_count || 0}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <p className="text-muted-foreground">Views</p>
                    <p className="font-bold">{selectedProduct.view_count || 0}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  <span className="font-bold">{(selectedProduct.avg_rating || 0).toFixed(1)}</span>
                  <span className="text-muted-foreground">({selectedProduct.review_count} reviews)</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedProduct(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
