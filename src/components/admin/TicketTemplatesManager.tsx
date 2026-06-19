import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { haptic } from '@/lib/haptics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Copy, Edit, FileText, Hash, MessageSquareText, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';

type TicketTemplate = {
  id: string;
  name: string;
  category: string;
  subject: string | null;
  body: string;
  shortcut: string | null;
  is_active: boolean;
  usage_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

const CATEGORIES = ['general', 'order', 'shipping', 'returns', 'refund', 'payment', 'technical', 'greeting', 'closing', 'escalation'];
const PLACEHOLDERS = ['{{customer_name}}', '{{order_number}}', '{{ticket_id}}', '{{agent_name}}', '{{tracking_url}}', '{{refund_amount}}'];

const blank = (): Partial<TicketTemplate> => ({
  name: '',
  category: 'general',
  subject: '',
  body: '',
  shortcut: '',
  is_active: true,
});

const normalizeShortcut = (value?: string | null) => value?.trim().replace(/^\/+/, '').toLowerCase() || null;

export function TicketTemplatesManager() {
  const [rows, setRows] = useState<TicketTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<TicketTemplate> | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ticket_templates')
        .select('*')
        .order('usage_count', { ascending: false })
        .order('updated_at', { ascending: false });
      if (error) throw error;
      setRows((data as TicketTemplate[]) || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load ticket templates');
      haptic('error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(row => {
      if (categoryFilter !== 'all' && row.category !== categoryFilter) return false;
      if (statusFilter === 'active' && !row.is_active) return false;
      if (statusFilter === 'inactive' && row.is_active) return false;
      if (!q) return true;
      return [row.name, row.category, row.subject || '', row.body, row.shortcut || ''].some(value => value.toLowerCase().includes(q));
    });
  }, [categoryFilter, rows, search, statusFilter]);

  const stats = useMemo(() => ({
    total: rows.length,
    active: rows.filter(row => row.is_active).length,
    shortcuts: rows.filter(row => !!row.shortcut).length,
    uses: rows.reduce((sum, row) => sum + (row.usage_count || 0), 0),
  }), [rows]);

  const startEdit = (template?: TicketTemplate) => {
    setEditing(template ? { ...template, shortcut: template.shortcut?.replace(/^\/+/, '') || '' } : blank());
    haptic('selection');
  };

  const save = async () => {
    if (!editing?.name?.trim()) return toast.error('Name is required');
    if (!editing.body?.trim()) return toast.error('Response body is required');
    if (editing.name.trim().length > 100) return toast.error('Name must be under 100 characters');
    const shortcut = normalizeShortcut(editing.shortcut);
    if (shortcut && !/^[a-z0-9_-]{2,40}$/.test(shortcut)) return toast.error('Shortcut must be 2–40 letters, numbers, hyphens, or underscores');
    const duplicate = shortcut && rows.some(row => row.id !== editing.id && normalizeShortcut(row.shortcut) === shortcut);
    if (duplicate) return toast.error('Shortcut is already used by another template');
    setSaving(true);
    try {
      const payload = {
        name: editing.name.trim(),
        category: editing.category || 'general',
        subject: editing.subject?.trim() || null,
        body: editing.body.trim(),
        shortcut,
        is_active: editing.is_active ?? true,
      };
      if (editing.id) {
        const { error } = await supabase.from('ticket_templates').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { data: auth } = await supabase.auth.getUser();
        const { error } = await supabase.from('ticket_templates').insert({ ...payload, created_by: auth.user?.id ?? null });
        if (error) throw error;
      }
      toast.success(editing.id ? 'Template updated' : 'Template created');
      haptic('success');
      setEditing(null);
      await load();
    } catch (error: any) {
      toast.error(error.message || 'Save failed');
      haptic('error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this ticket template?')) return;
    try {
      const { error } = await supabase.from('ticket_templates').delete().eq('id', id);
      if (error) throw error;
      toast.success('Template deleted');
      await load();
    } catch (error: any) {
      toast.error(error.message || 'Delete failed');
      haptic('error');
    }
  };

  const toggleActive = async (template: TicketTemplate) => {
    try {
      const { error } = await supabase.from('ticket_templates').update({ is_active: !template.is_active }).eq('id', template.id);
      if (error) throw error;
      haptic('selection');
      await load();
    } catch (error: any) {
      toast.error(error.message || 'Status update failed');
      haptic('error');
    }
  };

  const copyBody = async (template: TicketTemplate) => {
    try {
      await navigator.clipboard.writeText(template.body);
      await supabase.from('ticket_templates').update({ usage_count: (template.usage_count || 0) + 1 }).eq('id', template.id);
      toast.success('Copied and usage counted');
      haptic('success');
      await load();
    } catch {
      toast.error('Copy failed');
      haptic('error');
    }
  };

  const insertPlaceholder = (token: string) => {
    if (!editing) return;
    setEditing({ ...editing, body: `${editing.body || ''}${editing.body ? ' ' : ''}${token}` });
    haptic('selection');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2"><MessageSquareText className="h-6 w-6" /> Ticket Templates</h2>
          <p className="text-sm text-muted-foreground">Advanced response library for support workflows, shortcuts, subjects, usage tracking, and active-state governance.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
          <Button size="sm" onClick={() => startEdit()}><Plus className="h-4 w-4 mr-1" />New template</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="pt-5"><div className="text-xs text-muted-foreground">Templates</div><div className="text-2xl font-semibold">{stats.total}</div></CardContent></Card>
        <Card><CardContent className="pt-5"><div className="text-xs text-muted-foreground">Active</div><div className="text-2xl font-semibold">{stats.active}</div></CardContent></Card>
        <Card><CardContent className="pt-5"><div className="text-xs text-muted-foreground">Shortcuts</div><div className="text-2xl font-semibold">{stats.shortcuts}</div></CardContent></Card>
        <Card><CardContent className="pt-5"><div className="text-xs text-muted-foreground">Usage</div><div className="text-2xl font-semibold">{stats.uses}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex gap-2 flex-wrap">
            <div className="relative min-w-[240px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search name, subject, body, shortcut…" value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {CATEGORIES.map(category => <SelectItem key={category} value={category} className="capitalize">{category}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-16 rounded-lg" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed py-12 text-center text-muted-foreground">No ticket templates found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Shortcut</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(template => (
                  <TableRow key={template.id}>
                    <TableCell className="max-w-[420px]">
                      <div className="font-medium truncate">{template.name}</div>
                      {template.subject && <div className="text-xs text-muted-foreground truncate">Subject: {template.subject}</div>}
                      <div className="text-sm text-muted-foreground line-clamp-2 whitespace-pre-wrap">{template.body}</div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{template.category}</Badge></TableCell>
                    <TableCell>{template.shortcut ? <Badge variant="secondary" className="font-mono"><Hash className="h-3 w-3 mr-1" />{template.shortcut}</Badge> : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>{template.usage_count || 0}</TableCell>
                    <TableCell><Switch checked={template.is_active} onCheckedChange={() => toggleActive(template)} /></TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => copyBody(template)}><Copy className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => startEdit(template)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => remove(template.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? 'Edit ticket template' : 'New ticket template'}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Name *</Label>
                <Input value={editing.name || ''} onChange={(event) => setEditing({ ...editing, name: event.target.value })} maxLength={100} />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={editing.category || 'general'} onValueChange={(value) => setEditing({ ...editing, category: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(category => <SelectItem key={category} value={category} className="capitalize">{category}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Subject</Label>
                <Input value={editing.subject || ''} onChange={(event) => setEditing({ ...editing, subject: event.target.value })} placeholder="Optional email/chat subject" />
              </div>
              <div>
                <Label>Shortcut</Label>
                <Input value={editing.shortcut || ''} onChange={(event) => setEditing({ ...editing, shortcut: event.target.value })} placeholder="shipping-delay" />
                <p className="mt-1 text-xs text-muted-foreground">Agents insert with /shortcut. Duplicates are blocked before save.</p>
              </div>
              <div className="sm:col-span-2">
                <div className="mb-2 flex items-center justify-between gap-2 flex-wrap">
                  <Label>Body *</Label>
                  <div className="flex gap-1 flex-wrap">
                    {PLACEHOLDERS.map(token => <Button key={token} type="button" variant="outline" size="sm" onClick={() => insertPlaceholder(token)}>{token}</Button>)}
                  </div>
                </div>
                <Textarea rows={9} value={editing.body || ''} onChange={(event) => setEditing({ ...editing, body: event.target.value })} placeholder="Hi {{customer_name}}, …" />
              </div>
              <div className="sm:col-span-2 flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="text-sm font-medium flex items-center gap-2"><FileText className="h-4 w-4" /> Active template</div>
                  <div className="text-xs text-muted-foreground">Inactive templates remain archived but hidden from normal support flows.</div>
                </div>
                <Switch checked={editing.is_active ?? true} onCheckedChange={(value) => setEditing({ ...editing, is_active: value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save template'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TicketTemplatesManager;