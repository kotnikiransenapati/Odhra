import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit2, Trash2, Loader2, Users, Target, RefreshCw, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

export function CustomerSegmentation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    name: '', description: '', segment_type: 'manual', color: '#6366f1',
    min_orders: '', max_orders: '', min_spent: '', max_spent: '', last_active_days: '',
  });

  const { data: segments = [], isLoading } = useQuery({
    queryKey: ['customer-segments'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('customer_segments') as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const criteria: any = {};
      if (data.min_orders) criteria.min_orders = Number(data.min_orders);
      if (data.max_orders) criteria.max_orders = Number(data.max_orders);
      if (data.min_spent) criteria.min_spent = Number(data.min_spent);
      if (data.max_spent) criteria.max_spent = Number(data.max_spent);
      if (data.last_active_days) criteria.last_active_days = Number(data.last_active_days);

      const payload = {
        name: data.name, description: data.description || null,
        segment_type: data.segment_type, color: data.color, criteria,
        created_by: user?.id,
      };

      if (editing) {
        const { error } = await (supabase.from('customer_segments') as any).update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from('customer_segments') as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-segments'] });
      setShowDialog(false);
      setEditing(null);
      toast.success('Segment saved');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('customer_segments') as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-segments'] });
      toast.success('Segment deleted');
    },
  });

  const refreshMutation = useMutation({
    mutationFn: async (segment: any) => {
      // Count matching customers based on criteria
      let query = supabase.from('orders').select('customer_id', { count: 'exact', head: false });
      // Simple count for now
      const { count, error } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      if (error) throw error;

      await (supabase.from('customer_segments') as any)
        .update({ member_count: count || 0, last_refreshed_at: new Date().toISOString() })
        .eq('id', segment.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-segments'] });
      toast.success('Segment refreshed');
    },
  });

  const openEdit = (seg: any) => {
    const c = seg.criteria || {};
    setEditing(seg);
    setForm({
      name: seg.name, description: seg.description || '', segment_type: seg.segment_type,
      color: seg.color, min_orders: String(c.min_orders || ''), max_orders: String(c.max_orders || ''),
      min_spent: String(c.min_spent || ''), max_spent: String(c.max_spent || ''),
      last_active_days: String(c.last_active_days || ''),
    });
    setShowDialog(true);
  };

  // RFM preset segments
  const rfmPresets = [
    { name: 'Champions', desc: 'High value, frequent buyers', color: '#10b981', criteria: { min_orders: 10, min_spent: 50000 } },
    { name: 'Loyal Customers', desc: 'Regular buyers with good spend', color: '#6366f1', criteria: { min_orders: 5, min_spent: 20000 } },
    { name: 'At Risk', desc: 'Previously active, now inactive', color: '#f59e0b', criteria: { min_orders: 3, last_active_days: 60 } },
    { name: 'New Customers', desc: 'Recent first-time buyers', color: '#3b82f6', criteria: { max_orders: 1, last_active_days: 30 } },
    { name: 'Dormant', desc: 'No activity in 90+ days', color: '#ef4444', criteria: { last_active_days: 90 } },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Customer Segmentation</h2>
          <p className="text-muted-foreground text-sm">Create RFM-based segments for targeted marketing</p>
        </div>
        <Button onClick={() => { setEditing(null); setForm({ name: '', description: '', segment_type: 'manual', color: '#6366f1', min_orders: '', max_orders: '', min_spent: '', max_spent: '', last_active_days: '' }); setShowDialog(true); }} className="gap-2">
          <Plus className="w-4 h-4" />Create Segment
        </Button>
      </div>

      {/* RFM Presets */}
      {segments.length === 0 && (
        <Card className="glass">
          <CardHeader><CardTitle className="text-sm">Quick Start — RFM Segments</CardTitle></CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {rfmPresets.map(preset => (
                <button
                  key={preset.name}
                  className="p-4 rounded-xl border border-border hover:border-accent/50 transition-colors text-left"
                  onClick={() => {
                    setEditing(null);
                    setForm({
                      name: preset.name, description: preset.desc, segment_type: 'rfm', color: preset.color,
                      min_orders: String(preset.criteria.min_orders || ''), max_orders: String((preset.criteria as any).max_orders || ''),
                      min_spent: String((preset.criteria as any).min_spent || ''), max_spent: '',
                      last_active_days: String((preset.criteria as any).last_active_days || ''),
                    });
                    setShowDialog(true);
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.color }} />
                    <span className="font-medium text-sm">{preset.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{preset.desc}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Segments Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {segments.map((seg: any) => (
          <Card key={seg.id} className="glass">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: seg.color }} />
                  <h3 className="font-semibold">{seg.name}</h3>
                </div>
                <Badge variant="outline" className="text-xs capitalize">{seg.segment_type}</Badge>
              </div>
              {seg.description && <p className="text-sm text-muted-foreground">{seg.description}</p>}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-lg font-bold">{seg.member_count}</span>
                  <span className="text-xs text-muted-foreground">members</span>
                </div>
              </div>
              {seg.criteria && Object.keys(seg.criteria).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(seg.criteria).map(([key, val]) => (
                    <Badge key={key} variant="secondary" className="text-[10px]">
                      {key.replace(/_/g, ' ')}: {String(val)}
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => refreshMutation.mutate(seg)}>
                  <RefreshCw className="w-3 h-3" />Refresh
                </Button>
                <Button variant="ghost" size="sm" onClick={() => openEdit(seg)}><Edit2 className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteMutation.mutate(seg.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>}

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit' : 'Create'} Segment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2"><label className="text-sm font-medium">Name</label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
              <div><label className="text-sm font-medium">Color</label><Input type="color" value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} className="h-10" /></div>
            </div>
            <div><label className="text-sm font-medium">Description</label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
            <div>
              <label className="text-sm font-medium">Segment Type</label>
              <Select value={form.segment_type} onValueChange={v => setForm(p => ({ ...p, segment_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="rfm">RFM</SelectItem>
                  <SelectItem value="behavioral">Behavioral</SelectItem>
                  <SelectItem value="dynamic">Dynamic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm font-medium">Criteria</p>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground">Min Orders</label><Input type="number" value={form.min_orders} onChange={e => setForm(p => ({ ...p, min_orders: e.target.value }))} /></div>
              <div><label className="text-xs text-muted-foreground">Max Orders</label><Input type="number" value={form.max_orders} onChange={e => setForm(p => ({ ...p, max_orders: e.target.value }))} /></div>
              <div><label className="text-xs text-muted-foreground">Min Spent (₹)</label><Input type="number" value={form.min_spent} onChange={e => setForm(p => ({ ...p, min_spent: e.target.value }))} /></div>
              <div><label className="text-xs text-muted-foreground">Max Spent (₹)</label><Input type="number" value={form.max_spent} onChange={e => setForm(p => ({ ...p, max_spent: e.target.value }))} /></div>
              <div className="col-span-2"><label className="text-xs text-muted-foreground">Last Active Within (days)</label><Input type="number" value={form.last_active_days} onChange={e => setForm(p => ({ ...p, last_active_days: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button disabled={!form.name} onClick={() => saveMutation.mutate(form)}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
