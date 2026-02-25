import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertTriangle, Package, Search, Loader2, CheckCircle, Bell, RefreshCw,
  TrendingDown, TrendingUp, Minus, BarChart3, Upload, Clock, Zap,
  ArrowRight, Activity, Box, Calculator,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export function InventoryAlertsDashboard() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [alertFilter, setAlertFilter] = useState('active');
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchNotes, setBatchNotes] = useState('');
  const [batchItems, setBatchItems] = useState<Array<{ sku: string; quantity: number; type: string }>>([]);
  const [batchText, setBatchText] = useState('');

  // ── Fetch low stock products with forecasting data ──
  const { data: lowStockProducts = [], isLoading } = useQuery({
    queryKey: ['low-stock-products-advanced'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, title, sku, stock, low_stock_threshold, vendor_id, avg_daily_sales, days_until_stockout, reorder_point, reorder_quantity, cost_price, vendors(brand_name), product_images(image_url)')
        .eq('is_active', true)
        .order('stock', { ascending: true })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  // ── Fetch forecasts ──
  const { data: forecasts = [] } = useQuery({
    queryKey: ['inventory-forecasts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_forecasts')
        .select('*, products(title, sku, stock, vendor_id, vendors(brand_name))')
        .order('computed_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  // ── Deduplicate forecasts: latest per product ──
  const latestForecasts = React.useMemo(() => {
    const map = new Map<string, any>();
    for (const f of forecasts) {
      if (!map.has(f.product_id)) map.set(f.product_id, f);
    }
    return Array.from(map.values());
  }, [forecasts]);

  // ── Fetch alerts ──
  const { data: alerts = [] } = useQuery({
    queryKey: ['inventory-alerts', alertFilter],
    queryFn: async () => {
      let query = supabase
        .from('inventory_alerts')
        .select('*, products(title, sku, stock), vendors(brand_name)')
        .order('created_at', { ascending: false });
      if (alertFilter === 'active') query = query.eq('is_resolved', false);
      else if (alertFilter === 'resolved') query = query.eq('is_resolved', true);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // ── Fetch batch operation history ──
  const { data: batchHistory = [] } = useQuery({
    queryKey: ['batch-stock-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batch_stock_operations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  // ── Run forecast computation ──
  const runForecast = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('compute_inventory_forecasts', { p_period_days: 30 });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['inventory-forecasts'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock-products-advanced'] });
      toast.success(`Forecasts computed for ${data?.products_updated || 0} products`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Generate alerts ──
  const generateAlerts = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('inventory-alerts');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-alerts'] });
      toast.success('Alerts generated & vendors notified');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Resolve alert ──
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

  // ── Batch stock update ──
  const executeBatch = useMutation({
    mutationFn: async () => {
      // Parse batch text: "SKU, +/-quantity" per line
      const lines = batchText.split('\n').filter(l => l.trim());
      const parsed: Array<{ sku: string; quantity: number; type: string }> = [];

      for (const line of lines) {
        const parts = line.split(',').map(s => s.trim());
        if (parts.length < 2) continue;
        const sku = parts[0];
        const qty = parseInt(parts[1]);
        if (isNaN(qty)) continue;
        parsed.push({ sku, quantity: qty, type: qty >= 0 ? 'restock' : 'adjustment' });
      }

      if (parsed.length === 0) throw new Error('No valid entries found. Use format: SKU, quantity');

      const results: any[] = [];
      for (const item of parsed) {
        const { data: product } = await supabase
          .from('products')
          .select('id, stock, title')
          .eq('sku', item.sku)
          .single();

        if (!product) {
          results.push({ sku: item.sku, status: 'not_found' });
          continue;
        }

        const newStock = Math.max(0, product.stock + item.quantity);
        const { error } = await supabase
          .from('products')
          .update({ 
            stock: newStock,
            last_restock_at: item.quantity > 0 ? new Date().toISOString() : undefined,
          })
          .eq('id', product.id);

        if (error) {
          results.push({ sku: item.sku, status: 'error', error: error.message });
        } else {
          results.push({ sku: item.sku, title: product.title, old_stock: product.stock, new_stock: newStock, status: 'success' });
        }
      }

      // Record batch operation
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('batch_stock_operations').insert({
        performed_by: user?.id,
        operation_type: 'adjustment',
        items_affected: results.filter(r => r.status === 'success').length,
        details: results,
        notes: batchNotes || null,
      });

      return results;
    },
    onSuccess: (results) => {
      const success = results.filter((r: any) => r.status === 'success').length;
      const failed = results.filter((r: any) => r.status !== 'success').length;
      toast.success(`${success} items updated${failed > 0 ? `, ${failed} failed` : ''}`);
      setBatchOpen(false);
      setBatchText('');
      setBatchNotes('');
      queryClient.invalidateQueries({ queryKey: ['low-stock-products-advanced'] });
      queryClient.invalidateQueries({ queryKey: ['batch-stock-history'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Computed stats ──
  const outOfStock = lowStockProducts.filter((p: any) => p.stock === 0).length;
  const criticalStock = lowStockProducts.filter((p: any) => p.stock > 0 && p.stock <= 5).length;
  const lowStock = lowStockProducts.filter((p: any) => p.stock > 5 && p.stock <= (p.low_stock_threshold || 20)).length;
  const urgentReorders = latestForecasts.filter(f => f.days_until_stockout !== null && f.days_until_stockout <= 7).length;

  const totalInventoryValue = lowStockProducts.reduce((sum: number, p: any) => 
    sum + (p.stock || 0) * (p.cost_price || 0), 0);
  const totalRetailValue = lowStockProducts.reduce((sum: number, p: any) => {
    // We don't have price in our query but cost_price * 2 is a rough estimate
    return sum + (p.stock || 0) * (p.cost_price || 0) * 1.5;
  }, 0);

  const trendIcon = (trend: string) => {
    if (trend === 'rising') return <TrendingUp className="w-3.5 h-3.5 text-success" />;
    if (trend === 'falling') return <TrendingDown className="w-3.5 h-3.5 text-destructive" />;
    return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
  };

  const stockoutBadge = (days: number | null) => {
    if (days === null) return <Badge variant="secondary" className="text-[10px]">No data</Badge>;
    if (days <= 3) return <Badge variant="destructive" className="text-[10px] gap-1"><Zap className="w-3 h-3" />{days}d left</Badge>;
    if (days <= 7) return <Badge className="bg-warning/10 text-warning text-[10px] gap-1"><Clock className="w-3 h-3" />{days}d left</Badge>;
    if (days <= 14) return <Badge className="bg-info/10 text-info text-[10px]">{days}d left</Badge>;
    return <Badge variant="outline" className="text-[10px] text-success">{days}d+</Badge>;
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  const filteredProducts = lowStockProducts.filter((p: any) =>
    p.title?.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>;

  return (
    <div className="space-y-6">
      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {[
          { label: 'Out of Stock', value: outOfStock, icon: Package, color: 'text-destructive', bg: 'bg-destructive/10' },
          { label: 'Critical (≤5)', value: criticalStock, icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10' },
          { label: 'Low Stock', value: lowStock, icon: TrendingDown, color: 'text-info', bg: 'bg-info/10' },
          { label: 'Urgent Reorders', value: urgentReorders, icon: Zap, color: 'text-destructive', bg: 'bg-destructive/10' },
          { label: 'Active Alerts', value: alerts.filter((a: any) => !a.is_resolved).length, icon: Bell, color: 'text-accent', bg: 'bg-accent/10' },
          { label: 'Inventory Value', value: formatCurrency(totalInventoryValue), icon: Calculator, color: 'text-primary', bg: 'bg-primary/10' },
        ].map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold truncate">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Actions Bar ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by product name or SKU..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="flex gap-2">
          <Button onClick={() => runForecast.mutate()} disabled={runForecast.isPending} variant="outline" className="gap-2">
            {runForecast.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
            Run Forecast
          </Button>
          <Button onClick={() => generateAlerts.mutate()} disabled={generateAlerts.isPending} variant="outline" className="gap-2">
            {generateAlerts.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
            Generate Alerts
          </Button>
          <Button onClick={() => setBatchOpen(true)} className="gap-2">
            <Upload className="w-4 h-4" />
            Batch Update
          </Button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="forecasts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="forecasts" className="gap-2"><BarChart3 className="w-4 h-4" />Stock Forecasts</TabsTrigger>
          <TabsTrigger value="stock" className="gap-2"><Package className="w-4 h-4" />Low Stock</TabsTrigger>
          <TabsTrigger value="alerts" className="gap-2"><Bell className="w-4 h-4" />Alerts ({alerts.filter((a: any) => !a.is_resolved).length})</TabsTrigger>
          <TabsTrigger value="history" className="gap-2"><Clock className="w-4 h-4" />Batch History</TabsTrigger>
        </TabsList>

        {/* ── Forecasts Tab ── */}
        <TabsContent value="forecasts">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-accent" />
                Sales Velocity & Stockout Forecasts
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Avg Daily Sales</TableHead>
                    <TableHead>Trend</TableHead>
                    <TableHead>Days to Stockout</TableHead>
                    <TableHead>Reorder Qty</TableHead>
                    <TableHead>Confidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {latestForecasts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No forecasts yet. Click "Run Forecast" to compute sales velocity.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    latestForecasts
                      .sort((a: any, b: any) => (a.days_until_stockout ?? 999) - (b.days_until_stockout ?? 999))
                      .slice(0, 100)
                      .map((f: any) => (
                        <TableRow key={f.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{f.products?.title || 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground font-mono">{f.products?.sku || '—'}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`font-bold ${(f.products?.stock ?? 0) === 0 ? 'text-destructive' : (f.products?.stock ?? 0) <= 5 ? 'text-warning' : ''}`}>
                              {f.products?.stock ?? 0}
                            </span>
                          </TableCell>
                          <TableCell className="font-semibold">{f.avg_daily_sales?.toFixed(1)}/day</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              {trendIcon(f.sales_trend)}
                              <span className="text-xs capitalize">{f.sales_trend}</span>
                            </div>
                          </TableCell>
                          <TableCell>{stockoutBadge(f.days_until_stockout)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs gap-1">
                              <Box className="w-3 h-3" />{f.recommended_reorder_qty} units
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 min-w-[100px]">
                              <Progress value={f.confidence_score || 0} className="h-1.5 flex-1" />
                              <span className="text-[10px] text-muted-foreground">{Math.round(f.confidence_score || 0)}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Low Stock Tab ── */}
        <TabsContent value="stock">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
                Low Stock Products ({filteredProducts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Reorder Point</TableHead>
                    <TableHead>Daily Sales</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.slice(0, 100).map((product: any) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {product.product_images?.[0]?.image_url && (
                            <img src={product.product_images[0].image_url} alt="" className="w-10 h-10 rounded object-cover" />
                          )}
                          <span className="font-medium text-sm">{product.title}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{product.sku || '—'}</TableCell>
                      <TableCell className="text-sm">{product.vendors?.brand_name || '—'}</TableCell>
                      <TableCell>
                        <span className={`font-bold ${product.stock === 0 ? 'text-destructive' : product.stock <= 5 ? 'text-warning' : 'text-info'}`}>
                          {product.stock}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{product.reorder_point || 10}</TableCell>
                      <TableCell className="text-sm">{product.avg_daily_sales?.toFixed(1) || '0.0'}/day</TableCell>
                      <TableCell>
                        <Badge variant={product.stock === 0 ? 'destructive' : 'outline'} className="text-xs">
                          {product.stock === 0 ? 'Out of Stock' : product.stock <= 5 ? 'Critical' : 'Low'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredProducts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                        <CheckCircle className="w-8 h-8 mx-auto mb-2 text-success opacity-40" />
                        All products are well stocked
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Alerts Tab ── */}
        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5" /> Alert History</CardTitle>
                <Select value={alertFilter} onValueChange={setAlertFilter}>
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
                {alerts.map((alert: any) => (
                  <div key={alert.id} className={`flex items-center justify-between p-3 rounded-lg ${alert.is_resolved ? 'bg-secondary/20' : 'bg-warning/5 border border-warning/20'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${alert.alert_type === 'out_of_stock' ? 'bg-destructive/10' : 'bg-warning/10'}`}>
                        {alert.alert_type === 'out_of_stock' ? <Package className="w-4 h-4 text-destructive" /> : <AlertTriangle className="w-4 h-4 text-warning" />}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{alert.products?.title || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">
                          Stock: {alert.current_stock} · Threshold: {alert.threshold} · {alert.vendors?.brand_name || ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}</span>
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
        </TabsContent>

        {/* ── Batch History Tab ── */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5" /> Batch Stock Operations
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Items Affected</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batchHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                        <Upload className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No batch operations yet</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    batchHistory.map((op: any) => (
                      <TableRow key={op.id}>
                        <TableCell className="text-sm">{format(new Date(op.created_at), 'MMM d, HH:mm')}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize text-xs">{op.operation_type}</Badge>
                        </TableCell>
                        <TableCell className="font-semibold">{op.items_affected}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{op.notes || '—'}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(Array.isArray(op.details) ? op.details : []).slice(0, 3).map((d: any, i: number) => (
                              <Badge key={i} variant={d.status === 'success' ? 'secondary' : 'destructive'} className="text-[10px]">
                                {d.sku}: {d.old_stock}→{d.new_stock}
                              </Badge>
                            ))}
                            {Array.isArray(op.details) && op.details.length > 3 && (
                              <Badge variant="outline" className="text-[10px]">+{op.details.length - 3} more</Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Batch Update Dialog ── */}
      <Dialog open={batchOpen} onOpenChange={setBatchOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Upload className="w-5 h-5" /> Batch Stock Update</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Enter one product per line: <code className="bg-muted px-1 rounded text-xs">SKU, quantity</code>
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                Use positive numbers to add stock, negative to remove. Example:
              </p>
              <pre className="text-xs bg-muted p-2 rounded mb-3">
{`SHIRT-BLK-M, 50
PANT-BLU-L, 30
TEE-WHT-S, -5`}
              </pre>
              <Textarea
                value={batchText}
                onChange={(e) => setBatchText(e.target.value)}
                placeholder="SKU, quantity"
                rows={8}
                className="font-mono text-sm"
              />
            </div>
            <Input
              placeholder="Notes (optional)"
              value={batchNotes}
              onChange={(e) => setBatchNotes(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchOpen(false)}>Cancel</Button>
            <Button
              onClick={() => executeBatch.mutate()}
              disabled={executeBatch.isPending || !batchText.trim()}
              className="gap-2"
            >
              {executeBatch.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Execute ({batchText.split('\n').filter(l => l.trim()).length} items)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
