import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Megaphone, Plus, Pause, Play, Trash2 } from 'lucide-react';

type Row = {
  id: string;
  product_id: string;
  slot: string;
  bid_cpc: number;
  daily_budget: number;
  total_budget: number | null;
  spent_today: number;
  spent_total: number;
  impressions: number;
  clicks: number;
  status: string;
};

type Product = { id: string; title: string };

export function VendorPromotedListings({ vendorId }: { vendorId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    product_id: '',
    slot: 'search',
    bid_cpc: 5,
    daily_budget: 200,
    total_budget: '',
  });

  const load = async () => {
    setLoading(true);
    const [{ data: r }, { data: p }] = await Promise.all([
      (supabase.from('promoted_listings' as any) as any)
        .select('*')
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false }),
      supabase.from('products').select('id,title').eq('vendor_id', vendorId).eq('is_active', true).limit(200),
    ]);
    setRows((r as Row[]) || []);
    setProducts(((p as unknown) as Product[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (vendorId) load();
  }, [vendorId]);

  const create = async () => {
    if (!form.product_id) return toast.error('Pick a product');
    const { error } = await (supabase.from('promoted_listings' as any) as any).insert({
      vendor_id: vendorId,
      product_id: form.product_id,
      slot: form.slot,
      bid_cpc: form.bid_cpc,
      daily_budget: form.daily_budget,
      total_budget: form.total_budget ? Number(form.total_budget) : null,
    });
    if (error) return toast.error(error.message);
    toast.success('Campaign launched');
    setForm({ ...form, product_id: '' });
    load();
  };

  const toggle = async (r: Row) => {
    const next = r.status === 'active' ? 'paused' : 'active';
    await (supabase.from('promoted_listings' as any) as any).update({ status: next }).eq('id', r.id);
    load();
  };

  const remove = async (id: string) => {
    await (supabase.from('promoted_listings' as any) as any).update({ status: 'archived' }).eq('id', id);
    load();
  };

  const productName = (id: string) => products.find((p) => p.id === id)?.title || id.slice(0, 8);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" /> Launch Promoted Listing
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5 items-end">
          <div className="md:col-span-2">
            <Label>Product</Label>
            <Select value={form.product_id} onValueChange={(v) => setForm({ ...form, product_id: v })}>
              <SelectTrigger><SelectValue placeholder="Choose product" /></SelectTrigger>
              <SelectContent>
                {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Slot</Label>
            <Select value={form.slot} onValueChange={(v) => setForm({ ...form, slot: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="search">Search</SelectItem>
                <SelectItem value="category">Category</SelectItem>
                <SelectItem value="home">Home</SelectItem>
                <SelectItem value="recommendation">Recommendation</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Bid (₹/click)</Label>
            <Input type="number" step="0.5" value={form.bid_cpc} onChange={(e) => setForm({ ...form, bid_cpc: +e.target.value })} />
          </div>
          <div>
            <Label>Daily Budget ₹</Label>
            <Input type="number" value={form.daily_budget} onChange={(e) => setForm({ ...form, daily_budget: +e.target.value })} />
          </div>
          <div>
            <Label>Total Budget ₹ (opt)</Label>
            <Input type="number" value={form.total_budget} onChange={(e) => setForm({ ...form, total_budget: e.target.value })} />
          </div>
          <Button onClick={create} className="md:col-span-5 md:w-fit">
            <Plus className="h-4 w-4 mr-1" /> Launch
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-muted-foreground">No campaigns yet</div>
          ) : (
            <div className="space-y-3">
              {rows.map((r) => {
                const ctr = r.impressions ? ((r.clicks / r.impressions) * 100).toFixed(2) : '0.00';
                const dailyPct = Math.min(100, (r.spent_today / r.daily_budget) * 100);
                return (
                  <div key={r.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <div className="font-medium">{productName(r.product_id)}</div>
                        <div className="text-xs text-muted-foreground">
                          Slot: {r.slot} · CPC ₹{r.bid_cpc} · Daily ₹{r.daily_budget}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={r.status === 'active' ? 'default' : 'secondary'}>{r.status}</Badge>
                        <Button size="icon" variant="ghost" onClick={() => toggle(r)}>
                          {r.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => remove(r.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div><div className="text-muted-foreground">Impressions</div><div className="font-semibold">{r.impressions.toLocaleString()}</div></div>
                      <div><div className="text-muted-foreground">Clicks</div><div className="font-semibold">{r.clicks.toLocaleString()}</div></div>
                      <div><div className="text-muted-foreground">CTR</div><div className="font-semibold">{ctr}%</div></div>
                      <div><div className="text-muted-foreground">Spent today</div><div className="font-semibold">₹{r.spent_today}</div></div>
                    </div>
                    <Progress value={dailyPct} className="h-1" />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
