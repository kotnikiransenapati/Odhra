import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle, Package, Search, Loader2, CheckCircle, Bell, RefreshCw, TrendingDown,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export function InventoryAlertsDashboard() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('active');

  // Fetch low stock products directly
  const { data: lowStockProducts = [], isLoading } = useQuery({
    queryKey: ['low-stock-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, title, sku, stock, low_stock_threshold, vendor_id, vendors(brand_name), product_images(image_url)')
        .lt('stock', 20) // Products with stock below 20
        .eq('is_active', true)
        .order('stock', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch existing alerts
  const { data: alerts = [] } = useQuery({
    queryKey: ['inventory-alerts', filter],
    queryFn: async () => {
      let query = supabase
        .from('inventory_alerts')
        .select('*, products(title, sku, stock), vendors(brand_name)')
        .order('created_at', { ascending: false });

      if (filter === 'active') query = query.eq('is_resolved', false);
      else if (filter === 'resolved') query = query.eq('is_resolved', true);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Generate alerts for low stock products that don't have one
  const generateAlerts = useMutation({
    mutationFn: async () => {
      const existingProductIds = alerts.filter(a => !a.is_resolved).map(a => a.product_id);
      const newAlerts = lowStockProducts
        .filter(p => !existingProductIds.includes(p.id))
        .map(p => ({
          product_id: p.id,
          vendor_id: p.vendor_id,
          alert_type: p.stock === 0 ? 'out_of_stock' : 'low_stock',
          threshold: p.low_stock_threshold || 10,
          current_stock: p.stock,
        }));

      if (newAlerts.length === 0) throw new Error('No new alerts to generate');

      const { error } = await supabase.from('inventory_alerts').insert(newAlerts);
      if (error) throw error;
      return newAlerts.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['inventory-alerts'] });
      toast.success(`Generated ${count} new inventory alerts`);
    },
    onError: (e: any) => toast.error(e.message || 'Failed to generate alerts'),
  });

  // Resolve alert
  const resolveAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('inventory_alerts')
        .update({ is_resolved: true, resolved_at: new Date().toISOString() })
        .eq('id', alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-alerts'] });
      toast.success('Alert resolved');
    },
  });

  const filteredProducts = lowStockProducts.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  const outOfStock = lowStockProducts.filter(p => p.stock === 0).length;
  const criticalStock = lowStockProducts.filter(p => p.stock > 0 && p.stock <= 5).length;
  const lowStock = lowStockProducts.filter(p => p.stock > 5).length;

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Out of Stock', value: outOfStock, icon: Package, color: 'text-destructive', bg: 'bg-destructive/10' },
          { label: 'Critical (≤5)', value: criticalStock, icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10' },
          { label: 'Low Stock', value: lowStock, icon: TrendingDown, color: 'text-info', bg: 'bg-info/10' },
          { label: 'Active Alerts', value: alerts.filter(a => !a.is_resolved).length, icon: Bell, color: 'text-accent', bg: 'bg-accent/10' },
        ].map((s, i) => (
          <Card key={i} className="glass">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-lg font-bold">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Button onClick={() => generateAlerts.mutate()} disabled={generateAlerts.isPending} variant="outline" className="gap-2">
          {generateAlerts.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Generate Alerts
        </Button>
      </div>

      {/* Low Stock Products */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Low Stock Products ({filteredProducts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Threshold</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map(product => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {(product as any).product_images?.[0]?.image_url && (
                        <img src={(product as any).product_images[0].image_url} alt="" className="w-10 h-10 rounded object-cover" />
                      )}
                      <span className="font-medium text-sm">{product.title}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{product.sku || '—'}</TableCell>
                  <TableCell className="text-sm">{(product as any).vendors?.brand_name || '—'}</TableCell>
                  <TableCell>
                    <span className={`font-bold ${product.stock === 0 ? 'text-destructive' : product.stock <= 5 ? 'text-warning' : 'text-info'}`}>
                      {product.stock}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{product.low_stock_threshold || 10}</TableCell>
                  <TableCell>
                    <Badge variant={product.stock === 0 ? 'destructive' : 'outline'} className="text-xs">
                      {product.stock === 0 ? 'Out of Stock' : product.stock <= 5 ? 'Critical' : 'Low'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {filteredProducts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 text-success opacity-40" />
                    All products are well stocked
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Alert History */}
      <Card className="glass">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" /> Alert History
            </CardTitle>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {alerts.map(alert => (
              <div key={alert.id} className={`flex items-center justify-between p-3 rounded-lg ${alert.is_resolved ? 'bg-secondary/20' : 'bg-warning/5 border border-warning/20'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${alert.alert_type === 'out_of_stock' ? 'bg-destructive/10' : 'bg-warning/10'}`}>
                    {alert.alert_type === 'out_of_stock' ? <Package className="w-4 h-4 text-destructive" /> : <AlertTriangle className="w-4 h-4 text-warning" />}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{alert.products?.title || 'Unknown Product'}</p>
                    <p className="text-xs text-muted-foreground">
                      Stock: {alert.current_stock} / Threshold: {alert.threshold} · {(alert as any).vendors?.brand_name || ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{format(new Date(alert.created_at), 'MMM d')}</span>
                  {!alert.is_resolved && (
                    <Button variant="ghost" size="sm" onClick={() => resolveAlert.mutate(alert.id)} disabled={resolveAlert.isPending}>
                      <CheckCircle className="w-4 h-4" />
                    </Button>
                  )}
                  {alert.is_resolved && <Badge variant="secondary" className="text-[10px]">Resolved</Badge>}
                </div>
              </div>
            ))}
            {alerts.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No alerts</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
