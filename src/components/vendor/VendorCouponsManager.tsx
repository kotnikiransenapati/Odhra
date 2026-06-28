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
import { Ticket, Plus, Pause, Play, Copy } from 'lucide-react';

type Coupon = {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  max_discount_amount: number | null;
  usage_limit: number | null;
  usage_count: number;
  total_budget: number | null;
  spent_amount: number;
  status: string;
  expires_at: string | null;
};

const genCode = () => 'V' + Math.random().toString(36).slice(2, 8).toUpperCase();

export function VendorCouponsManager({ vendorId }: { vendorId: string }) {
  const [rows, setRows] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    code: genCode(),
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: 10,
    min_order_amount: 0,
    max_discount_amount: '',
    usage_limit: '',
    total_budget: '',
    expires_at: '',
  });

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase.from('vendor_coupons' as any) as any)
      .select('*')
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false });
    if (error) toast.error(error.message);
    setRows((data as Coupon[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (vendorId) load();
  }, [vendorId]);

  const create = async () => {
    if (!form.code.trim()) return toast.error('Code required');
    const payload: any = {
      vendor_id: vendorId,
      code: form.code.trim().toUpperCase(),
      description: form.description || null,
      discount_type: form.discount_type,
      discount_value: form.discount_value,
      min_order_amount: form.min_order_amount || 0,
      max_discount_amount: form.max_discount_amount ? Number(form.max_discount_amount) : null,
      usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
      total_budget: form.total_budget ? Number(form.total_budget) : null,
      expires_at: form.expires_at || null,
    };
    const { error } = await (supabase.from('vendor_coupons' as any) as any).insert(payload);
    if (error) return toast.error(error.message);
    toast.success('Coupon created');
    setForm({ ...form, code: genCode(), description: '' });
    load();
  };

  const toggle = async (c: Coupon) => {
    const next = c.status === 'active' ? 'paused' : 'active';
    await (supabase.from('vendor_coupons' as any) as any).update({ status: next }).eq('id', c.id);
    load();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" /> Create Coupon
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div>
            <Label>Code</Label>
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={form.discount_type} onValueChange={(v: any) => setForm({ ...form, discount_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentage</SelectItem>
                <SelectItem value="fixed">Fixed ₹</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Value</Label>
            <Input type="number" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: +e.target.value })} />
          </div>
          <div>
            <Label>Min Order ₹</Label>
            <Input type="number" value={form.min_order_amount} onChange={(e) => setForm({ ...form, min_order_amount: +e.target.value })} />
          </div>
          <div>
            <Label>Max Discount ₹</Label>
            <Input type="number" value={form.max_discount_amount} onChange={(e) => setForm({ ...form, max_discount_amount: e.target.value })} />
          </div>
          <div>
            <Label>Usage Limit</Label>
            <Input type="number" value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} />
          </div>
          <div>
            <Label>Total Budget ₹</Label>
            <Input type="number" value={form.total_budget} onChange={(e) => setForm({ ...form, total_budget: e.target.value })} />
          </div>
          <div>
            <Label>Expires</Label>
            <Input type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
          </div>
          <div className="md:col-span-4">
            <Label>Description</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <Button onClick={create} className="md:w-fit">
            <Plus className="h-4 w-4 mr-1" /> Create
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Coupons</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-muted-foreground">No coupons yet</div>
          ) : (
            <div className="space-y-3">
              {rows.map((c) => {
                const budgetPct = c.total_budget ? Math.min(100, (c.spent_amount / c.total_budget) * 100) : 0;
                const usagePct = c.usage_limit ? Math.min(100, (c.usage_count / c.usage_limit) * 100) : 0;
                return (
                  <div key={c.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <code className="px-2 py-1 bg-muted rounded font-mono text-sm">{c.code}</code>
                        <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(c.code); toast.success('Copied'); }}>
                          <Copy className="h-3 w-3" />
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          {c.discount_type === 'percentage' ? `${c.discount_value}% off` : `₹${c.discount_value} off`}
                          {c.min_order_amount > 0 ? ` · min ₹${c.min_order_amount}` : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={c.status === 'active' ? 'default' : 'secondary'}>{c.status}</Badge>
                        <Button size="icon" variant="ghost" onClick={() => toggle(c)}>
                          {c.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    {c.usage_limit && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Used {c.usage_count}/{c.usage_limit}</div>
                        <Progress value={usagePct} className="h-1" />
                      </div>
                    )}
                    {c.total_budget && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Spent ₹{c.spent_amount} / ₹{c.total_budget}</div>
                        <Progress value={budgetPct} className="h-1" />
                      </div>
                    )}
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
