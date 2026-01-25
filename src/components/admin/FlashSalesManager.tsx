import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit, Zap, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ProductPickerDialog } from './ProductPickerDialog';

interface FlashSale {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  banner_url: string | null;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  max_quantity_per_user: number;
}

interface FlashSaleProduct {
  id: string;
  flash_sale_id: string;
  product_id: string;
  flash_price: number;
  original_price: number;
  quantity_available: number;
  quantity_sold: number;
  product?: { title: string };
}

export function FlashSalesManager() {
  const [sales, setSales] = useState<FlashSale[]>([]);
  const [selectedSale, setSelectedSale] = useState<FlashSale | null>(null);
  const [saleProducts, setSaleProducts] = useState<FlashSaleProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    starts_at: '',
    ends_at: '',
    max_quantity_per_user: 2,
    is_active: true,
  });

  const fetchSales = async () => {
    const { data, error } = await supabase
      .from('flash_sales')
      .select('*')
      .order('starts_at', { ascending: false });

    if (!error && data) {
      setSales(data);
    }
    setIsLoading(false);
  };

  const fetchSaleProducts = async (saleId: string) => {
    const { data, error } = await supabase
      .from('flash_sale_products')
      .select('*, product:products(title)')
      .eq('flash_sale_id', saleId);

    if (!error && data) {
      setSaleProducts(data as FlashSaleProduct[]);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  useEffect(() => {
    if (selectedSale) {
      fetchSaleProducts(selectedSale.id);
    }
  }, [selectedSale]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const slug = formData.slug || formData.title.toLowerCase().replace(/\s+/g, '-');
    
    const { error } = await supabase
      .from('flash_sales')
      .insert({
        ...formData,
        slug,
      });

    if (error) {
      toast.error('Failed to create flash sale');
      return;
    }

    toast.success('Flash sale created!');
    setIsDialogOpen(false);
    setFormData({
      title: '',
      slug: '',
      description: '',
      starts_at: '',
      ends_at: '',
      max_quantity_per_user: 2,
      is_active: true,
    });
    fetchSales();
  };

  const toggleActive = async (sale: FlashSale) => {
    const { error } = await supabase
      .from('flash_sales')
      .update({ is_active: !sale.is_active })
      .eq('id', sale.id);

    if (!error) {
      toast.success(sale.is_active ? 'Sale deactivated' : 'Sale activated');
      fetchSales();
    }
  };

  const deleteSale = async (id: string) => {
    if (!confirm('Delete this flash sale?')) return;

    const { error } = await supabase
      .from('flash_sales')
      .delete()
      .eq('id', id);

    if (!error) {
      toast.success('Flash sale deleted');
      fetchSales();
      if (selectedSale?.id === id) {
        setSelectedSale(null);
      }
    }
  };

  const addProductToSale = async (product: any, flashPrice: number, quantity: number) => {
    if (!selectedSale) return;

    const { error } = await supabase
      .from('flash_sale_products')
      .insert({
        flash_sale_id: selectedSale.id,
        product_id: product.id,
        flash_price: flashPrice,
        original_price: product.price,
        quantity_available: quantity,
      });

    if (error) {
      toast.error('Failed to add product');
      return;
    }

    toast.success('Product added to sale');
    fetchSaleProducts(selectedSale.id);
    setIsProductDialogOpen(false);
  };

  const removeProductFromSale = async (productId: string) => {
    const { error } = await supabase
      .from('flash_sale_products')
      .delete()
      .eq('id', productId);

    if (!error && selectedSale) {
      toast.success('Product removed');
      fetchSaleProducts(selectedSale.id);
    }
  };

  const getSaleStatus = (sale: FlashSale) => {
    const now = new Date();
    const start = new Date(sale.starts_at);
    const end = new Date(sale.ends_at);

    if (!sale.is_active) return { label: 'Inactive', variant: 'secondary' as const };
    if (now < start) return { label: 'Scheduled', variant: 'outline' as const };
    if (now > end) return { label: 'Ended', variant: 'destructive' as const };
    return { label: 'Live', variant: 'default' as const };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-destructive" />
            Flash Sales Manager
          </h2>
          <p className="text-muted-foreground">
            Create time-limited sales with special pricing
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Flash Sale
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Flash Sale</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date/Time</Label>
                  <Input
                    type="datetime-local"
                    value={formData.starts_at}
                    onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>End Date/Time</Label>
                  <Input
                    type="datetime-local"
                    value={formData.ends_at}
                    onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <Label>Max Quantity Per User</Label>
                <Input
                  type="number"
                  min={1}
                  value={formData.max_quantity_per_user}
                  onChange={(e) => setFormData({ ...formData, max_quantity_per_user: parseInt(e.target.value) })}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label>Active</Label>
              </div>
              <Button type="submit" className="w-full">Create Sale</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Sales List */}
        <Card>
          <CardHeader>
            <CardTitle>All Flash Sales</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : sales.length === 0 ? (
              <p className="text-muted-foreground">No flash sales yet</p>
            ) : (
              <div className="space-y-2">
                {sales.map((sale) => {
                  const status = getSaleStatus(sale);
                  return (
                    <div
                      key={sale.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedSale?.id === sale.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedSale(sale)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{sale.title}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(sale.starts_at), 'MMM d, h:mm a')} - {format(new Date(sale.ends_at), 'MMM d, h:mm a')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={status.variant}>{status.label}</Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSale(sale.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sale Products */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedSale ? `Products in "${selectedSale.title}"` : 'Select a Sale'}
            </CardTitle>
            {selectedSale && (
              <Button size="sm" onClick={() => setIsProductDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Product
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {!selectedSale ? (
              <p className="text-muted-foreground">Select a flash sale to manage products</p>
            ) : saleProducts.length === 0 ? (
              <p className="text-muted-foreground">No products in this sale</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Flash Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Sold</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {saleProducts.map((sp) => (
                    <TableRow key={sp.id}>
                      <TableCell className="font-medium">{sp.product?.title}</TableCell>
                      <TableCell>
                        <span className="text-destructive font-medium">₹{sp.flash_price}</span>
                        <span className="text-muted-foreground line-through ml-2 text-sm">
                          ₹{sp.original_price}
                        </span>
                      </TableCell>
                      <TableCell>{sp.quantity_available}</TableCell>
                      <TableCell>{sp.quantity_sold}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeProductFromSale(sp.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Product Picker */}
      <FlashProductPickerDialog
        open={isProductDialogOpen}
        onOpenChange={setIsProductDialogOpen}
        onAddProduct={addProductToSale}
      />
    </div>
  );
}

// Custom product picker for flash sales
function FlashProductPickerDialog({ 
  open, 
  onOpenChange, 
  onAddProduct 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  onAddProduct: (product: any, flashPrice: number, quantity: number) => void;
}) {
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [flashPrices, setFlashPrices] = useState<Record<string, number>>({});
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const handleConfirm = async () => {
    // Fetch product details
    const { data: products } = await supabase
      .from('products')
      .select('id, title, price')
      .in('id', selectedProductIds);

    if (products) {
      for (const product of products) {
        const flashPrice = flashPrices[product.id] || Math.round(product.price * 0.7);
        const quantity = quantities[product.id] || 50;
        onAddProduct(product, flashPrice, quantity);
      }
    }
    setSelectedProductIds([]);
    setFlashPrices({});
    setQuantities({});
    onOpenChange(false);
  };

  return (
    <ProductPickerDialog
      open={open}
      onOpenChange={onOpenChange}
      selectedIds={selectedProductIds}
      onSelect={(ids) => {
        setSelectedProductIds(ids);
        // Auto-confirm for simplicity
        handleConfirm();
      }}
    />
  );
}
