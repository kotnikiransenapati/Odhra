import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { BookOpen, Plus, Edit, Trash2, RefreshCw, Eye } from 'lucide-react';

type Cat = {
  id: string; slug: string; name: string; description: string | null;
  icon: string | null; sort_order: number; is_active: boolean;
};

type Article = {
  id: string; category_id: string | null; slug: string; title: string;
  excerpt: string | null; body_md: string; tags: string[] | null;
  status: 'draft' | 'published' | 'archived';
  view_count: number; helpful_count: number; not_helpful_count: number;
  sort_order: number; published_at: string | null;
};

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);

export function KnowledgeBaseManager() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [arts, setArts] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('articles');

  const [editingCat, setEditingCat] = useState<Partial<Cat> | null>(null);
  const [editingArt, setEditingArt] = useState<Partial<Article> | null>(null);
  const [tagsText, setTagsText] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, a] = await Promise.all([
        supabase.from('kb_categories').select('*').order('sort_order', { ascending: true }),
        supabase.from('kb_articles').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: false }),
      ]);
      if (c.error) throw c.error;
      if (a.error) throw a.error;
      setCats((c.data as Cat[]) || []);
      setArts((a.data as Article[]) || []);
    } catch (e: any) { toast.error(e.message || 'Failed'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveCat = async () => {
    if (!editingCat?.name) { toast.error('Name required'); return; }
    setSaving(true);
    try {
      const payload = {
        slug: editingCat.slug || slugify(editingCat.name!),
        name: editingCat.name!,
        description: editingCat.description || null,
        icon: editingCat.icon || null,
        sort_order: editingCat.sort_order ?? 0,
        is_active: editingCat.is_active ?? true,
      };
      const { error } = (editingCat as Cat).id
        ? await supabase.from('kb_categories').update(payload).eq('id', (editingCat as Cat).id)
        : await supabase.from('kb_categories').insert(payload);
      if (error) throw error;
      toast.success('Category saved');
      setEditingCat(null);
      load();
    } catch (e: any) { toast.error(e.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const delCat = async (id: string) => {
    if (!window.confirm('Delete this category?')) return;
    const { error } = await supabase.from('kb_categories').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Deleted');
    load();
  };

  const openNewArt = () => {
    setEditingArt({
      slug: '', title: '', excerpt: '', body_md: '',
      status: 'draft', tags: [], sort_order: 0, category_id: null,
    });
    setTagsText('');
  };

  const openEditArt = (a: Article) => {
    setEditingArt(a);
    setTagsText((a.tags || []).join(', '));
  };

  const saveArt = async () => {
    if (!editingArt?.title) { toast.error('Title required'); return; }
    setSaving(true);
    try {
      const tags = tagsText.split(',').map(s => s.trim()).filter(Boolean);
      const isPub = editingArt.status === 'published';
      const payload = {
        category_id: editingArt.category_id || null,
        slug: editingArt.slug || slugify(editingArt.title!),
        title: editingArt.title!,
        excerpt: editingArt.excerpt || null,
        body_md: editingArt.body_md || '',
        tags,
        status: editingArt.status || 'draft',
        sort_order: editingArt.sort_order ?? 0,
        published_at: isPub
          ? ((editingArt as Article).published_at || new Date().toISOString())
          : null,
      };
      const { error } = (editingArt as Article).id
        ? await supabase.from('kb_articles').update(payload).eq('id', (editingArt as Article).id)
        : await supabase.from('kb_articles').insert(payload);
      if (error) throw error;
      toast.success('Article saved');
      setEditingArt(null);
      load();
    } catch (e: any) { toast.error(e.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const delArt = async (id: string) => {
    if (!window.confirm('Delete this article?')) return;
    const { error } = await supabase.from('kb_articles').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Deleted');
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-6 w-6" /> Help Center / Knowledge Base
          </h2>
          <p className="text-sm text-muted-foreground">
            Customer-facing articles organized by category, with views & helpfulness analytics.
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={load} aria-label="Refresh"><RefreshCw className="h-4 w-4" /></Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="articles">Articles ({arts.length})</TabsTrigger>
          <TabsTrigger value="categories">Categories ({cats.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="articles" className="mt-4 space-y-3">
          <Button onClick={openNewArt} className="gap-1"><Plus className="h-4 w-4" /> New Article</Button>
          {loading ? (
            <div className="grid gap-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
          ) : arts.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-muted-foreground">No articles</CardContent></Card>
          ) : (
            <div className="grid gap-2">
              {arts.map(a => {
                const cat = cats.find(c => c.id === a.category_id);
                return (
                  <Card key={a.id}>
                    <CardContent className="py-3 flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">{a.title}</span>
                          <Badge variant={a.status === 'published' ? 'default' : 'outline'}>{a.status}</Badge>
                          {cat && <Badge variant="secondary">{cat.name}</Badge>}
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Eye className="h-3 w-3" />{a.view_count}
                          </span>
                        </div>
                        <code className="text-xs text-muted-foreground">/{a.slug}</code>
                        {(a.tags || []).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(a.tags || []).map(t => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => openEditArt(a)}><Edit className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="outline" onClick={() => delArt(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="categories" className="mt-4 space-y-3">
          <Button onClick={() => setEditingCat({ name: '', slug: '', sort_order: 0, is_active: true })} className="gap-1">
            <Plus className="h-4 w-4" /> New Category
          </Button>
          {loading ? (
            <div className="grid gap-2 md:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
          ) : cats.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-muted-foreground">No categories</CardContent></Card>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {cats.map(c => (
                <Card key={c.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center justify-between">
                      {c.name}
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => setEditingCat(c)}><Edit className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="outline" onClick={() => delCat(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground">
                    <code>/{c.slug}</code>
                    {c.description && <p className="mt-1">{c.description}</p>}
                    {!c.is_active && <Badge variant="outline" className="mt-1">Inactive</Badge>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Category dialog */}
      <Dialog open={!!editingCat} onOpenChange={(o) => !o && setEditingCat(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{(editingCat as Cat)?.id ? 'Edit Category' : 'New Category'}</DialogTitle></DialogHeader>
          {editingCat && (
            <div className="grid gap-3">
              <div><Label>Name</Label>
                <Input value={editingCat.name || ''} onChange={(e) => setEditingCat({ ...editingCat, name: e.target.value, slug: editingCat.slug || slugify(e.target.value) })} /></div>
              <div><Label>Slug</Label>
                <Input value={editingCat.slug || ''} onChange={(e) => setEditingCat({ ...editingCat, slug: slugify(e.target.value) })} /></div>
              <div><Label>Description</Label>
                <Input value={editingCat.description || ''} onChange={(e) => setEditingCat({ ...editingCat, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Icon</Label>
                  <Input value={editingCat.icon || ''} onChange={(e) => setEditingCat({ ...editingCat, icon: e.target.value })} /></div>
                <div><Label>Sort Order</Label>
                  <Input type="number" value={editingCat.sort_order ?? 0} onChange={(e) => setEditingCat({ ...editingCat, sort_order: parseInt(e.target.value) || 0 })} /></div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editingCat.is_active ?? true} onCheckedChange={(v) => setEditingCat({ ...editingCat, is_active: v })} />
                <Label>Active</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCat(null)}>Cancel</Button>
            <Button onClick={saveCat} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Article dialog */}
      <Dialog open={!!editingArt} onOpenChange={(o) => !o && setEditingArt(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{(editingArt as Article)?.id ? 'Edit Article' : 'New Article'}</DialogTitle></DialogHeader>
          {editingArt && (
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Title</Label>
                  <Input value={editingArt.title || ''} onChange={(e) => setEditingArt({ ...editingArt, title: e.target.value, slug: editingArt.slug || slugify(e.target.value) })} /></div>
                <div><Label>Slug</Label>
                  <Input value={editingArt.slug || ''} onChange={(e) => setEditingArt({ ...editingArt, slug: slugify(e.target.value) })} /></div>
                <div><Label>Category</Label>
                  <select className="w-full rounded-md border bg-background p-2 text-sm"
                    value={editingArt.category_id || ''}
                    onChange={(e) => setEditingArt({ ...editingArt, category_id: e.target.value || null })}>
                    <option value="">— None —</option>
                    {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select></div>
                <div><Label>Status</Label>
                  <select className="w-full rounded-md border bg-background p-2 text-sm"
                    value={editingArt.status || 'draft'}
                    onChange={(e) => setEditingArt({ ...editingArt, status: e.target.value as Article['status'] })}>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select></div>
              </div>
              <div><Label>Excerpt</Label>
                <Input value={editingArt.excerpt || ''} onChange={(e) => setEditingArt({ ...editingArt, excerpt: e.target.value })} /></div>
              <div><Label>Body (Markdown)</Label>
                <textarea className="w-full min-h-[200px] rounded-md border bg-background p-2 text-sm font-mono"
                  value={editingArt.body_md || ''} onChange={(e) => setEditingArt({ ...editingArt, body_md: e.target.value })} /></div>
              <div><Label>Tags (comma-separated)</Label>
                <Input value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="orders, shipping, refunds" /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingArt(null)}>Cancel</Button>
            <Button onClick={saveArt} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default KnowledgeBaseManager;
