import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Warehouse, Plus, Edit, Trash2, RefreshCw, Star, MapPin } from 'lucide-react';

type Loc = {
  id: string;
  vendor_id: string;
  name: string;
  code: string;
  address: any;
  is_default: boolean;
  is_active: boolean;
};
type VendorLite = { id: string; brand_name: string };

const blankAddress = { line1: '', line2: '', city: '', state: '', pincode: '', country: 'India' };
const blank = (vendorId = ''): Partial<Loc> => ({
  vendor_id: vendorId, name: '', code: '',
  address: { ...blankAddress }, is_default: false, is_active: true,
});

export function InventoryLocationsManager() {
  const [rows, setRows] = useState<Loc[]>([]);
  const [vendors, setVendors] = useState<VendorLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Loc> | null>(null);
  const [saving, setSaving] = useState(false);
  const [vendorFilter, setVendorFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: locs, error }, { data: vens }] = await Promise.all([
        supabase.from('inventory_locations').select('*').order('created_at', { ascending: false }),
        supabase.from('vendors').select('id,brand_name').order('brand_name').limit(500),
      ]);
      if (error) throw error;
      setRows((locs as Loc[]) || []);
      setVendors((vens as VendorLite[]) || []);
    } catch (e: any) { toast.error(e.message || 'Failed to load'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const vendorMap = useMemo(() => Object.fromEntries(vendors.map(v => [v.id, v.brand_name])), [vendors]);
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return rows.filter(r => {
      if (vendorFilter !== 'all' && r.vendor_id !== vendorFilter) return false;
      if (!q) return true;
      const addr = r.address || {};
      return (
        r.name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        (vendorMap[r.vendor_id] || '').toLowerCase().includes(q) ||
        (addr.city || '').toLowerCase().includes(q) ||
        (addr.pincode || '').toLowerCase().includes(q)
      );
    });
  }, [rows, search, vendorFilter, vendorMap]);

  const startEdit = (l?: Loc) => {
    if (l) {
      setEditing({ ...l, address: { ...blankAddress, ...(l.address || {}) } });
    } else {
      setEditing(blank(vendorFilter !== 'all' ? vendorFilter : ''));
    }
  };

  const updAddr = (k: string, v: string) => editing && setEditing({ ...editing, address: { ...(editing.address || {}), [k]: v } });

  const save = async () => {
    if (!editing?.vendor_id) return toast.error('Vendor required');
    if (!editing.name?.trim()) return toast.error('Name required');
    if (!editing.code?.trim()) return toast.error('Code required');
    setSaving(true);
    try {
      const payload = {
        vendor_id: editing.vendor_id,
        name: editing.name!.trim(),
        code: editing.code!.trim().toUpperCase(),
        address: editing.address || {},
        is_default: editing.is_default ?? false,
        is_active: editing.is_active ?? true,
      };
      const q = editing.id
        ? supabase.from('inventory_locations').update(payload).eq('id', editing.id)
        : supabase.from('inventory_locations').insert(payload);
      const { error } = await q;
      if (error) throw error;

      // If marking default, clear others
      if (payload.is_default) {
        await supabase.from('inventory_locations')
          .update({ is_default: false })
          .eq('vendor_id', payload.vendor_id)
          .neq('id', editing.id || '00000000-0000-0000-0000-000000000000');
      }

      toast.success(editing.id ? 'Location updated' : 'Location created');
      setEditing(null);
      await load();
    } catch (e: any) { toast.error(e.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this location? Inventory levels referencing it will be affected.')) return;
    try {
      const { error } = await supabase.from('inventory_locations').delete().eq('id', id);
      if (error) throw error;
      toast.success('Deleted');
      await load();
    } catch (e: any) { toast.error(e.message || 'Delete failed'); }
  };

  const toggleActive = async (l: Loc) => {
    try {
      const { error } = await supabase.from('inventory_locations').update({ is_active: !l.is_active }).eq('id', l.id);
      if (error) throw error;
      await load();
    } catch (e: any) { toast.error(e.message || 'Update failed'); }
  };

  const makeDefault = async (l: Loc) => {
    try {
      await supabase.from('inventory_locations').update({ is_default: false }).eq('vendor_id', l.vendor_id);
      const { error } = await supabase.from('inventory_locations').update({ is_default: true }).eq('id', l.id);
      if (error) throw error;
      toast.success('Set as default');
      await load();
    } catch (e: any) { toast.error(e.message || 'Update failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2"><Warehouse className="h-6 w-6" /> Inventory Locations</h2>
          <p className="text-sm text-muted-foreground">Warehouses and fulfillment centers per vendor for multi-location stock.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
          <Button size="sm" onClick={() => startEdit()}><Plus className="h-4 w-4 mr-1" />New location</Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Input placeholder="Search name, code, city, pincode…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
        <Select value={vendorFilter} onValueChange={setVendorFilter}>
          <SelectTrigger className="w-56"><SelectValue placeholder="All vendors" /></SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="all">All vendors</SelectItem>
            {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.brand_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No locations found.</CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map(l => {
            const a = l.address || {};
            return (
              <Card key={l.id}>
                <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-base truncate flex items-center gap-1">
                      {l.is_default && <Star className="h-4 w-4 fill-amber-400 text-amber-400" />}
                      {l.name}
                    </CardTitle>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <Badge variant="outline" className="font-mono">{l.code}</Badge>
                      <Badge variant={l.is_active ? 'default' : 'secondary'}>{l.is_active ? 'Active' : 'Inactive'}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 truncate">{vendorMap[l.vendor_id] || l.vendor_id.slice(0, 8)}</div>
                  </div>
                  <Switch checked={l.is_active} onCheckedChange={() => toggleActive(l)} />
                </CardHeader>
                <CardContent className="pt-2 space-y-2 text-sm">
                  {(a.city || a.pincode) && (
                    <div className="flex items-start gap-1 text-muted-foreground">
                      <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                      <span className="truncate">
                        {[a.line1, a.line2, a.city, a.state, a.pincode].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                  <div className="flex gap-2 pt-1 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => startEdit(l)}><Edit className="h-4 w-4 mr-1" />Edit</Button>
                    {!l.is_default && (
                      <Button variant="ghost" size="sm" onClick={() => makeDefault(l)}>
                        <Star className="h-4 w-4 mr-1" />Make default
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => remove(l.id)}>
                      <Trash2 className="h-4 w-4 mr-1" />Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? 'Edit location' : 'New location'}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Vendor *</Label>
                <Select value={editing.vendor_id || ''} onValueChange={(v) => setEditing({ ...editing, vendor_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Choose vendor" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.brand_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Name *</Label>
                <Input value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div>
                <Label>Code *</Label>
                <Input value={editing.code || ''} onChange={(e) => setEditing({ ...editing, code: e.target.value })} placeholder="e.g. WH-MUM-01" />
              </div>
              <div className="sm:col-span-2"><Label>Address line 1</Label>
                <Input value={editing.address?.line1 || ''} onChange={(e) => updAddr('line1', e.target.value)} /></div>
              <div className="sm:col-span-2"><Label>Address line 2</Label>
                <Input value={editing.address?.line2 || ''} onChange={(e) => updAddr('line2', e.target.value)} /></div>
              <div><Label>City</Label>
                <Input value={editing.address?.city || ''} onChange={(e) => updAddr('city', e.target.value)} /></div>
              <div><Label>State</Label>
                <Input value={editing.address?.state || ''} onChange={(e) => updAddr('state', e.target.value)} /></div>
              <div><Label>Pincode</Label>
                <Input value={editing.address?.pincode || ''} onChange={(e) => updAddr('pincode', e.target.value)} /></div>
              <div><Label>Country</Label>
                <Input value={editing.address?.country || 'India'} onChange={(e) => updAddr('country', e.target.value)} /></div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div><div className="text-sm font-medium">Default location</div>
                  <div className="text-xs text-muted-foreground">Used when no location is specified</div></div>
                <Switch checked={editing.is_default ?? false} onCheckedChange={(v) => setEditing({ ...editing, is_default: v })} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div><div className="text-sm font-medium">Active</div>
                  <div className="text-xs text-muted-foreground">Inactive locations cannot fulfill</div></div>
                <Switch checked={editing.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save location'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default InventoryLocationsManager;
