import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Megaphone, Plus } from "lucide-react";
import { toast } from "sonner";

type Banner = {
  id: string;
  message: string;
  variant: "info" | "warning" | "success" | "error";
  link_url: string | null;
  link_label: string | null;
  audience: "all" | "customers" | "vendors" | "admins";
  dismissible: boolean;
  enabled: boolean;
  starts_at: string;
  ends_at: string | null;
};

const empty = {
  message: "",
  variant: "info" as Banner["variant"],
  link_url: "",
  link_label: "",
  audience: "all" as Banner["audience"],
  dismissible: true,
  enabled: true,
  ends_at: "",
};

export function BroadcastBannerManager() {
  const [items, setItems] = useState<Banner[]>([]);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("broadcast_banners")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setItems((data as Banner[]) || []);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.message.trim()) return toast.error("Message required");
    setSaving(true);
    const { error } = await supabase.from("broadcast_banners").insert({
      message: form.message.trim(),
      variant: form.variant,
      link_url: form.link_url || null,
      link_label: form.link_label || null,
      audience: form.audience,
      dismissible: form.dismissible,
      enabled: form.enabled,
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Banner created");
      setForm(empty);
      load();
    }
  };

  const toggle = async (b: Banner) => {
    const { error } = await supabase.from("broadcast_banners").update({ enabled: !b.enabled }).eq("id", b.id);
    if (error) toast.error(error.message); else load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this banner?")) return;
    const { error } = await supabase.from("broadcast_banners").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Megaphone className="h-6 w-6" /> Broadcast Banners
        </h2>
        <p className="text-sm text-muted-foreground">Site-wide announcements shown above every page.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">New banner</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              maxLength={500}
              placeholder="We're running a flash sale tonight — extra 10% off at checkout."
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Variant</Label>
              <Select value={form.variant} onValueChange={(v) => setForm({ ...form, variant: v as Banner["variant"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Audience</Label>
              <Select value={form.audience} onValueChange={(v) => setForm({ ...form, audience: v as Banner["audience"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Everyone</SelectItem>
                  <SelectItem value="customers">Signed-in customers</SelectItem>
                  <SelectItem value="vendors">Vendors</SelectItem>
                  <SelectItem value="admins">Admins</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ends at (optional)</Label>
              <Input type="datetime-local" value={form.ends_at}
                onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Link URL</Label>
              <Input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="/flash-sales" />
            </div>
            <div className="space-y-2">
              <Label>Link label</Label>
              <Input value={form.link_label} onChange={(e) => setForm({ ...form, link_label: e.target.value })} placeholder="Shop now" />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.dismissible} onCheckedChange={(c) => setForm({ ...form, dismissible: c })} />
              Dismissible
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.enabled} onCheckedChange={(c) => setForm({ ...form, enabled: c })} />
              Enabled
            </label>
          </div>
          <Button onClick={create} disabled={saving}>
            <Plus className="h-4 w-4 mr-2" /> Create banner
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Existing banners</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {items.length === 0 && <p className="text-sm text-muted-foreground">No banners yet.</p>}
          {items.map((b) => (
            <div key={b.id} className="flex items-center justify-between gap-4 border rounded-md p-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={b.enabled ? "default" : "outline"}>{b.variant}</Badge>
                  <Badge variant="secondary">{b.audience}</Badge>
                  {!b.dismissible && <Badge variant="outline">sticky</Badge>}
                </div>
                <p className="text-sm truncate">{b.message}</p>
                {b.ends_at && <p className="text-xs text-muted-foreground">ends {new Date(b.ends_at).toLocaleString()}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={b.enabled} onCheckedChange={() => toggle(b)} />
                <Button size="icon" variant="ghost" onClick={() => remove(b.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default BroadcastBannerManager;
