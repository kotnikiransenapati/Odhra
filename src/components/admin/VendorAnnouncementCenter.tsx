import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Megaphone, Plus, RefreshCw, Edit, Trash2, Send, Archive, Eye } from 'lucide-react';

const PRIORITY_COLOR: Record<string, 'default'|'secondary'|'destructive'|'outline'> = {
  low: 'outline', normal: 'secondary', high: 'default', critical: 'destructive',
};
const CATEGORIES = ['general','policy','payout','product','outage','promotion'];
const TARGET_MODES = [
  { value: 'all', label: 'All Vendors' },
  { value: 'kyc_verified', label: 'KYC Verified Only' },
  { value: 'specific', label: 'Specific Vendors' },
];

interface Announcement {
  id: string; title: string; body: string; priority: string; category: string;
  target_mode: string; target_vendor_ids: string[]; cta_label: string | null; cta_url: string | null;
  status: string; publish_at: string | null; expires_at: string | null;
  read_count: number; created_at: string;
}

const emptyForm = {
  title: '', body: '', priority: 'normal', category: 'general',
  target_mode: 'all', target_vendor_ids: '', cta_label: '', cta_url: '',
  publish_at: '', expires_at: '',
};

export function VendorAnnouncementCenter() {
  const [tab, setTab] = useState<'all'|'draft'|'published'|'archived'>('all');
  const [rows, setRows] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('admin_vendor_announcements_list' as any, {
      _status: tab === 'all' ? null : tab,
    });
    if (error) toast.error(error.message); else setRows((data as Announcement[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab]);

  const save = async () => {
    if (form.title.trim().length < 3 || form.body.trim().length < 5) {
      toast.error('Title ≥ 3 and body ≥ 5 chars'); return;
    }
    const { data: u } = await supabase.auth.getUser();
    const payload: any = {
      title: form.title.trim(),
      body: form.body.trim(),
      priority: form.priority,
      category: form.category,
      target_mode: form.target_mode,
      target_vendor_ids: form.target_mode === 'specific'
        ? form.target_vendor_ids.split(',').map(s => s.trim()).filter(Boolean)
        : [],
      cta_label: form.cta_label || null,
      cta_url: form.cta_url || null,
      publish_at: form.publish_at || null,
      expires_at: form.expires_at || null,
    };
    if (editing) {
      const { error } = await supabase.from('vendor_announcements' as any).update(payload).eq('id', editing);
      if (error) { toast.error(error.message); return; }
      toast.success('Updated');
    } else {
      const { error } = await supabase.from('vendor_announcements' as any).insert({ ...payload, created_by: u.user?.id, status: 'draft' });
      if (error) { toast.error(error.message); return; }
      toast.success('Draft created');
    }
    setOpen(false); setEditing(null); setForm(emptyForm);
    load();
  };

  const setStatus = async (id: string, status: 'published'|'archived'|'draft') => {
    const patch: any = { status };
    if (status === 'published') patch.publish_at = new Date().toISOString();
    const { error } = await supabase.from('vendor_announcements' as any).update(patch).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Marked ${status}`);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this announcement?')) return;
    const { error } = await supabase.from('vendor_announcements' as any).delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const startEdit = (a: Announcement) => {
    setEditing(a.id);
    setForm({
      title: a.title, body: a.body, priority: a.priority, category: a.category,
      target_mode: a.target_mode,
      target_vendor_ids: (a.target_vendor_ids || []).join(', '),
      cta_label: a.cta_label || '', cta_url: a.cta_url || '',
      publish_at: a.publish_at ? a.publish_at.slice(0, 16) : '',
      expires_at: a.expires_at ? a.expires_at.slice(0, 16) : '',
    });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Megaphone className="w-6 h-6" /> Vendor Announcements</h2>
          <p className="text-sm text-muted-foreground">Broadcast policies, payout updates, and outages to vendors</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditing(null); setForm(emptyForm); } }}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> New</Button></DialogTrigger>
            <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editing ? 'Edit' : 'New'} Announcement</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                <div><Label>Body</Label><Textarea rows={5} value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Priority</Label>
                    <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{['low','normal','high','critical'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Category</Label>
                    <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Target</Label>
                  <Select value={form.target_mode} onValueChange={v => setForm({ ...form, target_mode: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TARGET_MODES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {form.target_mode === 'specific' && (
                  <div><Label>Vendor IDs (comma separated)</Label>
                    <Textarea rows={2} value={form.target_vendor_ids} onChange={e => setForm({ ...form, target_vendor_ids: e.target.value })} />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>CTA Label</Label><Input value={form.cta_label} onChange={e => setForm({ ...form, cta_label: e.target.value })} /></div>
                  <div><Label>CTA URL</Label><Input value={form.cta_url} onChange={e => setForm({ ...form, cta_url: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Publish At</Label><Input type="datetime-local" value={form.publish_at} onChange={e => setForm({ ...form, publish_at: e.target.value })} /></div>
                  <div><Label>Expires At</Label><Input type="datetime-local" value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })} /></div>
                </div>
              </div>
              <DialogFooter><Button onClick={save}>{editing ? 'Update' : 'Create Draft'}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={tab} onValueChange={v => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="draft">Drafts</TabsTrigger>
          <TabsTrigger value="published">Published</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Announcements</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="text-sm text-muted-foreground">Loading…</div> :
           rows.length === 0 ? <div className="text-sm text-muted-foreground py-6 text-center">No announcements.</div> :
           <div className="space-y-3">
            {rows.map(a => (
              <div key={a.id} className="p-3 border rounded-lg">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={PRIORITY_COLOR[a.priority]}>{a.priority}</Badge>
                      <Badge variant="outline">{a.category}</Badge>
                      <Badge variant="secondary">{a.target_mode}</Badge>
                      <Badge variant={a.status === 'published' ? 'default' : 'outline'}>{a.status}</Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><Eye className="w-3 h-3" /> {a.read_count}</span>
                    </div>
                    <h3 className="font-semibold mt-2">{a.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{a.body}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {a.status === 'draft' && <Button size="sm" variant="outline" onClick={() => setStatus(a.id, 'published')}><Send className="w-4 h-4 mr-1" />Publish</Button>}
                    {a.status === 'published' && <Button size="sm" variant="outline" onClick={() => setStatus(a.id, 'archived')}><Archive className="w-4 h-4" /></Button>}
                    <Button size="sm" variant="ghost" onClick={() => startEdit(a)}><Edit className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(a.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>}
        </CardContent>
      </Card>
    </div>
  );
}
