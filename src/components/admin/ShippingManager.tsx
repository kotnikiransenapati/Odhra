import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Truck, MapPin, Plus, Edit2, Trash2, Globe, Package, DollarSign, Clock, Loader2
} from 'lucide-react';
import { toast } from 'sonner';

export function ShippingManager() {
  const queryClient = useQueryClient();
  const [showZoneDialog, setShowZoneDialog] = useState(false);
  const [showRateDialog, setShowRateDialog] = useState(false);
  const [editingZone, setEditingZone] = useState<any>(null);
  const [editingRate, setEditingRate] = useState<any>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');

  const [zoneForm, setZoneForm] = useState({ name: '', countries: '', states: '', is_active: true });
  const [rateForm, setRateForm] = useState({
    zone_id: '', name: '', description: '', rate_type: 'flat', base_rate: '0',
    per_kg_rate: '0', free_above_amount: '', estimated_days_min: '3', estimated_days_max: '7', is_active: true,
  });

  const { data: zones = [], isLoading: zonesLoading } = useQuery({
    queryKey: ['shipping-zones'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('shipping_zones') as any).select('*').order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: rates = [], isLoading: ratesLoading } = useQuery({
    queryKey: ['shipping-rates'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('shipping_rates') as any).select('*').order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: partners = [] } = useQuery({
    queryKey: ['delivery-partners'],
    queryFn: async () => {
      const { data } = await supabase.from('delivery_partners').select('*').eq('is_active', true);
      return data || [];
    },
  });

  const saveZoneMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        name: data.name,
        countries: data.countries.split(',').map((c: string) => c.trim()).filter(Boolean),
        states: data.states ? data.states.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        is_active: data.is_active,
      };
      if (editingZone) {
        const { error } = await (supabase.from('shipping_zones') as any).update(payload).eq('id', editingZone.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from('shipping_zones') as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-zones'] });
      setShowZoneDialog(false);
      setEditingZone(null);
      toast.success(editingZone ? 'Zone updated' : 'Zone created');
    },
  });

  const saveRateMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        zone_id: data.zone_id,
        name: data.name,
        description: data.description || null,
        rate_type: data.rate_type,
        base_rate: Number(data.base_rate),
        per_kg_rate: Number(data.per_kg_rate) || 0,
        free_above_amount: data.free_above_amount ? Number(data.free_above_amount) : null,
        estimated_days_min: Number(data.estimated_days_min),
        estimated_days_max: Number(data.estimated_days_max),
        is_active: data.is_active,
      };
      if (editingRate) {
        const { error } = await (supabase.from('shipping_rates') as any).update(payload).eq('id', editingRate.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from('shipping_rates') as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-rates'] });
      setShowRateDialog(false);
      setEditingRate(null);
      toast.success(editingRate ? 'Rate updated' : 'Rate created');
    },
  });

  const deleteZoneMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('shipping_zones') as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-zones'] });
      toast.success('Zone deleted');
    },
  });

  const deleteRateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('shipping_rates') as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-rates'] });
      toast.success('Rate deleted');
    },
  });

  const openEditZone = (zone: any) => {
    setEditingZone(zone);
    setZoneForm({
      name: zone.name,
      countries: zone.countries?.join(', ') || '',
      states: zone.states?.join(', ') || '',
      is_active: zone.is_active,
    });
    setShowZoneDialog(true);
  };

  const openEditRate = (rate: any) => {
    setEditingRate(rate);
    setRateForm({
      zone_id: rate.zone_id,
      name: rate.name,
      description: rate.description || '',
      rate_type: rate.rate_type,
      base_rate: String(rate.base_rate),
      per_kg_rate: String(rate.per_kg_rate || 0),
      free_above_amount: rate.free_above_amount ? String(rate.free_above_amount) : '',
      estimated_days_min: String(rate.estimated_days_min),
      estimated_days_max: String(rate.estimated_days_max),
      is_active: rate.is_active,
    });
    setShowRateDialog(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Shipping & Logistics</h2>
        <p className="text-muted-foreground text-sm">Configure shipping zones, rates, and delivery partners</p>
      </div>

      <Tabs defaultValue="zones">
        <TabsList>
          <TabsTrigger value="zones" className="gap-2"><MapPin className="w-4 h-4" />Shipping Zones</TabsTrigger>
          <TabsTrigger value="rates" className="gap-2"><DollarSign className="w-4 h-4" />Rates</TabsTrigger>
          <TabsTrigger value="partners" className="gap-2"><Truck className="w-4 h-4" />Partners</TabsTrigger>
        </TabsList>

        <TabsContent value="zones" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditingZone(null); setZoneForm({ name: '', countries: '', states: '', is_active: true }); setShowZoneDialog(true); }} className="gap-2">
              <Plus className="w-4 h-4" />Add Zone
            </Button>
          </div>
          <Card className="glass">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Zone Name</TableHead>
                    <TableHead>Countries</TableHead>
                    <TableHead>States</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Rates</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {zonesLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></TableCell></TableRow>
                  ) : zones.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No shipping zones configured</TableCell></TableRow>
                  ) : (
                    zones.map((zone: any) => {
                      const zoneRates = rates.filter((r: any) => r.zone_id === zone.id);
                      return (
                        <TableRow key={zone.id}>
                          <TableCell className="font-medium">{zone.name}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {zone.countries?.slice(0, 3).map((c: string) => (
                                <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
                              ))}
                              {(zone.countries?.length || 0) > 3 && <Badge variant="outline" className="text-xs">+{zone.countries.length - 3}</Badge>}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {zone.states?.length ? zone.states.slice(0, 2).join(', ') + (zone.states.length > 2 ? ` +${zone.states.length - 2}` : '') : 'All'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={zone.is_active ? 'default' : 'secondary'}>{zone.is_active ? 'Active' : 'Inactive'}</Badge>
                          </TableCell>
                          <TableCell><Badge variant="outline">{zoneRates.length} rates</Badge></TableCell>
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

        <TabsContent value="rates" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditingRate(null); setRateForm({ zone_id: zones[0]?.id || '', name: '', description: '', rate_type: 'flat', base_rate: '0', per_kg_rate: '0', free_above_amount: '', estimated_days_min: '3', estimated_days_max: '7', is_active: true }); setShowRateDialog(true); }} className="gap-2">
              <Plus className="w-4 h-4" />Add Rate
            </Button>
          </div>
          <Card className="glass">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Zone</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Base Rate</TableHead>
                    <TableHead>Free Above</TableHead>
                    <TableHead>Delivery</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ratesLoading ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></TableCell></TableRow>
                  ) : rates.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No shipping rates configured</TableCell></TableRow>
                  ) : (
                    rates.map((rate: any) => {
                      const zone = zones.find((z: any) => z.id === rate.zone_id);
                      return (
                        <TableRow key={rate.id}>
                          <TableCell className="font-medium">{rate.name}</TableCell>
                          <TableCell className="text-sm">{zone?.name || 'Unknown'}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs capitalize">{rate.rate_type?.replace('_', ' ')}</Badge></TableCell>
                          <TableCell className="font-semibold">₹{Number(rate.base_rate).toLocaleString()}</TableCell>
                          <TableCell className="text-sm">{rate.free_above_amount ? `₹${Number(rate.free_above_amount).toLocaleString()}` : '-'}</TableCell>
                          <TableCell className="text-sm">{rate.estimated_days_min}-{rate.estimated_days_max} days</TableCell>
                          <TableCell><Badge variant={rate.is_active ? 'default' : 'secondary'}>{rate.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openEditRate(rate)}><Edit2 className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteRateMutation.mutate(rate.id)}><Trash2 className="w-4 h-4" /></Button>
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

        <TabsContent value="partners" className="space-y-4">
          <Card className="glass">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Partner</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Services</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partners.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No delivery partners configured</TableCell></TableRow>
                  ) : (
                    partners.map((partner: any) => (
                      <TableRow key={partner.id}>
                        <TableCell className="font-medium flex items-center gap-2">
                          {partner.logo_url && <img src={partner.logo_url} alt="" className="w-6 h-6 rounded" />}
                          {partner.name}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{partner.code}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {partner.supported_services ? JSON.stringify(partner.supported_services) : '-'}
                        </TableCell>
                        <TableCell><Badge variant={partner.is_active ? 'default' : 'secondary'}>{partner.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
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
          <DialogHeader><DialogTitle>{editingZone ? 'Edit' : 'Add'} Shipping Zone</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><label className="text-sm font-medium">Zone Name</label><Input value={zoneForm.name} onChange={e => setZoneForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Domestic, International" /></div>
            <div><label className="text-sm font-medium">Countries (comma-separated)</label><Input value={zoneForm.countries} onChange={e => setZoneForm(p => ({ ...p, countries: e.target.value }))} placeholder="IN, US, UK" /></div>
            <div><label className="text-sm font-medium">States (comma-separated, optional)</label><Input value={zoneForm.states} onChange={e => setZoneForm(p => ({ ...p, states: e.target.value }))} placeholder="Maharashtra, Delhi, Karnataka" /></div>
            <div className="flex items-center gap-2">
              <Switch checked={zoneForm.is_active} onCheckedChange={v => setZoneForm(p => ({ ...p, is_active: v }))} />
              <span className="text-sm">Active</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowZoneDialog(false)}>Cancel</Button>
            <Button disabled={!zoneForm.name || !zoneForm.countries} onClick={() => saveZoneMutation.mutate(zoneForm)}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rate Dialog */}
      <Dialog open={showRateDialog} onOpenChange={setShowRateDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingRate ? 'Edit' : 'Add'} Shipping Rate</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Zone</label>
              <Select value={rateForm.zone_id} onValueChange={v => setRateForm(p => ({ ...p, zone_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select zone" /></SelectTrigger>
                <SelectContent>
                  {zones.map((z: any) => <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><label className="text-sm font-medium">Rate Name</label><Input value={rateForm.name} onChange={e => setRateForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Standard, Express" /></div>
            <div>
              <label className="text-sm font-medium">Rate Type</label>
              <Select value={rateForm.rate_type} onValueChange={v => setRateForm(p => ({ ...p, rate_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">Flat Rate</SelectItem>
                  <SelectItem value="weight_based">Weight Based</SelectItem>
                  <SelectItem value="order_value_based">Order Value Based</SelectItem>
                  <SelectItem value="free_above">Free Above Threshold</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium">Base Rate (₹)</label><Input type="number" value={rateForm.base_rate} onChange={e => setRateForm(p => ({ ...p, base_rate: e.target.value }))} /></div>
              <div><label className="text-sm font-medium">Per Kg Rate (₹)</label><Input type="number" value={rateForm.per_kg_rate} onChange={e => setRateForm(p => ({ ...p, per_kg_rate: e.target.value }))} /></div>
            </div>
            <div><label className="text-sm font-medium">Free Above Amount (₹)</label><Input type="number" value={rateForm.free_above_amount} onChange={e => setRateForm(p => ({ ...p, free_above_amount: e.target.value }))} placeholder="Leave empty for no free shipping" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium">Min Days</label><Input type="number" value={rateForm.estimated_days_min} onChange={e => setRateForm(p => ({ ...p, estimated_days_min: e.target.value }))} /></div>
              <div><label className="text-sm font-medium">Max Days</label><Input type="number" value={rateForm.estimated_days_max} onChange={e => setRateForm(p => ({ ...p, estimated_days_max: e.target.value }))} /></div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={rateForm.is_active} onCheckedChange={v => setRateForm(p => ({ ...p, is_active: v }))} />
              <span className="text-sm">Active</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowRateDialog(false)}>Cancel</Button>
            <Button disabled={!rateForm.zone_id || !rateForm.name} onClick={() => saveRateMutation.mutate(rateForm)}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
