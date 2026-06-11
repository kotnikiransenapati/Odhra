import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { FileText, Plus, Trash2, Pencil, Loader2, Eye } from "lucide-react";

type Template = {
  id: string; code: string; channel: string; version: number; name: string;
  subject: string | null; body: string; variables: string[]; locale: string;
  is_active: boolean; description: string | null;
};

const EMPTY: Partial<Template> = {
  code: "", channel: "in_app", version: 1, name: "", subject: "", body: "",
  variables: [], locale: "en", is_active: true, description: "",
};

export function NotificationTemplatesRegistry() {
  const { toast } = useToast();
  const [items, setItems] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Template> | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<{ subject?: string; body?: string } | null>(null);
  const [previewVars, setPreviewVars] = useState("{}");

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("notification_templates").select("*")
      .order("channel").order("code").order("version", { ascending: false });
    if (error) toast({ title: "Load failed", description: error.message, variant: "destructive" });
    setItems((data as Template[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const startCreate = () => { setEditing({ ...EMPTY }); setOpen(true); };
  const startEdit = (t: Template) => {
    setEditing({ ...t, variables: Array.isArray(t.variables) ? t.variables : [] });
    setOpen(true);
  };

  const save = async () => {
    if (!editing?.code || !editing?.name || !editing?.body) {
      return toast({ title: "Code, name and body required", variant: "destructive" });
    }
    setSaving(true);
    const { error } = await supabase.rpc("admin_upsert_notification_template" as any, {
      _id: (editing as Template).id || null,
      _code: editing.code,
      _channel: editing.channel || "in_app",
      _version: Number(editing.version) || 1,
      _name: editing.name,
      _subject: editing.subject || null,
      _body: editing.body,
      _variables: Array.isArray(editing.variables) ? editing.variables : [],
      _locale: editing.locale || "en",
      _is_active: editing.is_active ?? true,
      _description: editing.description || null,
    });
    setSaving(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Template saved" });
    setOpen(false); load();
  };

  const toggle = async (t: Template) => {
    const { error } = await supabase.rpc("admin_toggle_notification_template" as any, { _id: t.id, _is_active: !t.is_active });
    if (error) return toast({ title: "Toggle failed", description: error.message, variant: "destructive" });
    load();
  };

  const remove = async (t: Template) => {
    if (!confirm(`Delete template "${t.code}" v${t.version}?`)) return;
    const { error } = await supabase.rpc("admin_delete_notification_template" as any, { _id: t.id });
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    toast({ title: "Deleted" }); load();
  };

  const renderPreview = async (t: Template) => {
    let vars: any = {};
    try { vars = JSON.parse(previewVars || "{}"); }
    catch { return toast({ title: "Invalid JSON variables", variant: "destructive" }); }
    const { data, error } = await supabase.rpc("admin_render_notification_template" as any, {
      _code: t.code, _channel: t.channel, _locale: t.locale, _vars: vars,
    });
    if (error) return toast({ title: "Render failed", description: error.message, variant: "destructive" });
    setPreview(data as any);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6" /> Notification Templates</h1>
          <p className="text-muted-foreground">Reusable, versioned templates for in-app, email, push, SMS, and WhatsApp.</p>
        </div>
        <Button onClick={startCreate}><Plus className="h-4 w-4 mr-2" /> New Template</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preview Variables</CardTitle>
          <CardDescription>JSON object used for the Preview action below.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea className="font-mono text-xs" rows={2} value={previewVars}
                    onChange={(e) => setPreviewVars(e.target.value)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Templates</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Loading…</div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No templates.</p>
          ) : (
            <div className="space-y-2">
              {items.map(t => (
                <div key={t.id} className="flex items-center justify-between gap-4 p-3 rounded-lg border bg-card">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-medium truncate">{t.code}</span>
                      <Badge variant="outline">{t.channel}</Badge>
                      <Badge variant="secondary">v{t.version}</Badge>
                      <Badge variant="outline">{t.locale}</Badge>
                      {!t.is_active && <Badge variant="outline" className="text-muted-foreground">Disabled</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{t.name}</p>
                    {t.subject && <p className="text-xs text-muted-foreground mt-1 truncate">Subject: {t.subject}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={t.is_active} onCheckedChange={() => toggle(t)} />
                    <Button size="icon" variant="outline" onClick={() => renderPreview(t)} title="Preview"><Eye className="h-4 w-4" /></Button>
                    <Button size="icon" variant="outline" onClick={() => startEdit(t)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="outline" onClick={() => remove(t)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{(editing as Template)?.id ? "Edit Template" : "New Template"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Code</Label>
                  <Input value={editing.code || ""} onChange={(e) => setEditing(p => ({ ...p!, code: e.target.value }))} placeholder="order_shipped" />
                </div>
                <div className="space-y-1.5">
                  <Label>Channel</Label>
                  <Select value={editing.channel} onValueChange={(v) => setEditing(p => ({ ...p!, channel: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_app">In-app</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="push">Push</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Version</Label>
                  <Input type="number" min={1} value={editing.version || 1}
                         onChange={(e) => setEditing(p => ({ ...p!, version: Number(e.target.value) }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Name</Label>
                  <Input value={editing.name || ""} onChange={(e) => setEditing(p => ({ ...p!, name: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Locale</Label>
                  <Input value={editing.locale || "en"} onChange={(e) => setEditing(p => ({ ...p!, locale: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Subject (optional)</Label>
                <Input value={editing.subject || ""} onChange={(e) => setEditing(p => ({ ...p!, subject: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Body</Label>
                <Textarea rows={6} className="font-mono text-xs"
                          value={editing.body || ""}
                          onChange={(e) => setEditing(p => ({ ...p!, body: e.target.value }))}
                          placeholder="Hello {{customer_name}}, your order {{order_id}} has shipped." />
                <p className="text-xs text-muted-foreground">Use <code>{"{{variable}}"}</code> tokens.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Variables (comma-separated)</Label>
                <Input value={(editing.variables as any || []).join(",")}
                       onChange={(e) => setEditing(p => ({ ...p!, variables: e.target.value.split(",").map(s => s.trim()).filter(Boolean) as any }))} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editing.is_active ?? true} onCheckedChange={(v) => setEditing(p => ({ ...p!, is_active: v }))} />
                <Label className="cursor-pointer">Active</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Preview</DialogTitle></DialogHeader>
          {preview?.subject && (
            <div className="space-y-1">
              <Label className="text-xs">Subject</Label>
              <p className="text-sm font-medium">{preview.subject}</p>
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-xs">Body</Label>
            <pre className="text-xs bg-muted p-3 rounded whitespace-pre-wrap">{preview?.body}</pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default NotificationTemplatesRegistry;
