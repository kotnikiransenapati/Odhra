import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { FlaskConical, Plus, Trophy, Loader2 } from 'lucide-react';

export function AbandonedCartABTests() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newTest, setNewTest] = useState({
    name: '',
    traffic_split: 50,
    variant_a: { subject: '', discount_value: 0 },
    variant_b: { subject: '', discount_value: 0 },
  });

  const { data: tests = [], isLoading } = useQuery({
    queryKey: ['cart-ab-tests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cart_recovery_ab_tests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const createTest = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('cart_recovery_ab_tests').insert({
        name: newTest.name,
        traffic_split: newTest.traffic_split,
        variant_a: newTest.variant_a,
        variant_b: newTest.variant_b,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('A/B test created');
      queryClient.invalidateQueries({ queryKey: ['cart-ab-tests'] });
      setShowCreate(false);
      setNewTest({ name: '', traffic_split: 50, variant_a: { subject: '', discount_value: 0 }, variant_b: { subject: '', discount_value: 0 } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleTest = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      // Deactivate all others if activating
      if (active) {
        await supabase.from('cart_recovery_ab_tests').update({ is_active: false } as any).neq('id', id);
      }
      const { error } = await supabase.from('cart_recovery_ab_tests').update({ is_active: active } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart-ab-tests'] }),
  });

  const declareWinner = useMutation({
    mutationFn: async ({ id, winner }: { id: string; winner: string }) => {
      const { error } = await supabase.from('cart_recovery_ab_tests').update({ winner, is_active: false } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Winner declared!');
      queryClient.invalidateQueries({ queryKey: ['cart-ab-tests'] });
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg gap-2 flex items-center"><FlaskConical className="w-5 h-5" />Email A/B Tests</CardTitle>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1"><Plus className="w-4 h-4" />New Test</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create A/B Test</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Test Name</Label><Input value={newTest.name} onChange={e => setNewTest(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Discount 10% vs 15%" /></div>
              <div><Label>Traffic Split (% to Variant A)</Label><Input type="number" min={10} max={90} value={newTest.traffic_split} onChange={e => setNewTest(p => ({ ...p, traffic_split: parseInt(e.target.value) || 50 }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-semibold">Variant A</Label>
                  <Input placeholder="Subject line" value={newTest.variant_a.subject} onChange={e => setNewTest(p => ({ ...p, variant_a: { ...p.variant_a, subject: e.target.value } }))} />
                  <Input type="number" placeholder="Discount %" value={newTest.variant_a.discount_value || ''} onChange={e => setNewTest(p => ({ ...p, variant_a: { ...p.variant_a, discount_value: parseFloat(e.target.value) || 0 } }))} />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold">Variant B</Label>
                  <Input placeholder="Subject line" value={newTest.variant_b.subject} onChange={e => setNewTest(p => ({ ...p, variant_b: { ...p.variant_b, subject: e.target.value } }))} />
                  <Input type="number" placeholder="Discount %" value={newTest.variant_b.discount_value || ''} onChange={e => setNewTest(p => ({ ...p, variant_b: { ...p.variant_b, discount_value: parseFloat(e.target.value) || 0 } }))} />
                </div>
              </div>
              <Button onClick={() => createTest.mutate()} disabled={!newTest.name || createTest.isPending} className="w-full">Create Test</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
        ) : tests.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No A/B tests yet. Create one to start optimizing recovery emails.</p>
        ) : (
          tests.map((test: any) => {
            const totalA = test.total_sent_a || 0;
            const totalB = test.total_sent_b || 0;
            const recA = test.recovered_a || 0;
            const recB = test.recovered_b || 0;
            const rateA = totalA > 0 ? (recA / totalA) * 100 : 0;
            const rateB = totalB > 0 ? (recB / totalB) * 100 : 0;
            const revA = test.revenue_a || 0;
            const revB = test.revenue_b || 0;

            return (
              <div key={test.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{test.name}</h3>
                    {test.winner && <Badge className="gap-1"><Trophy className="w-3 h-3" />Winner: {test.winner.toUpperCase()}</Badge>}
                    {test.is_active && <Badge variant="outline" className="text-green-600">Active</Badge>}
                  </div>
                  <Switch checked={test.is_active} onCheckedChange={(v) => toggleTest.mutate({ id: test.id, active: v })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-secondary space-y-2">
                    <p className="text-sm font-medium">Variant A ({test.traffic_split}%)</p>
                    <p className="text-xs text-muted-foreground">Subject: {(test.variant_a as any)?.subject || 'Default'}</p>
                    <div className="flex justify-between text-sm"><span>Sent: {totalA}</span><span>Recovered: {recA}</span></div>
                    <Progress value={rateA} className="h-1.5" />
                    <p className="text-xs font-semibold">{rateA.toFixed(1)}% recovery • ₹{revA.toLocaleString()} revenue</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary space-y-2">
                    <p className="text-sm font-medium">Variant B ({100 - test.traffic_split}%)</p>
                    <p className="text-xs text-muted-foreground">Subject: {(test.variant_b as any)?.subject || 'Default'}</p>
                    <div className="flex justify-between text-sm"><span>Sent: {totalB}</span><span>Recovered: {recB}</span></div>
                    <Progress value={rateB} className="h-1.5" />
                    <p className="text-xs font-semibold">{rateB.toFixed(1)}% recovery • ₹{revB.toLocaleString()} revenue</p>
                  </div>
                </div>
                {!test.winner && (totalA + totalB >= 20) && (
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="outline" onClick={() => declareWinner.mutate({ id: test.id, winner: 'a' })}>Promote A</Button>
                    <Button size="sm" variant="outline" onClick={() => declareWinner.mutate({ id: test.id, winner: 'b' })}>Promote B</Button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
