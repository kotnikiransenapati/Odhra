import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Package, X, Check } from 'lucide-react';

interface ProductPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
}

export function ProductPickerDialog({
  open,
  onOpenChange,
  selectedIds,
  onSelect,
}: ProductPickerDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [localSelected, setLocalSelected] = useState<Set<string>>(new Set(selectedIds));

  // Sync with external selection when dialog opens
  React.useEffect(() => {
    if (open) {
      setLocalSelected(new Set(selectedIds));
    }
  }, [open, selectedIds]);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['admin-products-picker'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          title,
          slug,
          price,
          stock,
          is_active,
          product_images (url, is_primary),
          vendors_public!inner (brand_name),
          categories (name)
        `)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    
    const query = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.title.toLowerCase().includes(query) ||
        (p.vendors_public as any)?.brand_name?.toLowerCase().includes(query) ||
        (p.categories as any)?.name?.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  const handleToggle = (productId: string) => {
    const newSet = new Set(localSelected);
    if (newSet.has(productId)) {
      newSet.delete(productId);
    } else {
      newSet.add(productId);
    }
    setLocalSelected(newSet);
  };

  const handleConfirm = () => {
    onSelect(Array.from(localSelected));
    onOpenChange(false);
  };

  const handleClear = () => {
    setLocalSelected(new Set());
  };

  const getProductImage = (product: any) => {
    const images = product.product_images || [];
    const primary = images.find((img: any) => img.is_primary);
    return primary?.url || images[0]?.url || null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Products</DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products by name, vendor, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Selected count */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {localSelected.size} product{localSelected.size !== 1 ? 's' : ''} selected
          </span>
          {localSelected.size > 0 && (
            <Button variant="ghost" size="sm" onClick={handleClear} className="gap-1">
              <X className="w-3 h-3" />
              Clear All
            </Button>
          )}
        </div>

        {/* Product list */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? 'No products match your search' : 'No products available'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredProducts.map((product) => {
                const isSelected = localSelected.has(product.id);
                const imageUrl = getProductImage(product);

                return (
                  <div
                    key={product.id}
                    onClick={() => handleToggle(product.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-accent bg-accent/5'
                        : 'border-border hover:border-accent/50 hover:bg-muted/50'
                    }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggle(product.id)}
                      onClick={(e) => e.stopPropagation()}
                    />

                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={product.title}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                        <Package className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{product.title}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{(product.vendors_public as any)?.brand_name}</span>
                        {(product.categories as any)?.name && (
                          <>
                            <span>•</span>
                            <span>{(product.categories as any).name}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-semibold">₹{product.price.toLocaleString()}</p>
                      <Badge
                        variant={product.is_active && product.stock > 0 ? 'secondary' : 'outline'}
                        className="text-xs"
                      >
                        {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} className="gap-2">
            <Check className="w-4 h-4" />
            Add {localSelected.size} Product{localSelected.size !== 1 ? 's' : ''}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
