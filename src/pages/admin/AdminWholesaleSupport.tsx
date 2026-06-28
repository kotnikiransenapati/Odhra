import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, MessageSquare, Send, LifeBuoy, Lock } from "lucide-react";

interface Ticket {
  id: string;
  ticket_number: string;
  wholesaler_id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  last_message_at: string;
}
interface Message {
  id: string;
  author_role: "wholesaler" | "admin" | "system";
  body: string;
  is_internal: boolean;
  created_at: string;
}

const STATUSES = ["open", "in_progress", "pending_customer", "resolved", "closed"];

export default function AdminWholesaleSupport() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [active, setActive] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("wholesale_support_tickets" as any)
      .select("*")
      .order("last_message_at", { ascending: false })
      .limit(200);
    if (statusFilter !== "all") q = q.eq("status", statusFilter);
    const { data } = await q;
    setTickets(((data as any) ?? []) as Ticket[]);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (active) {
    return <AdminTicketDetail ticketId={active} onBack={() => { setActive(null); refresh(); }} />;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <LifeBuoy className="h-6 w-6" /> Wholesale Support
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            KAM inbox for B2B accounts. Reply, set status, leave internal notes.
          </p>
        </div>
        <div className="flex gap-1">
          {["open", "in_progress", "pending_customer", "resolved", "closed", "all"].map((s) => (
            <Button
              key={s}
              size="sm"
              variant={statusFilter === s ? "default" : "outline"}
              onClick={() => setStatusFilter(s)}
              className="capitalize"
            >
              {s.replace("_", " ")}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading…</div>
        ) : tickets.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">No tickets in this view.</div>
        ) : (
          <div className="divide-y">
            {tickets.map((t) => (
              <button
                key={t.id}
                onClick={() => setActive(t.id)}
                className="w-full text-left p-4 hover:bg-muted/30 flex items-center gap-3"
              >
                <MessageSquare className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{t.subject}</span>
                    <Badge variant="outline" className="text-[10px] capitalize">{t.category}</Badge>
                    <Badge variant="outline" className="text-[10px] capitalize">{t.priority}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {t.ticket_number} · Updated{" "}
                    {new Date(t.last_message_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  </div>
                </div>
                <Badge variant="outline" className="capitalize">{t.status.replace("_", " ")}</Badge>
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function AdminTicketDetail({ ticketId, onBack }: { ticketId: string; onBack: () => void }) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [internal, setInternal] = useState(false);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    const [tRes, mRes] = await Promise.all([
      supabase.from("wholesale_support_tickets" as any).select("*").eq("id", ticketId).single(),
      supabase
        .from("wholesale_support_messages" as any)
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true }),
    ]);
    setTicket((tRes.data as any) ?? null);
    setMessages(((mRes.data as any) ?? []) as Message[]);
  }, [ticketId]);

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`adm-wt-${ticketId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "wholesale_support_messages", filter: `ticket_id=eq.${ticketId}` },
        () => load()
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [ticketId, load]);

  const send = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("wholesale_support_messages" as any).insert({
        ticket_id: ticketId,
        author_id: auth.user!.id,
        author_role: "admin",
        body: reply,
        is_internal: internal,
      });
      if (error) throw error;
      setReply("");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const setStatus = async (s: string) => {
    await supabase
      .from("wholesale_support_tickets" as any)
      .update({ status: s, resolved_at: s === "resolved" ? new Date().toISOString() : null })
      .eq("id", ticketId);
    load();
  };

  if (!ticket) return <div className="p-6 text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to inbox
      </Button>
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">{ticket.subject}</h1>
            <div className="text-xs text-muted-foreground mt-1">
              {ticket.ticket_number} · {ticket.category} · {ticket.priority}
            </div>
          </div>
          <select
            value={ticket.status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm capitalize"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace("_", " ")}</option>
            ))}
          </select>
        </div>
      </Card>

      <Card className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.author_role === "admin" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-lg p-3 text-sm ${
                m.is_internal
                  ? "bg-amber-500/10 border border-amber-500/30"
                  : m.author_role === "admin"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              <div className="text-[10px] opacity-70 mb-0.5 flex items-center gap-1 capitalize">
                {m.is_internal && <Lock className="h-2.5 w-2.5" />}
                {m.author_role} · {new Date(m.created_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                {m.is_internal && " · Internal note"}
              </div>
              <div className="whitespace-pre-wrap">{m.body}</div>
            </div>
          </div>
        ))}
      </Card>

      <Card className="p-4">
        <Textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={3} placeholder="Reply to wholesaler…" />
        <div className="flex items-center justify-between mt-2">
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
            <Lock className="h-3 w-3" /> Internal note (not visible to customer)
          </label>
          <Button onClick={send} disabled={sending || !reply.trim()}>
            <Send className="h-4 w-4 mr-1" /> {sending ? "Sending…" : "Send"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
