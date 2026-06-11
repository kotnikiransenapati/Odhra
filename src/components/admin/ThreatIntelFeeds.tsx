import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Shield, AlertTriangle, Plus, Upload, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Feed {
  id: string; name: string; description: string | null; source_url: string | null;
  feed_type: string; severity: string; is_active: boolean;
  last_synced_at: string | null; indicator_count: number;
}

const TYPES = ['ip', 'domain', 'hash', 'email'];
const SEVS = ['low', 'medium', 'high', 'critical'];

export function ThreatIntelFeeds() {
  const [stats, setStats] = useState<any>({});
  const [rows, setRows] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState<Feed | null>(null);
  const [importText, setImportText] = useState('');
  const [form, setForm] = useState({
    name: '', description: '', source_url: '',
    feed_type: 'ip', severity: 'medium', is_active: true,
  });

  const load = async () => {
    setLoading(true);
    const [s, l] = await Promise.all([
      supabase.rpc('admin_threat_feeds_stats' as any),
      supabase.rpc('admin_threat_feeds_list' as any),
    ]);
    if (s.error) toast.error(s.error.message); else setStats(s.data || {});
    if (l.error) toast.error(l.error.message); else setRows((l.data as Feed[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    const { error } = await supabase.rpc('admin_upsert_threat_feed' as any, {
      _id: null, _name: form.name.trim(), _description: form.description || null,
      _source_url: form.source_url || null, _feed_type: form.feed_type,
      _severity: form.severity, _is_active: form.is_active,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Feed created');
    setOpen(false);
    setForm({ name: '', description: '', source_url: '', feed_type: 'ip', severity: 'medium', is_active: true });
    load();
  };

  const doImport = async () => {
    if (!importOpen) return;
    const values = importText.split('\n').map(l => l.trim()).filter(Boolean);
    if (values.length === 0) { toast.error('No indicators to import'); return; }
    const payload = values.map(v => ({ value: v }));
    const { data, error } = await supabase.rpc('admin_add_threat_indicators' as any, {
      _feed_id: importOpen.id, _indicators: payload, _severity: null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(`Imported ${data ?? values.length} indicators`);
    setImportOpen(null);
    setImportText('');
    load();
  };

  const sevColor = (s: string) =>
    s === 'critical' ? 'destructive' : s === 'high' ? 'destructive' : s === 'medium' ? 'secondary' : 'outline';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Shield className="w-6 h-6" /> Threat Intelligence Feeds</h2>
          <p className="text-sm text-muted-foreground">Maintain blocklists of malicious IPs, domains, hashes, and emails</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />New Feed</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Threat Feed</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="abuse-ch-ipblocklist" /></div>
                <div><Label>Description</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                <div><Label>Source URL</Label><Input value={form.source_url} onChange={e => setForm({ ...form, source_url: e.target.value })} placeholder="https://..." /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Type</Label>
                    <Select value={form.feed_type} onValueChange={v => setForm({ ...form, feed_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Default Severity</Label>
                    <Select value={form.severity} onValueChange={v => setForm({ ...form, severity: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{SEVS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label>Active</Label>
                  <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
                </div>
                <Button onClick={save} className="w-full">Save</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { l: 'Total Feeds', v: stats.feeds_total ?? 0 },
          { l: 'Active Feeds', v: stats.feeds_active ?? 0 },
          { l: 'Indicators', v: stats.indicators_total ?? 0 },
          { l: 'Critical', v: stats.critical_indicators ?? 0, color: 'text-destructive' },
          { l: 'Stale (>7d)', v: stats.stale_feeds ?? 0, color: 'text-amber-600' },
        ].map((k, i) => (
          <Card key={i}><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{k.l}</p>
            <p className={`text-2xl font-bold mt-1 ${(k as any).color && Number(k.v) > 0 ? (k as any).color : ''}`}>{k.v}</p>
          </CardContent></Card>
        ))}
      </div>

      {(stats.stale_feeds ?? 0) > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-sm">
          <AlertTriangle className="w-4 h-4" />
          {stats.stale_feeds} feed(s) have not synced in over 7 days. Refresh their indicators.
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Feeds</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> :
           rows.length === 0 ? <p className="text-sm text-muted-foreground">No feeds configured yet.</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Name</TableHead><TableHead>Type</TableHead>
                  <TableHead>Severity</TableHead><TableHead>Indicators</TableHead>
                  <TableHead>Last Sync</TableHead><TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {rows.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell><Badge variant="outline">{r.feed_type}</Badge></TableCell>
                      <TableCell><Badge variant={sevColor(r.severity) as any}>{r.severity}</Badge></TableCell>
                      <TableCell>{r.indicator_count}</TableCell>
                      <TableCell className="text-xs">{r.last_synced_at ? formatDistanceToNow(new Date(r.last_synced_at), { addSuffix: true }) : 'Never'}</TableCell>
                      <TableCell>{r.is_active ? <Badge>Active</Badge> : <Badge variant="outline">Off</Badge>}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => { setImportOpen(r); setImportText(''); }}>
                          <Upload className="w-3 h-3 mr-1" />Import
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!importOpen} onOpenChange={v => !v && setImportOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Import Indicators · {importOpen?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">One {importOpen?.feed_type} per line. Duplicates are upserted.</p>
            <Textarea rows={10} value={importText} onChange={e => setImportText(e.target.value)} className="font-mono text-xs" />
            <Button onClick={doImport} className="w-full"><Upload className="w-4 h-4 mr-2" />Import</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
