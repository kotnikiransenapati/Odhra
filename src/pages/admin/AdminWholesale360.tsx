import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Users, ClipboardList, StickyNote, Plus, CheckCircle2, AlertTriangle } from "lucide-react";

interface AccountRow {
  id: string;
  business_name: string;
  tier: string;
  status: string;
  credit_limit: number;
  credit_used: number;
  contact_email: string;
}

interface Customer360 {
  account_id: string;
  business_name: string;
  tier: string;
  status: string;
  credit_limit: number;
  credit_used: number;
  credit_utilization_pct: number;
  payment_terms_days: number;
  total_invoices: number;
  lifetime_revenue: number;
  outstanding_amount: number;
  overdue_amount: number;
  last_invoice_at: string | null;
  dso_days: number;
  aging: {
    bucket_0_30?: number;
    bucket_31_60?: number;
    bucket_61_90?: number;
    bucket_90_plus?: number;
  };
}

interface KamTask {
  id: string;
  title: string;
  notes: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
}

interface KamNote {
  id: string;
  note_type: string;
  subject: string | null;
  body: string;
  next_action_at: string | null;
  created_at: string;
}

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

export default function AdminWholesale360() {
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<Customer360 | null>(null);
  const [tasks, setTasks] = useState<KamTask[]>([]);
  const [notes, setNotes] = useState<KamNote[]>([]);
  const [newTask, setNewTask] = useState({ title: "", priority: "normal", due_date: "" });
  const [newNote, setNewNote] = useState({ note_type: "call", subject: "", body: "" });
  const [loading, setLoading] = useState(true);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("wholesaler_accounts" as any)
      .select("id, business_name, tier, status, credit_limit, credit_used, contact_email")
      .eq("status", "approved")
      .order("business_name");
    setAccounts((data as any) ?? []);
    setLoading(false);
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    const [{ data: m }, { data: t }, { data: n }] = await Promise.all([
      supabase.rpc("wholesale_customer_360" as any, { _account_id: id }),
      supabase.from("wholesale_kam_tasks" as any).select("*").eq("wholesaler_account_id", id).order("created_at", { ascending: false }),
      supabase.from("wholesale_kam_notes" as any).select("*").eq("wholesaler_account_id", id).order("created_at", { ascending: false }),
    ]);
    setMetrics((m as any) ?? null);
    setTasks(((t as any) ?? []) as KamTask[]);
    setNotes(((n as any) ?? []) as KamNote[]);
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    if (activeId) loadDetail(activeId);
  }, [activeId, loadDetail]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter((a) => a.business_name.toLowerCase().includes(q) || a.contact_email?.toLowerCase().includes(q));
  }, [accounts, search]);

  async function addTask() {
    if (!activeId || !newTask.title.trim()) return;
    const { data: auth } = await supabase.auth.getUser();
    const payload = {
      wholesaler_account_id: activeId,
      title: newTask.title.trim(),
      priority: newTask.priority,
      due_date: newTask.due_date || null,
      created_by: auth.user?.id,
      assigned_to: auth.user?.id,
    };
    const { error } = await supabase.from("wholesale_kam_tasks" as any).insert(payload);
    if (error) return toast.error(error.message);
    setNewTask({ title: "", priority: "normal", due_date: "" });
    toast.success("Task added");
    loadDetail(activeId);
  }

  async function completeTask(id: string) {
    const { error } = await supabase
      .from("wholesale_kam_tasks" as any)
      .update({ status: "done", completed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    if (activeId) loadDetail(activeId);
  }

  async function addNote() {
    if (!activeId || !newNote.body.trim()) return;
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("wholesale_kam_notes" as any).insert({
      wholesaler_account_id: activeId,
      note_type: newNote.note_type,
      subject: newNote.subject || null,
      body: newNote.body.trim(),
      created_by: auth.user?.id,
    });
    if (error) return toast.error(error.message);
    setNewNote({ note_type: "call", subject: "", body: "" });
    toast.success("Note saved");
    loadDetail(activeId);
  }

  if (activeId && metrics) {
    const aging = metrics.aging || {};
    const utilHigh = (metrics.credit_utilization_pct || 0) > 80;
    const overdue = (metrics.overdue_amount || 0) > 0;
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setActiveId(null)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{metrics.business_name}</h1>
            <div className="flex gap-2 mt-1">
              <Badge variant="outline">{metrics.tier}</Badge>
              <Badge variant="outline">Net {metrics.payment_terms_days}d</Badge>
              {overdue && <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Overdue</Badge>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Lifetime revenue" value={inr(metrics.lifetime_revenue)} />
          <Stat label="Outstanding" value={inr(metrics.outstanding_amount)} />
          <Stat label="Overdue" value={inr(metrics.overdue_amount)} tone={overdue ? "danger" : "default"} />
          <Stat label="DSO (days)" value={String(metrics.dso_days || 0)} />
          <Stat label="Credit limit" value={inr(metrics.credit_limit)} />
          <Stat label="Credit used" value={inr(metrics.credit_used)} />
          <Stat label="Utilisation" value={`${metrics.credit_utilization_pct || 0}%`} tone={utilHigh ? "warn" : "default"} />
          <Stat label="Invoices" value={String(metrics.total_invoices)} />
        </div>

        <Card className="p-4">
          <div className="text-sm font-semibold mb-3">AR Aging</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <AgingCell label="0-30" value={aging.bucket_0_30 || 0} />
            <AgingCell label="31-60" value={aging.bucket_31_60 || 0} />
            <AgingCell label="61-90" value={aging.bucket_61_90 || 0} />
            <AgingCell label="90+" value={aging.bucket_90_plus || 0} danger />
          </div>
        </Card>

        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-2 font-semibold">
              <ClipboardList className="h-4 w-4" /> Tasks
            </div>
            <div className="space-y-2">
              <Input placeholder="Task title" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} />
              <div className="flex gap-2">
                <select
                  className="border rounded px-2 py-1 text-sm flex-1 bg-background"
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
                <Input type="date" value={newTask.due_date} onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })} />
                <Button size="sm" onClick={addTask}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="divide-y">
              {tasks.length === 0 && <div className="text-sm text-muted-foreground py-4">No tasks yet.</div>}
              {tasks.map((t) => (
                <div key={t.id} className="py-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className={`text-sm ${t.status === "done" ? "line-through text-muted-foreground" : ""}`}>{t.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.priority} · {t.due_date ? `Due ${new Date(t.due_date).toLocaleDateString()}` : "No due date"}
                    </div>
                  </div>
                  {t.status !== "done" && (
                    <Button variant="ghost" size="sm" onClick={() => completeTask(t.id)}>
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-2 font-semibold">
              <StickyNote className="h-4 w-4" /> Call & Meeting Notes
            </div>
            <div className="space-y-2">
              <div className="flex gap-2">
                <select
                  className="border rounded px-2 py-1 text-sm bg-background"
                  value={newNote.note_type}
                  onChange={(e) => setNewNote({ ...newNote, note_type: e.target.value })}
                >
                  <option value="call">Call</option>
                  <option value="meeting">Meeting</option>
                  <option value="email">Email</option>
                  <option value="other">Other</option>
                </select>
                <Input placeholder="Subject (optional)" value={newNote.subject} onChange={(e) => setNewNote({ ...newNote, subject: e.target.value })} />
              </div>
              <Textarea placeholder="What was discussed?" value={newNote.body} onChange={(e) => setNewNote({ ...newNote, body: e.target.value })} rows={3} />
              <Button size="sm" onClick={addNote}>Save note</Button>
            </div>
            <div className="divide-y">
              {notes.length === 0 && <div className="text-sm text-muted-foreground py-4">No notes yet.</div>}
              {notes.map((n) => (
                <div key={n.id} className="py-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="capitalize">{n.note_type}</Badge>
                    <span>{new Date(n.created_at).toLocaleString()}</span>
                  </div>
                  {n.subject && <div className="text-sm font-medium mt-1">{n.subject}</div>}
                  <div className="text-sm whitespace-pre-wrap">{n.body}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-5 w-5" /> Wholesale Customer 360
        </h1>
        <p className="text-sm text-muted-foreground">KAM workspace — credit, DSO, tasks & call notes per B2B account.</p>
      </div>
      <Input placeholder="Search accounts..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
      <Card className="divide-y">
        {loading && <div className="p-6 text-sm text-muted-foreground">Loading…</div>}
        {!loading && filtered.length === 0 && <div className="p-6 text-sm text-muted-foreground">No approved accounts.</div>}
        {filtered.map((a) => {
          const util = a.credit_limit > 0 ? Math.round((Number(a.credit_used) / Number(a.credit_limit)) * 100) : 0;
          return (
            <button
              key={a.id}
              onClick={() => setActiveId(a.id)}
              className="w-full text-left px-4 py-3 hover:bg-muted/50 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="font-medium truncate">{a.business_name}</div>
                <div className="text-xs text-muted-foreground truncate">{a.contact_email}</div>
              </div>
              <div className="flex items-center gap-3 shrink-0 text-sm">
                <Badge variant="outline">{a.tier}</Badge>
                <span className="text-muted-foreground">
                  Credit: {inr(Number(a.credit_used))}/{inr(Number(a.credit_limit))} ({util}%)
                </span>
              </div>
            </button>
          );
        })}
      </Card>
    </div>
  );
}

function Stat({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "warn" | "danger" }) {
  const cls = tone === "danger" ? "text-destructive" : tone === "warn" ? "text-amber-600" : "";
  return (
    <Card className="p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-lg font-semibold ${cls}`}>{value}</div>
    </Card>
  );
}

function AgingCell({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className={`rounded border p-3 ${danger ? "border-destructive/40 bg-destructive/5" : ""}`}>
      <div className="text-xs text-muted-foreground">{label} days</div>
      <div className={`font-semibold ${danger ? "text-destructive" : ""}`}>{inr(Number(value))}</div>
    </div>
  );
}
