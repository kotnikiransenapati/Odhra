import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Truck, Plus, Edit, Trash2, RefreshCw, ExternalLink } from 'lucide-react';

type Partner = {
  id: string;
  name: string;
  code: string;
  logo_url: string | null;
  api_base_url: string | null;
  tracking_url_template: string | null;
  is_active: boolean;
  supported_services: unknown;
  rate_card: unknown;
};

const blank = (): Partial<Partner> => ({
  name: '', code: '', logo_url: '', api_base_url: '',
  tracking_url_template: '', is_active: true,
  supported_services: [], rate_card: {},
});

export function DeliveryPartnersManager() {
  const [rows, setRows] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Partner> | null>(null);
  const [servicesText, setServicesText] = useState('');
  const [rateCardText, setRateCardText] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('delivery_partners')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      setRows((data as Partner[]) || []);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load partners');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const startEdit = (p?: Partner) => {
    const v = p ? { ...p } : blank();
    setEditing(v);
    setServicesText(JSON.stringify(v.supported_services ?? [], null, 2));
    setRateCardText(JSON.stringify(v.rate_card ?? {}, null, 2));
  };

  const save = async () => {
    if (!editing?.name?.trim() || !editing?.code?.trim()) {
      toast.error('Name and code are required');
      return;
    }
    setSaving(true);
    try {
      let services: unknown = [];
      let rateCard: unknown = {};
      try { services = servicesText ? JSON.parse(servicesText) : []; }
      catch { throw new Error('Supported services must be valid JSON'); }
      try { rateCard = rateCardText ? JSON.parse(rateCardText) : {}; }
      catch { throw new Error('Rate card must be valid JSON'); }

      const payload = {
        name: editing.name!.trim(),
        code: editing.code!.trim().toLowerCase(),
        logo_url: editing.logo_url || null,
        api_base_url: editing.api_base_url || null,
        tracking_url_template: editing.tracking_url_template || null,
        is_active: editing.is_active ?? true,
        supported_services: services as any,
        rate_card: rateCard as any,
      };

      const q = editing.id
        ? supabase.from('delivery_partners').update(payload).eq('id', editing.id)
        : supabase.from('delivery_partners').insert(payload);
      const { error } = await q;
      if (error) throw error;
      toast.success(editing.id ? 'Partner updated' : 'Partner added');
      setEditing(null);
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this delivery partner?')) return;
    try {
      const { error } = await supabase.from('delivery_partners').delete().eq('id', id);
      if (error) throw error;
      toast.success('Deleted');
      await load();
    } catch (e: any) { toast.error(e.message || 'Delete failed'); }
  };

  const toggleActive = async (p: Partner) => {
    try {
      const { error } = await supabase
        .from('delivery_partners')
        .update({ is_active: !p.is_active })
        .eq('id', p.id);
      if (error) throw error;
      await load();
    } catch (e: any) { toast.error(e.message || 'Update failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Truck className="h-6 w-6" /> Delivery Partners
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage shipping carriers, API endpoints, and tracking URL templates.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button size="sm" onClick={() => startEdit()}>
            <Plus className="h-4 w-4 mr-1" /> New partner
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          No delivery partners yet. Add your first one.
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((p) => (
            <Card key={p.id}>
              <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                <div className="min-w-0">
                  <CardTitle className="text-base flex items-center gap-2 truncate">
                    {p.logo_url ? (
                      <img src={p.logo_url} alt="" className="h-6 w-6 rounded object-contain bg-muted" />
                    ) : <Truck className="h-5 w-5 text-muted-foreground" />}
                    <span className="truncate">{p.name}</span>
                  </CardTitle>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                    <Badge variant="outline" className="font-mono uppercase">{p.code}</Badge>
                    <Badge variant={p.is_active ? 'default' : 'secondary'}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
                <Switch checked={p.is_active} onCheckedChange={() => toggleActive(p)} aria-label="Toggle active" />
              </CardHeader>
              <CardContent className="pt-2 space-y-2 text-sm">
                {p.api_base_url && (
                  <div className="truncate">
                    <span className="text-muted-foreground">API:</span>{' '}
                    <code className="text-xs">{p.api_base_url}</code>
                  </div>
                )}
                {p.tracking_url_template && (
                  <div className="truncate flex items-center gap-1 text-xs text-muted-foreground">
                    <ExternalLink className="h-3 w-3" />
                    <code className="truncate">{p.tracking_url_template}</code>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => startEdit(p)}>
                    <Edit className="h-4 w-4 mr-1" /> Edit
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => remove(p.id)}>
                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Edit partner' : 'New delivery partner'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Name *</Label>
                <Input value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div>
                <Label>Code *</Label>
                <Input value={editing.code || ''} onChange={(e) => setEditing({ ...editing, code: e.target.value })} placeholder="e.g. delhivery" />
              </div>
              <div className="sm:col-span-2">
                <Label>Logo URL</Label>
                <Input value={editing.logo_url || ''} onChange={(e) => setEditing({ ...editing, logo_url: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label>API base URL</Label>
                <Input value={editing.api_base_url || ''} onChange={(e) => setEditing({ ...editing, api_base_url: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label>Tracking URL template</Label>
                <Input
                  value={editing.tracking_url_template || ''}
                  onChange={(e) => setEditing({ ...editing, tracking_url_template: e.target.value })}
                  placeholder="https://carrier.com/track/{tracking_number}"
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Supported services (JSON)</Label>
                <Textarea rows={4} className="font-mono text-xs" value={servicesText} onChange={(e) => setServicesText(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label>Rate card (JSON)</Label>
                <Textarea rows={5} className="font-mono text-xs" value={rateCardText} onChange={(e) => setRateCardText(e.target.value)} />
              </div>
              <div className="sm:col-span-2 flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="text-sm font-medium">Active</div>
                  <div className="text-xs text-muted-foreground">Inactive partners are hidden from checkout</div>
                </div>
                <Switch checked={editing.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save partner'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default DeliveryPartnersManager;
