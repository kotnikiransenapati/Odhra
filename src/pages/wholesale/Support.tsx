import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWholesaler } from "@/hooks/useWholesaler";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { LifeBuoy, Plus, Send, ArrowLeft, MessageSquare } from "lucide-react";

interface Ticket {
  id: string;
  ticket_number: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  last_message_at: string;
  created_at: string;
}
interface Message {
  id: string;
  author_role: "wholesaler" | "admin" | "system";
  body: string;
  created_at: string;
}

const CATEGORIES = ["general", "order", "billing", "dispatch", "catalog", "technical"];
const PRIORITIES = ["low", "normal", "high", "urgent"];

const STATUS_COLOR: Record<string, string> = {
  open: "bg-blue-500/10 text-blue-700 border-blue-500/30",
  in_progress: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  pending_customer: "bg-purple-500/10 text-purple-700 border-purple-500/30",
  resolved: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  closed: "bg-muted text-muted-foreground",
};

export default function WholesaleSupport() {
  const { account } = useWholesaler();
  const [params, setParams] = useSearchParams();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const activeId = params.get("ticket");

  const refresh = useCallback(async () => {
    if (!account?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("wholesale_support_tickets" as any)
      .select("*")
      .eq("wholesaler_id", account.id)
      .order("last_message_at", { ascending: false });
    setTickets(((data as any) ?? []) as Ticket[]);
    setLoading(false);
  }, [account?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (activeId) {
    return (
      <TicketDetail
        ticketId={activeId}
        onBack={() => {
          setParams({});
          refresh();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            KAM Support
          </p>
          <h1 className="text-2xl md:text-3xl font-bold mt-1">Support tickets</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Talk to your Key Account Manager. Avg first response within 4 business hours.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4 mr-1" /> New ticket
        </Button>
      </div>

      {creating && (
        <NewTicketForm
          wholesalerId={account!.id}
          onCreated={(id) => {
            setCreating(false);
            setParams({ ticket: id });
            refresh();
          }}
          onCancel={() => setCreating(false)}
        />
      )}

      <Card>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading…</div>
        ) : tickets.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            <LifeBuoy className="h-10 w-10 mx-auto mb-3 opacity-40" />
            No tickets yet. Open one above to get help from your KAM.
          </div>
        ) : (
          <div className="divide-y">
            {tickets.map((t) => (
              <button
                key={t.id}
                onClick={() => setParams({ ticket: t.id })}
                className="w-full text-left p-4 hover:bg-muted/30 flex items-center gap-3"
              >
                <MessageSquare className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{t.subject}</span>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {t.category}
                    </Badge>
                    {t.priority !== "normal" && (
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {t.priority}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {t.ticket_number} · Updated{" "}
                    {new Date(t.last_message_at).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </div>
                </div>
                <Badge variant="outline" className={`capitalize ${STATUS_COLOR[t.status] ?? ""}`}>
                  {t.status.replace("_", " ")}
                </Badge>
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function NewTicketForm({
  wholesalerId,
  onCreated,
  onCancel,
}: {
  wholesalerId: string;
  onCreated: (id: string) => void;
  onCancel: () => void;
}) {
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState("normal");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error("Subject and message are required");
      return;
    }
    setSaving(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const { data: tk, error } = await supabase
        .from("wholesale_support_tickets" as any)
        .insert({
          wholesaler_id: wholesalerId,
          created_by: auth.user!.id,
          subject,
          category,
          priority,
        })
        .select()
        .single();
      if (error) throw error;
      const ticketId = (tk as any).id;
      await supabase.from("wholesale_support_messages" as any).insert({
        ticket_id: ticketId,
        author_id: auth.user!.id,
        author_role: "wholesaler",
        body,
      });
      toast.success("Ticket created");
      onCreated(ticketId);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create ticket");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-5 space-y-3">
      <h2 className="font-semibold">New ticket</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <Label>Subject</Label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Category</Label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full mt-1 h-10 rounded-md border bg-background px-3 text-sm capitalize"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Priority</Label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full mt-1 h-10 rounded-md border bg-background px-3 text-sm capitalize"
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <Label>Describe your issue</Label>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            className="mt-1"
            placeholder="Include order numbers, invoice references, or screenshots if relevant."
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={saving}>
          {saving ? "Creating…" : "Submit ticket"}
        </Button>
      </div>
    </Card>
  );
}

function TicketDetail({ ticketId, onBack }: { ticketId: string; onBack: () => void }) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
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
      .channel(`wt-${ticketId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "wholesale_support_messages",
          filter: `ticket_id=eq.${ticketId}`,
        },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [ticketId, load]);

  const send = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("wholesale_support_messages" as any).insert({
        ticket_id: ticketId,
        author_id: auth.user!.id,
        author_role: "wholesaler",
        body: reply,
      });
      if (error) throw error;
      setReply("");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to send");
    } finally {
      setSending(false);
    }
  };

  if (!ticket) return <div className="p-6 text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to tickets
      </Button>
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">{ticket.subject}</h1>
            <div className="text-xs text-muted-foreground mt-1">
              {ticket.ticket_number} · {ticket.category} · {ticket.priority} priority
            </div>
          </div>
          <Badge variant="outline" className={`capitalize ${STATUS_COLOR[ticket.status] ?? ""}`}>
            {ticket.status.replace("_", " ")}
          </Badge>
        </div>
      </Card>

      <Card className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.author_role === "wholesaler" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 text-sm ${
                m.author_role === "wholesaler"
                  ? "bg-primary text-primary-foreground"
                  : m.author_role === "system"
                  ? "bg-muted text-muted-foreground italic"
                  : "bg-muted"
              }`}
            >
              <div className="text-[10px] opacity-70 mb-0.5 capitalize">
                {m.author_role === "wholesaler" ? "You" : m.author_role} ·{" "}
                {new Date(m.created_at).toLocaleString("en-IN", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </div>
              <div className="whitespace-pre-wrap">{m.body}</div>
            </div>
          </div>
        ))}
      </Card>

      {ticket.status !== "closed" && (
        <Card className="p-4">
          <Textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={3}
            placeholder="Type a reply…"
          />
          <div className="flex justify-end mt-2">
            <Button onClick={send} disabled={sending || !reply.trim()}>
              <Send className="h-4 w-4 mr-1" />
              {sending ? "Sending…" : "Send"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
