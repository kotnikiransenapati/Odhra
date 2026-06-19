import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { LayoutGrid, RefreshCw, ChevronUp, ChevronDown, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Widget {
  id: string; widget_key: string; title: string; position: number;
  size: 'small'|'medium'|'large'|'full'; config: any; is_visible: boolean;
}

const SIZE_CLASS: Record<Widget['size'], string> = {
  small: 'col-span-1', medium: 'col-span-1 sm:col-span-2',
  large: 'col-span-1 sm:col-span-2 md:col-span-3', full: 'col-span-full',
};

export function AdminDashboardWidgets() {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    await supabase.rpc('admin_widgets_seed' as any);
    const { data, error } = await supabase.rpc('admin_widgets_list' as any);
    if (error) toast.error(error.message); else setWidgets((data as Widget[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const move = async (idx: number, dir: -1 | 1) => {
    const next = [...widgets];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setWidgets(next);
    await supabase.rpc('admin_widgets_reorder' as any, { _ids: next.map(w => w.id) });
  };

  const updateField = async (id: string, patch: Partial<Widget>) => {
    setWidgets(ws => ws.map(w => w.id === id ? { ...w, ...patch } : w));
    const { error } = await supabase.from('admin_dashboard_widgets' as any).update(patch).eq('id', id);
    if (error) toast.error(error.message);
  };

  const reset = async () => {
    if (!confirm('Reset to default widgets? Your customizations will be lost.')) return;
    await supabase.from('admin_dashboard_widgets' as any).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><LayoutGrid className="w-6 h-6" /> Dashboard Widgets</h2>
          <p className="text-sm text-muted-foreground">Personalize your admin homepage — reorder, resize, show/hide</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
          <Button variant={editing ? 'default' : 'outline'} size="sm" onClick={() => setEditing(!editing)}>
            {editing ? 'Done Editing' : 'Edit Layout'}
          </Button>
          {editing && <Button variant="ghost" size="sm" onClick={reset}><RotateCcw className="w-4 h-4 mr-1" />Reset</Button>}
        </div>
      </div>

      {loading ? <div className="text-sm text-muted-foreground p-6">Loading widgets…</div> :
       widgets.length === 0 ? <div className="text-sm text-muted-foreground p-6 text-center">No widgets configured.</div> :
       <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {widgets.filter(w => editing || w.is_visible).map((w, idx) => (
          <Card key={w.id} className={cn(SIZE_CLASS[w.size], !w.is_visible && 'opacity-50 border-dashed')}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm flex items-center gap-2 truncate">
                  {w.title}
                  {editing && !w.is_visible && <Badge variant="outline" className="text-[10px]">hidden</Badge>}
                </CardTitle>
                {editing && (
                  <div className="flex items-center gap-0.5">
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => move(idx, -1)}><ChevronUp className="w-3 h-3" /></Button>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => move(idx, 1)}><ChevronDown className="w-3 h-3" /></Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {editing ? (
                <div className="space-y-2">
                  <Select value={w.size} onValueChange={v => updateField(w.id, { size: v as Widget['size'] })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(['small','medium','large','full'] as const).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1">{w.is_visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />} Visible</span>
                    <Switch checked={w.is_visible} onCheckedChange={v => updateField(w.id, { is_visible: v })} />
                  </div>
                  <p className="text-[10px] text-muted-foreground font-mono">{w.widget_key}</p>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  <span className="font-mono">{w.widget_key}</span>
                  <p className="mt-2 italic">Wire this widget to its data source.</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>}
    </div>
  );
}
