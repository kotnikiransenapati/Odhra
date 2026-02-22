import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit2, Trash2, Loader2, Receipt, Globe, Shield } from 'lucide-react';
import { toast } from 'sonner';

export function TaxConfigManager() {
  const queryClient = useQueryClient();
  const [showZoneDialog, setShowZoneDialog] = useState(false);
  const [editingZone, setEditingZone] = useState<any>(null);
  const [zoneForm, setZoneForm] = useState({
    name: '', country: 'IN', states: '', is_active: true,
    cgst: '9', sgst: '9', igst: '18', cess: '0',
  });

  const { data: taxZones = [], isLoading } = useQuery({
    queryKey: ['tax-zones'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tax_zones').select('*').order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: exemptions = [] } = useQuery({
    queryKey: ['tax-exemptions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tax_exemptions').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const saveZoneMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        name: data.name,
        country: data.country,
        states: data.states ? data.states.split(',').map((s: string) => s.trim()).filter(Boolean) : null,
        is_active: data.is_active,
        tax_rates: { cgst: Number(data.cgst), sgst: Number(data.sgst), igst: Number(data.igst), cess: Number(data.cess) },
      };
      if (editingZone) {
        const { error } = await supabase.from('tax_zones').update(payload).eq('id', editingZone.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('tax_zones').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-zones'] });
      setShowZoneDialog(false);
      setEditingZone(null);
      toast.success('Tax zone saved');
    },
  });

  const deleteZoneMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tax_zones').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-zones'] });
      toast.success('Tax zone deleted');
    },
  });

  const openEditZone = (zone: any) => {
    const rates = zone.tax_rates || {};
    setEditingZone(zone);
    setZoneForm({
      name: zone.name, country: zone.country, states: zone.states?.join(', ') || '',
      is_active: zone.is_active, cgst: String(rates.cgst || 0), sgst: String(rates.sgst || 0),
      igst: String(rates.igst || 0), cess: String(rates.cess || 0),
    });
    setShowZoneDialog(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Tax Configuration</h2>
        <p className="text-muted-foreground text-sm">Manage GST/VAT zones, rates, and exemptions</p>
      </div>

      <Tabs defaultValue="zones">
        <TabsList>
          <TabsTrigger value="zones" className="gap-2"><Globe className="w-4 h-4" />Tax Zones</TabsTrigger>
          <TabsTrigger value="exemptions" className="gap-2"><Shield className="w-4 h-4" />Exemptions</TabsTrigger>
        </TabsList>

        <TabsContent value="zones" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditingZone(null); setZoneForm({ name: '', country: 'IN', states: '', is_active: true, cgst: '9', sgst: '9', igst: '18', cess: '0' }); setShowZoneDialog(true); }} className="gap-2">
              <Plus className="w-4 h-4" />Add Tax Zone
            </Button>
          </div>
          <Card className="glass">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>States</TableHead>
                    <TableHead>CGST</TableHead>
                    <TableHead>SGST</TableHead>
                    <TableHead>IGST</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></TableCell></TableRow>
                  ) : taxZones.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No tax zones configured</TableCell></TableRow>
                  ) : (
                    taxZones.map((zone: any) => {
                      const rates = zone.tax_rates || {};
                      return (
                        <TableRow key={zone.id}>
                          <TableCell className="font-medium">{zone.name}</TableCell>
                          <TableCell>{zone.country}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{zone.states?.join(', ') || 'All'}</TableCell>
                          <TableCell>{rates.cgst || 0}%</TableCell>
                          <TableCell>{rates.sgst || 0}%</TableCell>
                          <TableCell>{rates.igst || 0}%</TableCell>
                          <TableCell><Badge variant={zone.is_active ? 'default' : 'secondary'}>{zone.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openEditZone(zone)}><Edit2 className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteZoneMutation.mutate(zone.id)}><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exemptions" className="space-y-4">
          <Card className="glass">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>GSTIN</TableHead>
                    <TableHead>Valid From</TableHead>
                    <TableHead>Valid Until</TableHead>
                    <TableHead>Verified</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exemptions.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No exemptions registered</TableCell></TableRow>
                  ) : (
                    exemptions.map((ex: any) => (
                      <TableRow key={ex.id}>
                        <TableCell className="capitalize">{ex.exemption_type}</TableCell>
                        <TableCell className="font-mono text-sm">{ex.gstin || '-'}</TableCell>
                        <TableCell className="text-sm">{ex.valid_from}</TableCell>
                        <TableCell className="text-sm">{ex.valid_until || 'Indefinite'}</TableCell>
                        <TableCell><Badge variant={ex.is_verified ? 'default' : 'secondary'}>{ex.is_verified ? 'Verified' : 'Pending'}</Badge></TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Zone Dialog */}
      <Dialog open={showZoneDialog} onOpenChange={setShowZoneDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingZone ? 'Edit' : 'Add'} Tax Zone</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><label className="text-sm font-medium">Zone Name</label><Input value={zoneForm.name} onChange={e => setZoneForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Maharashtra Intra-state" /></div>
            <div><label className="text-sm font-medium">Country</label><Input value={zoneForm.country} onChange={e => setZoneForm(p => ({ ...p, country: e.target.value }))} /></div>
            <div><label className="text-sm font-medium">States (comma-separated)</label><Input value={zoneForm.states} onChange={e => setZoneForm(p => ({ ...p, states: e.target.value }))} placeholder="Leave empty for all states" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium">CGST (%)</label><Input type="number" value={zoneForm.cgst} onChange={e => setZoneForm(p => ({ ...p, cgst: e.target.value }))} /></div>
              <div><label className="text-sm font-medium">SGST (%)</label><Input type="number" value={zoneForm.sgst} onChange={e => setZoneForm(p => ({ ...p, sgst: e.target.value }))} /></div>
              <div><label className="text-sm font-medium">IGST (%)</label><Input type="number" value={zoneForm.igst} onChange={e => setZoneForm(p => ({ ...p, igst: e.target.value }))} /></div>
              <div><label className="text-sm font-medium">Cess (%)</label><Input type="number" value={zoneForm.cess} onChange={e => setZoneForm(p => ({ ...p, cess: e.target.value }))} /></div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={zoneForm.is_active} onCheckedChange={v => setZoneForm(p => ({ ...p, is_active: v }))} /><span className="text-sm">Active</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowZoneDialog(false)}>Cancel</Button>
            <Button disabled={!zoneForm.name} onClick={() => saveZoneMutation.mutate(zoneForm)}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
