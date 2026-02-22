import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Download,
  Upload,
  FileText,
  ShoppingCart,
  Package,
  Users,
  Store,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Database,
  Calendar,
} from 'lucide-react';

type ExportEntity = 'orders' | 'products' | 'customers' | 'vendors' | 'reviews' | 'inventory';
type ExportFormat = 'csv' | 'json';

interface ExportConfig {
  entity: ExportEntity;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const EXPORT_CONFIGS: ExportConfig[] = [
  { entity: 'orders', label: 'Orders', icon: ShoppingCart, description: 'All orders with customer info, items, and payment details' },
  { entity: 'products', label: 'Products', icon: Package, description: 'Complete product catalog with variants, pricing, and stock' },
  { entity: 'customers', label: 'Customers', icon: Users, description: 'Customer profiles, order history stats, and loyalty data' },
  { entity: 'vendors', label: 'Vendors', icon: Store, description: 'Vendor details, performance metrics, and balances' },
  { entity: 'reviews', label: 'Reviews', icon: FileText, description: 'Product reviews with ratings and approval status' },
  { entity: 'inventory', label: 'Inventory', icon: Database, description: 'Stock levels, locations, and reorder points' },
];

interface ImportResult {
  total: number;
  success: number;
  failed: number;
  errors: string[];
}

export function ExportImportCenter() {
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [exporting, setExporting] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importPreview, setImportPreview] = useState<any[] | null>(null);
  const [importEntity, setImportEntity] = useState<string>('products');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exportHistory, setExportHistory] = useState<Array<{entity: string, format: string, count: number, date: string}>>([]);

  const fetchExportData = async (entity: ExportEntity) => {
    switch (entity) {
      case 'orders': {
        const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
        const customerIds = [...new Set(data?.map(o => o.customer_id) || [])];
        const { data: profiles } = await supabase.from('profiles').select('id, full_name, email, phone').in('id', customerIds);
        return (data || []).map(order => {
          const customer = profiles?.find(p => p.id === order.customer_id);
          const addr = order.shipping_address as any;
          return {
            order_number: order.order_number,
            status: order.status,
            payment_status: order.payment_status,
            customer_name: customer?.full_name || '',
            customer_email: customer?.email || '',
            customer_phone: customer?.phone || '',
            subtotal: order.subtotal,
            shipping_amount: order.shipping_amount || 0,
            tax_amount: order.tax_amount || 0,
            discount_amount: order.discount_amount || 0,
            total_amount: order.total_amount,
            currency: order.currency,
            payment_method: order.payment_method || '',
            payment_provider: order.payment_provider || '',
            shipping_name: addr?.name || '',
            shipping_address: addr?.address || '',
            shipping_city: addr?.city || '',
            shipping_state: addr?.state || '',
            shipping_pincode: addr?.pincode || '',
            shipping_phone: addr?.phone || '',
            promotion_code: order.promotion_code || '',
            admin_note: order.admin_note || '',
            created_at: order.created_at,
            updated_at: order.updated_at,
          };
        });
      }
      case 'products': {
        const { data } = await supabase.from('products').select('*, product_images(url, is_primary)').order('created_at', { ascending: false });
        const vendorIds = [...new Set(data?.map(p => p.vendor_id) || [])];
        const { data: vendors } = await supabase.from('vendors').select('id, brand_name').in('id', vendorIds);
        return (data || []).map(product => ({
          title: product.title,
          slug: product.slug,
          sku: product.sku || '',
          description: product.description || '',
          price: product.price,
          compare_at_price: product.compare_at_price || '',
          cost_price: product.cost_price || '',
          stock: product.stock,
          low_stock_threshold: product.low_stock_threshold || 10,
          weight: product.weight || '',
          unit: (product as any).unit || '',
          category_id: product.category_id || '',
          vendor: vendors?.find(v => v.id === product.vendor_id)?.brand_name || '',
          is_active: product.is_active,
          is_featured: product.is_featured,
          tags: (product.tags || []).join(', '),
          primary_image: (product.product_images as any[])?.find((i: any) => i.is_primary)?.url || '',
          created_at: product.created_at,
        }));
      }
      case 'customers': {
        const { data: profiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        const userIds = profiles?.map(p => p.id) || [];
        const { data: orders } = await supabase.from('orders').select('customer_id, total_amount, payment_status').in('customer_id', userIds);
        const { data: loyalty } = await supabase.from('loyalty_points').select('user_id, points, tier, lifetime_points').in('user_id', userIds);
        return (profiles || []).map(profile => {
          const userOrders = orders?.filter(o => o.customer_id === profile.id && o.payment_status === 'paid') || [];
          const userLoyalty = loyalty?.find(l => l.user_id === profile.id);
          return {
            name: profile.full_name || '',
            email: profile.email || '',
            phone: profile.phone || '',
            avatar_url: profile.avatar_url || '',
            total_orders: userOrders.length,
            total_spent: userOrders.reduce((s, o) => s + o.total_amount, 0),
            loyalty_points: userLoyalty?.points || 0,
            loyalty_tier: userLoyalty?.tier || 'bronze',
            lifetime_points: userLoyalty?.lifetime_points || 0,
            created_at: profile.created_at,
          };
        });
      }
      case 'vendors': {
        const { data } = await supabase.from('vendors').select('*').order('created_at', { ascending: false });
        return (data || []).map(v => ({
          brand_name: v.brand_name,
          slug: v.slug,
          bio: v.bio || '',
          commission_rate: v.commission_rate,
          balance: v.balance,
          pending_balance: v.pending_balance,
          is_active: v.is_active,
          is_verified: v.is_verified,
          gst_number: v.gst_number || '',
          created_at: v.created_at,
        }));
      }
      case 'reviews': {
        const { data } = await supabase.from('reviews').select('*, products(title)').order('created_at', { ascending: false });
        return (data || []).map(r => ({
          product: (r as any).products?.title || '',
          rating: r.rating,
          title: r.title || '',
          content: r.content || '',
          is_approved: r.is_approved,
          is_verified_purchase: r.is_verified_purchase,
          helpful_count: r.helpful_count || 0,
          created_at: r.created_at,
        }));
      }
      case 'inventory': {
        const { data } = await supabase.from('inventory_levels').select('*, products(title, sku), inventory_locations(name, code)').order('updated_at', { ascending: false });
        return (data || []).map(il => ({
          product: (il as any).products?.title || '',
          sku: (il as any).products?.sku || '',
          location: (il as any).inventory_locations?.name || 'Default',
          location_code: (il as any).inventory_locations?.code || '',
          quantity: il.quantity,
          reserved: il.reserved_quantity,
          available: il.quantity - il.reserved_quantity,
          reorder_point: il.reorder_point || '',
          reorder_quantity: il.reorder_quantity || '',
          updated_at: il.updated_at,
        }));
      }
      default:
        return [];
    }
  };

  const handleExport = async (entity: ExportEntity) => {
    setExporting(entity);
    try {
      const data = await fetchExportData(entity);
      if (!data.length) {
        toast.error('No data to export');
        return;
      }

      let content: string;
      let filename: string;
      let mimeType: string;

      if (exportFormat === 'csv') {
        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(row => Object.values(row).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));
        content = [headers, ...rows].join('\n');
        filename = `${entity}_export_${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv';
      } else {
        content = JSON.stringify(data, null, 2);
        filename = `${entity}_export_${new Date().toISOString().split('T')[0]}.json`;
        mimeType = 'application/json';
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      setExportHistory(prev => [
        { entity, format: exportFormat, count: data.length, date: new Date().toISOString() },
        ...prev.slice(0, 9),
      ]);

      toast.success(`Exported ${data.length} ${entity} records`);
    } catch (error) {
      toast.error(`Failed to export ${entity}`);
      console.error(error);
    } finally {
      setExporting(null);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      let parsed: any[] = [];

      if (file.name.endsWith('.json')) {
        parsed = JSON.parse(text);
      } else if (file.name.endsWith('.csv')) {
        const lines = text.split('\n').filter(l => l.trim());
        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
        parsed = lines.slice(1).map(line => {
          const values = line.match(/("([^"]*("")*)*"|[^,]*)/g)?.map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"').trim()) || [];
          const obj: any = {};
          headers.forEach((h, i) => { obj[h] = values[i] || ''; });
          return obj;
        });
      }

      setImportPreview(parsed.slice(0, 10));
      toast.info(`${parsed.length} records found. Preview showing first 10.`);
    } catch (error) {
      toast.error('Failed to parse file');
      console.error(error);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImport = async () => {
    if (!importPreview) return;
    setImporting(true);
    setImportProgress(0);

    const result: ImportResult = { total: importPreview.length, success: 0, failed: 0, errors: [] };

    try {
      // For now, only support product import
      if (importEntity === 'products') {
        for (let i = 0; i < importPreview.length; i++) {
          const row = importPreview[i];
          try {
            const { error } = await supabase.from('products').insert({
              title: row.title || row.name || 'Untitled',
              slug: (row.slug || row.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              price: parseFloat(row.price) || 0,
              compare_at_price: row.compare_at_price ? parseFloat(row.compare_at_price) : null,
              stock: parseInt(row.stock) || 0,
              description: row.description || '',
              sku: row.sku || null,
              is_active: row.is_active !== 'false',
              vendor_id: row.vendor_id || null,
              category_id: row.category_id || null,
            });

            if (error) {
              result.failed++;
              result.errors.push(`Row ${i + 1}: ${error.message}`);
            } else {
              result.success++;
            }
          } catch (err: any) {
            result.failed++;
            result.errors.push(`Row ${i + 1}: ${err.message}`);
          }

          setImportProgress(Math.round(((i + 1) / importPreview.length) * 100));
        }
      }

      setImportResult(result);
      if (result.success > 0) toast.success(`${result.success} records imported successfully`);
      if (result.failed > 0) toast.error(`${result.failed} records failed to import`);
    } finally {
      setImporting(false);
      setImportPreview(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Database className="w-6 h-6 text-accent" />
            Export & Import Center
          </h2>
          <p className="text-muted-foreground text-sm">Bulk export and import your marketplace data</p>
        </div>
      </div>

      <Tabs defaultValue="export">
        <TabsList>
          <TabsTrigger value="export" className="gap-2">
            <Download className="w-4 h-4" /> Export Data
          </TabsTrigger>
          <TabsTrigger value="import" className="gap-2">
            <Upload className="w-4 h-4" /> Import Data
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <Calendar className="w-4 h-4" /> History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="export" className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm font-medium">Export Format:</span>
            <Select value={exportFormat} onValueChange={(v: ExportFormat) => setExportFormat(v)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {EXPORT_CONFIGS.map(config => (
              <Card key={config.entity} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <config.icon className="w-5 h-5 text-accent" />
                    {config.label}
                  </CardTitle>
                  <CardDescription className="text-xs">{config.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full gap-2"
                    onClick={() => handleExport(config.entity)}
                    disabled={!!exporting}
                  >
                    {exporting === config.entity ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    Export {config.label}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Import Data</CardTitle>
              <CardDescription>Upload CSV or JSON files to import data into your marketplace</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Select value={importEntity} onValueChange={setImportEntity}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="products">Products</SelectItem>
                  </SelectContent>
                </Select>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2">
                  <Upload className="w-4 h-4" />
                  Select File
                </Button>
              </div>

              {importPreview && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">{importPreview.length} records to import (preview)</Badge>
                    <Button onClick={handleImport} disabled={importing} className="gap-2">
                      {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      Start Import
                    </Button>
                  </div>

                  {importing && <Progress value={importProgress} className="h-2" />}

                  <div className="overflow-x-auto max-h-64">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {Object.keys(importPreview[0] || {}).slice(0, 5).map(key => (
                            <TableHead key={key} className="text-xs">{key}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importPreview.map((row, i) => (
                          <TableRow key={i}>
                            {Object.values(row).slice(0, 5).map((val, j) => (
                              <TableCell key={j} className="text-xs max-w-[150px] truncate">
                                {String(val ?? '')}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {importResult && (
                <Card className="bg-secondary/30">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2 text-sm">
                        <Database className="w-4 h-4" /> Total: {importResult.total}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-success">
                        <CheckCircle2 className="w-4 h-4" /> Success: {importResult.success}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-destructive">
                        <AlertTriangle className="w-4 h-4" /> Failed: {importResult.failed}
                      </div>
                    </div>
                    {importResult.errors.length > 0 && (
                      <div className="mt-3 max-h-32 overflow-y-auto text-xs text-destructive space-y-1">
                        {importResult.errors.map((err, i) => <p key={i}>{err}</p>)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Exports</CardTitle>
            </CardHeader>
            <CardContent>
              {exportHistory.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No exports yet this session</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entity</TableHead>
                      <TableHead>Format</TableHead>
                      <TableHead>Records</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exportHistory.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell className="capitalize font-medium">{item.entity}</TableCell>
                        <TableCell><Badge variant="outline">{item.format.toUpperCase()}</Badge></TableCell>
                        <TableCell>{item.count}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(item.date).toLocaleTimeString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
