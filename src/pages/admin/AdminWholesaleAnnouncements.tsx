import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Megaphone, Pin, Trash2 } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  body: string;
  link: string | null;
  cta_label: string | null;
  audience: "all" | "tier" | "specific";
  target_tiers: string[];
  target_wholesaler_ids: string[];
  priority: "low" | "normal" | "high" | "urgent";
  pinned: boolean;
  is_active: boolean;
  starts_at: string;
  expires_at: string | null;
  created_at: string;
}

const TIERS = ["bronze", "silver", "gold", "platinum"];

export default function AdminWholesaleAnnouncements() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [audience, setAudience] = useState<"all" | "tier" | "specific">("all");
  const [targetTiers, setTargetTiers] = useState<string[]>([]);
  const [priority, setPriority] = useState<"low" | "normal" | "high" | "urgent">("normal");
  const [pinned, setPinned] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("wholesale_announcements" as any)
      .select("*")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });
    setItems(((data as any) ?? []) as Announcement[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const reset = () => {
    setTitle("");
    setBody("");
    setLink("");
    setCtaLabel("");
    setAudience("all");
    setTargetTiers([]);
    setPriority("normal");
    setPinned(false);
    setExpiresAt("");
    setCreating(false);
  };

  const create = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Title and body required");
      return;
    }
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("wholesale_announcements" as any).insert({
      title,
      body,
      link: link || null,
      cta_label: ctaLabel || null,
      audience,
      target_tiers: audience === "tier" ? targetTiers : [],
      target_wholesaler_ids: [],
      priority,
      pinned,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      created_by: auth.user?.id ?? null,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Announcement published");
      reset();
      refresh();
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    await supabase
      .from("wholesale_announcements" as any)
      .update({ is_active: !isActive })
      .eq("id", id);
    refresh();
  };

  const togglePin = async (id: string, p: boolean) => {
    await supabase
      .from("wholesale_announcements" as any)
      .update({ pinned: !p })
      .eq("id", id);
    refresh();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this announcement?")) return;
    await supabase.from("wholesale_announcements" as any).delete().eq("id", id);
    refresh();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6" /> Wholesale Announcements
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Broadcast updates to all wholesalers, by tier, or to specific accounts.
          </p>
        </div>
        {!creating && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4 mr-1" /> New announcement
          </Button>
        )}
      </div>

      {creating && (
        <Card className="p-5 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
            </div>
            <div className="sm:col-span-2">
              <Label>Message</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} className="mt-1" />
            </div>
            <div>
              <Label>Link (optional)</Label>
              <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="/wholesale/catalog" className="mt-1" />
            </div>
            <div>
              <Label>CTA label</Label>
              <Input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="View now" className="mt-1" />
            </div>
            <div>
              <Label>Audience</Label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value as any)}
                className="w-full mt-1 h-10 rounded-md border bg-background px-3 text-sm"
              >
                <option value="all">All wholesalers</option>
                <option value="tier">Specific tier(s)</option>
              </select>
            </div>
            <div>
              <Label>Priority</Label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full mt-1 h-10 rounded-md border bg-background px-3 text-sm capitalize"
              >
                {(["low", "normal", "high", "urgent"] as const).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            {audience === "tier" && (
              <div className="sm:col-span-2">
                <Label>Tiers</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {TIERS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() =>
                        setTargetTiers((p) =>
                          p.includes(t) ? p.filter((x) => x !== t) : [...p, t]
                        )
                      }
                      className={`px-3 py-1 rounded-full text-xs border capitalize ${
                        targetTiers.includes(t)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <Label>Expires at (optional)</Label>
              <Input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={pinned}
                  onChange={(e) => setPinned(e.target.checked)}
                />
                <Pin className="h-3.5 w-3.5" /> Pin to top
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={reset}>
              Cancel
            </Button>
            <Button onClick={create}>Publish</Button>
          </div>
        </Card>
      )}

      <Card>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">No announcements yet.</div>
        ) : (
          <div className="divide-y">
            {items.map((a) => (
              <div key={a.id} className="p-4 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {a.pinned && <Pin className="h-3.5 w-3.5 text-amber-500" />}
                    <span className="font-medium">{a.title}</span>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {a.priority}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {a.audience}
                      {a.audience === "tier" && a.target_tiers.length > 0 && `: ${a.target_tiers.join(",")}`}
                    </Badge>
                    {!a.is_active && (
                      <Badge variant="outline" className="text-[10px] bg-muted">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">{a.body}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    Created {new Date(a.created_at).toLocaleString("en-IN")}
                    {a.expires_at && ` · Expires ${new Date(a.expires_at).toLocaleString("en-IN")}`}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => togglePin(a.id, a.pinned)}>
                    <Pin className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toggleActive(a.id, a.is_active)}>
                    {a.is_active ? "Pause" : "Resume"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => remove(a.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-red-600" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
