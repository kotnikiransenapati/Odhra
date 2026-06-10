import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Archive, CalendarClock, Edit3, FileText, RefreshCw, Rocket, Save } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ReleaseStatus = "draft" | "published" | "archived";
type Audience = "all" | "customers" | "vendors" | "admins";

type ReleaseNote = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  body: string;
  version: string | null;
  audience: Audience;
  status: ReleaseStatus;
  tags: string[];
  published_at: string | null;
  updated_at: string;
};

const blank = {
  id: null as string | null,
  title: "",
  slug: "",
  summary: "",
  body: "",
  version: "",
  audience: "all" as Audience,
  status: "draft" as ReleaseStatus,
  tags: "",
};

const statusTone: Record<ReleaseStatus, BadgeProps["variant"]> = {
  draft: "secondary",
  published: "default",
  archived: "outline",
};

type RpcClient = {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

export function ReleaseNotesPublisher() {
  const [notes, setNotes] = useState<ReleaseNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(blank);
  const rpcClient = supabase as unknown as RpcClient;

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("release_notes")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) toast.error(error.message);
    else setNotes((data ?? []) as ReleaseNote[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => notes.reduce((acc, note) => {
    acc[note.status] = (acc[note.status] ?? 0) + 1;
    return acc;
  }, { draft: 0, published: 0, archived: 0 } as Record<ReleaseStatus, number>), [notes]);

  const pick = (note: ReleaseNote) => {
    setForm({
      id: note.id,
      title: note.title,
      slug: note.slug,
      summary: note.summary,
      body: note.body,
      version: note.version ?? "",
      audience: note.audience,
      status: note.status,
      tags: (note.tags ?? []).join(", "),
    });
  };

  const save = async (statusOverride?: ReleaseStatus) => {
    if (form.title.trim().length < 3) return toast.error("Title is required");
    if (form.summary.trim().length < 10) return toast.error("Summary needs at least 10 characters");
    if (form.body.trim().length < 20) return toast.error("Body needs at least 20 characters");
    const slug = form.slug.trim() || slugify(form.title);
    if (slug.length < 3) return toast.error("Slug is required");

    setSaving(true);
    const status = statusOverride ?? form.status;
    const { error } = await rpcClient.rpc("admin_upsert_release_note", {
      _id: form.id,
      _title: form.title,
      _slug: slug,
      _summary: form.summary,
      _body: form.body,
      _version: form.version || null,
      _audience: form.audience,
      _status: status,
      _tags: form.tags.split(",").map((s) => s.trim()).filter(Boolean),
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(status === "published" ? "Release note published" : "Release note saved");
    setForm(blank);
    load();
  };

  const updateStatus = async (note: ReleaseNote, status: ReleaseStatus) => {
    const { error } = await rpcClient.rpc("admin_publish_release_note", { _id: note.id, _status: status });
    if (error) return toast.error(error.message);
    toast.success(`Release note ${status}`);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" /> Release Notes
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Draft, publish, and archive product changelog entries for customers, vendors, and admins.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} aria-label="Refresh release notes">
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {([
          ["draft", CalendarClock],
          ["published", Rocket],
          ["archived", Archive],
        ] as const).map(([status, Icon]) => (
          <Card key={status} className="p-4">
            <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground"><Icon className="w-4 h-4" /> {status}</div>
            <div className="text-3xl font-bold mt-1">{counts[status]}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="p-4">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="font-semibold">{form.id ? "Edit release note" : "New release note"}</div>
            {form.id && <Button size="sm" variant="ghost" onClick={() => setForm(blank)}>New</Button>}
          </div>

          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value, slug: form.slug || slugify(e.target.value) })} maxLength={140} placeholder="Checkout reliability upgrades" /></div>
              <div className="space-y-1.5"><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} maxLength={100} placeholder="checkout-reliability-upgrades" /></div>
              <div className="space-y-1.5"><Label>Version</Label><Input value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} maxLength={40} placeholder="v2.8.0" /></div>
              <div className="space-y-1.5"><Label>Audience</Label><Select value={form.audience} onValueChange={(v) => setForm({ ...form, audience: v as Audience })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Everyone</SelectItem><SelectItem value="customers">Customers</SelectItem><SelectItem value="vendors">Vendors</SelectItem><SelectItem value="admins">Admins</SelectItem></SelectContent></Select></div>
            </div>
            <div className="space-y-1.5"><Label>Summary</Label><Textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} maxLength={500} placeholder="Short, public-facing summary for the changelog list." /></div>
            <div className="space-y-1.5"><Label>Body</Label><Textarea className="min-h-48" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} maxLength={10000} placeholder={"What changed\n- Faster payment retries\n- Better admin visibility\n- Safer rollout controls"} /></div>
            <div className="space-y-1.5"><Label>Tags</Label><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="backend, checkout, reliability" /></div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button onClick={() => save()} disabled={saving}><Save className="w-4 h-4 mr-1" /> {saving ? "Saving..." : "Save draft"}</Button>
              <Button variant="secondary" onClick={() => save("published")} disabled={saving}><Rocket className="w-4 h-4 mr-1" /> Publish</Button>
            </div>
          </div>
        </Card>

        <Card className="p-0 overflow-hidden">
          <Tabs defaultValue="all" className="w-full">
            <div className="px-4 py-3 border-b flex items-center justify-between gap-3 flex-wrap">
              <div className="font-semibold">Changelog pipeline</div>
              <TabsList><TabsTrigger value="all">All</TabsTrigger><TabsTrigger value="draft">Draft</TabsTrigger><TabsTrigger value="published">Published</TabsTrigger></TabsList>
            </div>
            {(["all", "draft", "published"] as const).map((tab) => (
              <TabsContent key={tab} value={tab} className="m-0">
                {loading && notes.length === 0 ? <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div> : notes.filter((n) => tab === "all" || n.status === tab).length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">No release notes in this lane.</div> : (
                  <div className="divide-y max-h-[760px] overflow-auto">
                    {notes.filter((n) => tab === "all" || n.status === tab).map((note, i) => (
                      <motion.div key={note.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.015, type: "spring", stiffness: 400, damping: 30 }} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold truncate">{note.title}</h3>
                              <Badge variant={statusTone[note.status]}>{note.status}</Badge>
                              <Badge variant="outline">{note.audience}</Badge>
                              {note.version && <Badge variant="secondary">{note.version}</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">{note.summary}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                              <span className="font-mono">/{note.slug}</span>
                              <span>updated {format(new Date(note.updated_at), "MMM d, HH:mm")}</span>
                              {note.published_at && <span>published {format(new Date(note.published_at), "MMM d, yyyy")}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button size="sm" variant="outline" onClick={() => pick(note)}><Edit3 className="w-4 h-4 mr-1" /> Edit</Button>
                            {note.status !== "published" && <Button size="sm" variant="outline" onClick={() => updateStatus(note, "published")}><Rocket className="w-4 h-4 mr-1" /> Publish</Button>}
                            {note.status !== "archived" && <Button size="sm" variant="ghost" onClick={() => updateStatus(note, "archived")}><Archive className="w-4 h-4" /></Button>}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </Card>
      </div>
    </div>
  );
}