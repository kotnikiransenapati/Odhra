import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import {
  Boxes,
  CheckCircle2,
  ChevronRight,
  Edit3,
  History,
  Loader2,
  Package,
  Percent,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { haptic } from '@/lib/haptics';
import { supabase } from '@/integrations/supabase/client';
import { useVendorId } from '@/hooks/useVendorDashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type ProductRow = {
  id: string;
  title: string;
  sku: string | null;
  price: number;
  compare_at_price: number | null;
  stock: number;
  low_stock_threshold: number | null;
  is_active: boolean;
  updated_at: string;
  product_images?: Array<{ url: string; is_primary: boolean | null }> | null;
};

type DraftRow = {
  price: string;
  compare_at_price: string;
  stock: string;
  low_stock_threshold: string;
  is_active: boolean;
};

type Filter = 'all' | 'low-stock' | 'active' | 'draft';
type Preset = 'stock-add' | 'stock-set' | 'price-percent' | 'threshold-set';

const toDraft = (p: ProductRow): DraftRow => ({
  price: String(Number(p.price ?? 0)),
  compare_at_price: p.compare_at_price == null ? '' : String(Number(p.compare_at_price)),
  stock: String(Number(p.stock ?? 0)),
  low_stock_threshold: String(Number(p.low_stock_threshold ?? 0)),
  is_active: Boolean(p.is_active),
});

const primaryImage = (p: ProductRow) => {
  const images = p.product_images ?? [];
  return images.find((img) => img.is_primary)?.url ?? images[0]?.url ?? null;
};

const differs = (product: ProductRow, draft: DraftRow) => (
  Number(draft.price || 0) !== Number(product.price ?? 0)
  || (draft.compare_at_price === '' ? null : Number(draft.compare_at_price)) !== (product.compare_at_price == null ? null : Number(product.compare_at_price))
  || Number(draft.stock || 0) !== Number(product.stock ?? 0)
  || Number(draft.low_stock_threshold || 0) !== Number(product.low_stock_threshold ?? 0)
  || draft.is_active !== Boolean(product.is_active)
);

const formatPrice = (value: number) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
}).format(value || 0);

export function VendorBulkCatalogEditor() {
  const queryClient = useQueryClient();
  const { data: vendorId } = useVendorId();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drafts, setDrafts] = useState<Record<string, DraftRow>>({});
  const [preset, setPreset] = useState<Preset>('stock-add');
  const [presetValue, setPresetValue] = useState('10');
  const [notes, setNotes] = useState('');

  const { data: products = [], isLoading, refetch } = useQuery({
    queryKey: ['vendor-bulk-catalog-products', vendorId],
    enabled: !!vendorId,
    staleTime: 30_000,
    queryFn: async (): Promise<ProductRow[]> => {
      const { data, error } = await supabase
        .from('products')
        .select('id,title,sku,price,compare_at_price,stock,low_stock_threshold,is_active,updated_at,product_images(url,is_primary)')
        .eq('vendor_id', vendorId!)
        .order('updated_at', { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as ProductRow[];
    },
  });

  const { data: operations = [] } = useQuery({
    queryKey: ['vendor-bulk-catalog-ops'],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batch_stock_operations')
        .select('id,operation_type,items_affected,notes,created_at')
        .eq('operation_type', 'bulk_catalog_update')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return products.filter((p) => {
      if (filter === 'low-stock' && p.stock > (p.low_stock_threshold ?? 5)) return false;
      if (filter === 'active' && !p.is_active) return false;
      if (filter === 'draft' && p.is_active) return false;
      if (needle && !`${p.title} ${p.sku ?? ''}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [filter, products, q]);

  const dirtyIds = useMemo(() => products
    .filter((p) => drafts[p.id] && differs(p, drafts[p.id]))
    .map((p) => p.id), [drafts, products]);

  const stats = useMemo(() => ({
    total: products.length,
    low: products.filter((p) => p.stock <= (p.low_stock_threshold ?? 5)).length,
    selected: selected.size,
    dirty: dirtyIds.length,
  }), [dirtyIds.length, products, selected.size]);

  const updateDraft = (id: string, patch: Partial<DraftRow>) => {
    const product = products.find((p) => p.id === id);
    if (!product) return;
    setDrafts((prev) => ({ ...prev, [id]: { ...(prev[id] ?? toDraft(product)), ...patch } }));
  };

  const toggleSelected = (id: string) => {
    haptic('light');
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleVisible = () => {
    haptic('light');
    const ids = filtered.map((p) => p.id);
    const allSelected = ids.length > 0 && ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => { if (allSelected) next.delete(id); else next.add(id); });
      return next;
    });
  };

  const applyPreset = () => {
    const value = Number(presetValue);
    if (!Number.isFinite(value)) {
      toast.error('Enter a valid number');
      return;
    }
    if (selected.size === 0) {
      toast.error('Select products first');
      return;
    }
    haptic('medium');
    selected.forEach((id) => {
      const product = products.find((p) => p.id === id);
      if (!product) return;
      const base = drafts[id] ?? toDraft(product);
      if (preset === 'stock-add') updateDraft(id, { stock: String(Math.max(0, Number(base.stock || 0) + value)) });
      if (preset === 'stock-set') updateDraft(id, { stock: String(Math.max(0, value)) });
      if (preset === 'threshold-set') updateDraft(id, { low_stock_threshold: String(Math.max(0, value)) });
      if (preset === 'price-percent') {
        const next = Math.max(0, Math.round(Number(base.price || 0) * (1 + value / 100)));
        updateDraft(id, { price: String(next) });
      }
    });
    toast.success(`Preset applied to ${selected.size} product${selected.size === 1 ? '' : 's'}`);
  };

  const resetDrafts = () => {
    haptic('light');
    setDrafts({});
    setSelected(new Set());
    setNotes('');
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const ids = dirtyIds.filter((id) => selected.size === 0 || selected.has(id));
      if (ids.length === 0) throw new Error('No changed selected products to save');
      const updates = ids.map((id) => {
        const d = drafts[id];
        return {
          product_id: id,
          price: Number(d.price || 0),
          compare_at_price: d.compare_at_price === '' ? null : Number(d.compare_at_price),
          stock: Math.max(0, Math.floor(Number(d.stock || 0))),
          low_stock_threshold: Math.max(0, Math.floor(Number(d.low_stock_threshold || 0))),
          is_active: Boolean(d.is_active),
        };
      });
      if (updates.some((u) => !Number.isFinite(u.price) || !Number.isFinite(u.stock))) {
        throw new Error('Review numeric fields before saving');
      }
      const { data, error } = await supabase.rpc('vendor_bulk_update_products' as any, {
        _updates: updates,
        _notes: notes.trim() || null,
      });
      if (error) throw error;
      return data as { updated?: number };
    },
    onSuccess: (data) => {
      toast.success(`${data?.updated ?? 0} product${data?.updated === 1 ? '' : 's'} updated`);
      resetDrafts();
      queryClient.invalidateQueries({ queryKey: ['vendor-bulk-catalog-products'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-products'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-bulk-catalog-ops'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-stats'] });
    },
    onError: (error: any) => toast.error(error.message || 'Bulk update failed'),
  });

  return (
    <div className="space-y-6">
      <Card className="border-border/40 overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-accent" /> Bulk Pricing & Stock Editor
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Make reviewed catalog updates with vendor-scoped backend validation and audit history.
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline"><Boxes className="w-3 h-3 mr-1" />{stats.total} products</Badge>
              <Badge variant="outline" className="border-warning/30 text-warning">{stats.low} low stock</Badge>
              <Badge variant="outline" className="border-accent/30 text-accent">{stats.selected} selected</Badge>
              <Badge variant="outline" className="border-success/30 text-success">{stats.dirty} changed</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid lg:grid-cols-[1fr_auto] gap-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products or SKU…" className="pl-10" />
              </div>
              <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
                <SelectTrigger className="sm:w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All products</SelectItem>
                  <SelectItem value="low-stock">Low stock</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => refetch()} aria-label="Refresh catalog">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex gap-2 flex-wrap justify-start lg:justify-end">
              <Button variant="outline" onClick={resetDrafts} disabled={stats.dirty === 0}>Reset</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || stats.dirty === 0} className="gap-2">
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save changes
              </Button>
            </div>
          </div>

          <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-3 rounded-xl border border-border/40 bg-secondary/20 p-3">
            <div className="grid sm:grid-cols-[180px_1fr_auto] gap-2 items-end">
              <div>
                <Label className="text-xs">Bulk action</Label>
                <Select value={preset} onValueChange={(v) => setPreset(v as Preset)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stock-add">Add stock</SelectItem>
                    <SelectItem value="stock-set">Set stock</SelectItem>
                    <SelectItem value="price-percent">Price % change</SelectItem>
                    <SelectItem value="threshold-set">Set low-stock alert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Value</Label>
                <Input value={presetValue} onChange={(e) => setPresetValue(e.target.value)} inputMode="decimal" />
              </div>
              <Button variant="outline" onClick={applyPreset} className="gap-2">
                <Percent className="w-4 h-4" /> Apply
              </Button>
            </div>
            <div>
              <Label className="text-xs">Audit note</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Restock after PO, festival sale price refresh…" />
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No products in this view</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/40">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox checked={filtered.length > 0 && filtered.every((p) => selected.has(p.id))} onCheckedChange={toggleVisible} aria-label="Select visible products" />
                    </TableHead>
                    <TableHead className="min-w-[260px]">Product</TableHead>
                    <TableHead className="min-w-[120px]">Price</TableHead>
                    <TableHead className="min-w-[120px]">MRP</TableHead>
                    <TableHead className="min-w-[110px]">Stock</TableHead>
                    <TableHead className="min-w-[120px]">Alert</TableHead>
                    <TableHead className="min-w-[100px]">Active</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((product) => {
                    const draft = drafts[product.id] ?? toDraft(product);
                    const dirty = differs(product, draft);
                    const image = primaryImage(product);
                    return (
                      <TableRow key={product.id} className={dirty ? 'bg-accent/5' : undefined}>
                        <TableCell>
                          <Checkbox checked={selected.has(product.id)} onCheckedChange={() => toggleSelected(product.id)} aria-label={`Select ${product.title}`} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-lg bg-secondary overflow-hidden flex items-center justify-center shrink-0">
                              {image ? <img src={image} alt={product.title} className="w-full h-full object-cover" /> : <Package className="w-4 h-4 text-muted-foreground" />}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm line-clamp-1">{product.title}</p>
                              <p className="text-xs text-muted-foreground">SKU {product.sku || '—'} · {formatPrice(Number(product.price))}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell><Input value={draft.price} onChange={(e) => updateDraft(product.id, { price: e.target.value })} inputMode="decimal" className="h-9" /></TableCell>
                        <TableCell><Input value={draft.compare_at_price} onChange={(e) => updateDraft(product.id, { compare_at_price: e.target.value })} inputMode="decimal" placeholder="—" className="h-9" /></TableCell>
                        <TableCell><Input value={draft.stock} onChange={(e) => updateDraft(product.id, { stock: e.target.value })} inputMode="numeric" className="h-9" /></TableCell>
                        <TableCell><Input value={draft.low_stock_threshold} onChange={(e) => updateDraft(product.id, { low_stock_threshold: e.target.value })} inputMode="numeric" className="h-9" /></TableCell>
                        <TableCell><Switch checked={draft.is_active} onCheckedChange={(checked) => updateDraft(product.id, { is_active: checked })} aria-label={`Toggle ${product.title} active state`} /></TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" asChild aria-label={`Edit ${product.title}`}>
                            <Link to={`/vendor/products/${product.id}/edit`}><ChevronRight className="w-4 h-4" /></Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><History className="w-4 h-4" /> Recent bulk updates</CardTitle>
        </CardHeader>
        <CardContent>
          {operations.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">No bulk catalog updates yet.</div>
          ) : (
            <div className="space-y-2">
              {operations.map((op) => (
                <div key={op.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/30 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-success" />{op.items_affected} product{op.items_affected === 1 ? '' : 's'} changed</p>
                    <p className="text-xs text-muted-foreground truncate">{op.notes || 'No note'} · {formatDistanceToNow(new Date(op.created_at), { addSuffix: true })}</p>
                  </div>
                  <Badge variant="outline" className="text-success border-success/30"><CheckCircle2 className="w-3 h-3 mr-1" />Audited</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}