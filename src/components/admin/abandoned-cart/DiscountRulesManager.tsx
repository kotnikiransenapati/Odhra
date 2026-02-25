import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Percent, Plus, Loader2, TrendingUp } from 'lucide-react';

export function AbandonedCartDiscountRules() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: '', discount_type: 'percentage', discount_value: 10, min_cart_value: 500,
    max_cart_value: '', max_discount: '', user_segments: [] as string[],
    escalation_enabled: false, escalation_step_2_value: 15, escalation_step_3_value: 20, priority: 0,
  });

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['cart-discount-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cart_recovery_discount_rules')
        .select('*')
        .order('priority', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const createRule = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('cart_recovery_discount_rules').insert({
        name: form.name,
        discount_type: form.discount_type,
        discount_value: form.discount_value,
        min_cart_value: form.min_cart_value || 0,
        max_cart_value: form.max_cart_value ? parseFloat(form.max_cart_value) : null,
        max_discount: form.max_discount ? parseFloat(form.max_discount) : null,
        user_segments: form.user_segments,
        escalation_enabled: form.escalation_enabled,
        escalation_step_2_value: form.escalation_enabled ? form.escalation_step_2_value : null,
        escalation_step_3_value: form.escalation_enabled ? form.escalation_step_3_value : null,
        priority: form.priority,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Discount rule created');
      queryClient.invalidateQueries({ queryKey: ['cart-discount-rules'] });
      setShowCreate(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleRule = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('cart_recovery_discount_rules').update({ is_active: active } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart-discount-rules'] }),
  });

  const formatPrice = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  const segmentOptions = ['new', 'returning', 'high_value', 'at_risk'];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg gap-2 flex items-center"><Percent className="w-5 h-5" />Dynamic Discount Rules</CardTitle>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="w-4 h-4" />New Rule</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Discount Escalation Rule</DialogTitle></DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div><Label>Rule Name</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. VIP High Cart Recovery" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Discount Type</Label>
                  <Select value={form.discount_type} onValueChange={v => setForm(p => ({ ...p, discount_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="fixed">Fixed Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Base Discount (Step 1)</Label><Input type="number" value={form.discount_value} onChange={e => setForm(p => ({ ...p, discount_value: parseFloat(e.target.value) || 0 }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Min Cart Value (₹)</Label><Input type="number" value={form.min_cart_value} onChange={e => setForm(p => ({ ...p, min_cart_value: parseFloat(e.target.value) || 0 }))} /></div>
                <div><Label>Max Cart Value (₹)</Label><Input type="number" value={form.max_cart_value} onChange={e => setForm(p => ({ ...p, max_cart_value: e.target.value }))} placeholder="No limit" /></div>
              </div>
              <div><Label>User Segments</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {segmentOptions.map(seg => (
                    <Badge key={seg} variant={form.user_segments.includes(seg) ? 'default' : 'outline'}
                      className="cursor-pointer" onClick={() => setForm(p => ({
                        ...p, user_segments: p.user_segments.includes(seg) ? p.user_segments.filter(s => s !== seg) : [...p.user_segments, seg]
                      }))}>
                      {seg === 'high_value' ? '💎 VIP' : seg === 'at_risk' ? '⚠️ At Risk' : seg === 'new' ? '🆕 New' : '🔄 Returning'}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Leave empty to apply to all segments</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.escalation_enabled} onCheckedChange={v => setForm(p => ({ ...p, escalation_enabled: v }))} />
                <Label>Enable Discount Escalation (auto-increase on each email step)</Label>
              </div>
              {form.escalation_enabled && (
                <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-secondary">
                  <div><Label>Step 2 Discount</Label><Input type="number" value={form.escalation_step_2_value} onChange={e => setForm(p => ({ ...p, escalation_step_2_value: parseFloat(e.target.value) || 0 }))} /></div>
                  <div><Label>Step 3 Discount</Label><Input type="number" value={form.escalation_step_3_value} onChange={e => setForm(p => ({ ...p, escalation_step_3_value: parseFloat(e.target.value) || 0 }))} /></div>
                  <p className="col-span-2 text-xs text-muted-foreground">e.g. Step 1: 5% → Step 2: 10% → Step 3: 15%</p>
                </div>
              )}
              <div><Label>Priority (higher = checked first)</Label><Input type="number" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: parseInt(e.target.value) || 0 }))} /></div>
              <Button onClick={() => createRule.mutate()} disabled={!form.name || createRule.isPending} className="w-full">Create Rule</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
        ) : rules.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 px-4">No discount rules. Create one to auto-generate personalized recovery offers.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rule</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Cart Range</TableHead>
                <TableHead>Segments</TableHead>
                <TableHead>Escalation</TableHead>
                <TableHead>Used</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule: any) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">{rule.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {rule.discount_type === 'percentage' ? `${rule.discount_value}%` : formatPrice(rule.discount_value)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatPrice(rule.min_cart_value || 0)} — {rule.max_cart_value ? formatPrice(rule.max_cart_value) : '∞'}
                  </TableCell>
                  <TableCell>
                    {rule.user_segments?.length > 0
                      ? rule.user_segments.map((s: string) => <Badge key={s} variant="outline" className="mr-1 text-xs">{s}</Badge>)
                      : <span className="text-xs text-muted-foreground">All</span>}
                  </TableCell>
                  <TableCell>
                    {rule.escalation_enabled
                      ? <span className="text-xs">{rule.discount_value}% → {rule.escalation_step_2_value}% → {rule.escalation_step_3_value}%</span>
                      : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>{rule.times_used}×</TableCell>
                  <TableCell className="font-semibold flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-green-600" />{formatPrice(rule.total_revenue_recovered || 0)}
                  </TableCell>
                  <TableCell><Switch checked={rule.is_active} onCheckedChange={v => toggleRule.mutate({ id: rule.id, active: v })} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
