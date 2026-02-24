import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Edit, Zap, Calendar, Loader2, Search, Clock, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

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
  per_user_limit: number | null;
  product?: { title: string; id: string };
}

export function FlashSalesManager() {
  const queryClient = useQueryClient();
  const [selectedSale, setSelectedSale] = useState<FlashSale | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [formData, setFormData] = useState({
    title: '', slug: '', description: '', starts_at: '', ends_at: '',
    max_quantity_per_user: 2, is_active: true,
  });

  // Product add form
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [flashPrice, setFlashPrice] = useState('');
  const [flashQty, setFlashQty] = useState('50');
  const [perUserLimit, setPerUserLimit] = useState('2');

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['admin-flash-sales'],
    queryFn: async () => {
      const { data, error } = await supabase.from('flash_sales').select('*').order('starts_at', { ascending: false });
      if (error) throw error;
      return data as FlashSale[];
    },
  });

  const { data: saleProducts = [] } = useQuery({
    queryKey: ['flash-sale-products', selectedSale?.id],
    queryFn: async () => {
      if (!selectedSale) return [];
      const { data, error } = await supabase
        .from('flash_sale_products')
        .select('*, product:products(id, title)')
        .eq('flash_sale_id', selectedSale.id);
      if (error) throw error;
      return data as FlashSaleProduct[];
    },
    enabled: !!selectedSale,
  });

  const { data: searchProducts = [] } = useQuery({
    queryKey: ['product-search-flash', productSearch],
    queryFn: async () => {
      if (!productSearch || productSearch.length < 2) return [];
      const { data } = await supabase
        .from('products')
        .select('id, title, price, stock')
        .ilike('title', `%${productSearch}%`)
        .eq('is_active', true)
        .limit(10);
      return data || [];
    },
    enabled: productSearch.length >= 2,
  });

  const createSale = useMutation({
    mutationFn: async (data: typeof formData) => {
      const slug = data.slug || data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const { error } = await supabase.from('flash_sales').insert({ ...data, slug });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-flash-sales'] });
      setIsCreateOpen(false);
      resetForm();
      toast.success('Flash sale created');
    },
    onError: () => toast.error('Failed to create flash sale'),
  });

  const updateSale = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<FlashSale>) => {
      const { error } = await supabase.from('flash_sales').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-flash-sales'] });
      setIsEditOpen(false);
      toast.success('Flash sale updated');
    },
    onError: () => toast.error('Failed to update'),
  });

  const deleteSale = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('flash_sale_products').delete().eq('flash_sale_id', id);
      const { error } = await supabase.from('flash_sales').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-flash-sales'] });
      if (selectedSale) setSelectedSale(null);
      toast.success('Flash sale deleted');
    },
  });

  const addProduct = useMutation({
    mutationFn: async () => {
      if (!selectedSale || !selectedProductId) throw new Error('Missing data');
      const product = searchProducts.find((p: any) => p.id === selectedProductId);
      if (!product) throw new Error('Product not found');

      const { error } = await supabase.from('flash_sale_products').insert({
        flash_sale_id: selectedSale.id,
        product_id: selectedProductId,
        flash_price: parseFloat(flashPrice) || Math.round(product.price * 0.7),
        original_price: product.price,
        quantity_available: parseInt(flashQty) || 50,
        per_user_limit: parseInt(perUserLimit) || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flash-sale-products', selectedSale?.id] });
      setIsAddProductOpen(false);
      setSelectedProductId(''); setFlashPrice(''); setProductSearch('');
      toast.success('Product added');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to add product'),
  });

  const removeProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('flash_sale_products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flash-sale-products', selectedSale?.id] });
      toast.success('Product removed');
    },
  });

  const resetForm = () => setFormData({ title: '', slug: '', description: '', starts_at: '', ends_at: '', max_quantity_per_user: 2, is_active: true });

  const openEdit = (sale: FlashSale) => {
    setFormData({
      title: sale.title, slug: sale.slug, description: sale.description || '',
      starts_at: sale.starts_at.slice(0, 16), ends_at: sale.ends_at.slice(0, 16),
      max_quantity_per_user: sale.max_quantity_per_user, is_active: sale.is_active,
    });
    setIsEditOpen(true);
  };

  const getSaleStatus = (sale: FlashSale) => {
    const now = new Date();
    const start = new Date(sale.starts_at);
    const end = new Date(sale.ends_at);
    if (!sale.is_active) return { label: 'Inactive', color: 'bg-muted text-muted-foreground', icon: XCircle };
    if (now < start) return { label: 'Scheduled', color: 'bg-info/10 text-info', icon: Clock };
    if (now > end) return { label: 'Ended', color: 'bg-destructive/10 text-destructive', icon: XCircle };
    return { label: 'Live', color: 'bg-success/10 text-success', icon: CheckCircle };
  };

  const filteredSales = sales.filter(sale => {
    if (statusFilter === 'all') return true;
    const status = getSaleStatus(sale);
    return status.label.toLowerCase() === statusFilter;
  });

  const formatPrice = (n: number) => `₹${n.toLocaleString()}`;

  const stats = {
    total: sales.length,
    live: sales.filter(s => getSaleStatus(s).label === 'Live').length,
    scheduled: sales.filter(s => getSaleStatus(s).label === 'Scheduled').length,
    totalProducts: saleProducts.length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-destructive" />Flash Sales Manager
          </h2>
          <p className="text-muted-foreground">Create and manage time-limited sales with special pricing</p>
        </div>
        <Button onClick={() => { resetForm(); setIsCreateOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />Create Flash Sale
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Sales', value: stats.total, icon: Zap, color: 'text-accent', bg: 'bg-accent/10' },
          { label: 'Live Now', value: stats.live, icon: CheckCircle, color: 'text-success', bg: 'bg-success/10' },
          { label: 'Scheduled', value: stats.scheduled, icon: Clock, color: 'text-info', bg: 'bg-info/10' },
          { label: 'Products', value: stats.totalProducts, icon: Calendar, color: 'text-primary', bg: 'bg-primary/10' },
        ].map((s, i) => (
          <Card key={i} className="glass">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${s.bg}`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
              <div><p className="text-2xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="live">Live</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="ended">Ended</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Sales List */}
        <Card className="glass">
          <CardHeader><CardTitle>All Flash Sales</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : filteredSales.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No flash sales found</p>
            ) : (
              <div className="space-y-2">
                {filteredSales.map((sale) => {
                  const status = getSaleStatus(sale);
                  const StatusIcon = status.icon;
                  return (
                    <div
                      key={sale.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedSale?.id === sale.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedSale(sale)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{sale.title}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(sale.starts_at), 'MMM d, h:mm a')} — {format(new Date(sale.ends_at), 'MMM d, h:mm a')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          <Badge className={`${status.color} gap-1`}><StatusIcon className="w-3 h-3" />{status.label}</Badge>
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEdit(sale); }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); if (confirm('Delete this flash sale?')) deleteSale.mutate(sale.id); }}>
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
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{selectedSale ? `Products in "${selectedSale.title}"` : 'Select a Sale'}</CardTitle>
            {selectedSale && (
              <Button size="sm" onClick={() => { setProductSearch(''); setSelectedProductId(''); setFlashPrice(''); setIsAddProductOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" />Add Product
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {!selectedSale ? (
              <p className="text-muted-foreground text-center py-8">Select a flash sale to manage products</p>
            ) : saleProducts.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No products in this sale</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Flash Price</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Sold</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {saleProducts.map((sp) => {
                    const discount = sp.original_price > 0 ? Math.round((1 - sp.flash_price / sp.original_price) * 100) : 0;
                    return (
                      <TableRow key={sp.id}>
                        <TableCell className="font-medium text-sm">{sp.product?.title}</TableCell>
                        <TableCell>
                          <span className="text-destructive font-semibold">{formatPrice(sp.flash_price)}</span>
                          <span className="text-muted-foreground line-through ml-1 text-xs">{formatPrice(sp.original_price)}</span>
                        </TableCell>
                        <TableCell><Badge variant="destructive" className="text-xs">{discount}% off</Badge></TableCell>
                        <TableCell>{sp.quantity_available - sp.quantity_sold}</TableCell>
                        <TableCell>
                          <span className="font-semibold">{sp.quantity_sold}</span>
                          <span className="text-muted-foreground text-xs">/{sp.quantity_available}</span>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => removeProduct.mutate(sp.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Sale Dialog */}
      <Dialog open={isCreateOpen || isEditOpen} onOpenChange={(open) => { if (!open) { setIsCreateOpen(false); setIsEditOpen(false); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditOpen ? 'Edit Flash Sale' : 'Create Flash Sale'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (isEditOpen && selectedSale) {
              updateSale.mutate({ id: selectedSale.id, ...formData, slug: formData.slug || formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') });
            } else {
              createSale.mutate(formData);
            }
          }} className="space-y-4">
            <div><Label>Title</Label><Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required /></div>
            <div><Label>Description</Label><Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Start Date/Time</Label><Input type="datetime-local" value={formData.starts_at} onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })} required /></div>
              <div><Label>End Date/Time</Label><Input type="datetime-local" value={formData.ends_at} onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })} required /></div>
            </div>
            <div><Label>Max Quantity Per User</Label><Input type="number" min={1} value={formData.max_quantity_per_user} onChange={(e) => setFormData({ ...formData, max_quantity_per_user: parseInt(e.target.value) || 1 })} /></div>
            <div className="flex items-center gap-2">
              <Switch checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />
              <Label>Active</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsCreateOpen(false); setIsEditOpen(false); }}>Cancel</Button>
              <Button type="submit" disabled={createSale.isPending || updateSale.isPending}>
                {(createSale.isPending || updateSale.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isEditOpen ? 'Save Changes' : 'Create Sale'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Product Dialog */}
      <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Product to Sale</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Search Product</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Type product name..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className="pl-9" />
              </div>
              {searchProducts.length > 0 && (
                <div className="mt-2 border rounded-lg max-h-[150px] overflow-y-auto">
                  {searchProducts.map((p: any) => (
                    <div
                      key={p.id}
                      className={`p-2 cursor-pointer hover:bg-muted/50 text-sm flex justify-between ${selectedProductId === p.id ? 'bg-primary/10' : ''}`}
                      onClick={() => { setSelectedProductId(p.id); setFlashPrice(String(Math.round(p.price * 0.7))); }}
                    >
                      <span className="truncate">{p.title}</span>
                      <span className="text-muted-foreground ml-2">{formatPrice(p.price)} · {p.stock} in stock</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {selectedProductId && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Flash Price (₹)</Label><Input type="number" value={flashPrice} onChange={(e) => setFlashPrice(e.target.value)} /></div>
                  <div><Label>Quantity</Label><Input type="number" value={flashQty} onChange={(e) => setFlashQty(e.target.value)} /></div>
                  <div><Label>Per User Limit</Label><Input type="number" value={perUserLimit} onChange={(e) => setPerUserLimit(e.target.value)} /></div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddProductOpen(false)}>Cancel</Button>
            <Button onClick={() => addProduct.mutate()} disabled={!selectedProductId || addProduct.isPending}>
              {addProduct.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Add Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
