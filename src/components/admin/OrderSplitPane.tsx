import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, RefreshCw, Package, Search, X, CheckCircle2, XCircle, Truck } from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";

type Order = {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  payment_method: string | null;
  total_amount: number;
  currency: string;
  created_at: string;
  customer_id: string | null;
  guest_email: string | null;
  customer_note: string | null;
  admin_note: string | null;
  shipping_address: any;
};

const STATUS_OPTIONS = ["all", "pending", "confirmed", "processing", "shipped", "delivered", "cancelled"] as const;

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    confirmed: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    processing: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
    shipped: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
    delivered: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    cancelled: "bg-destructive/10 text-destructive",
  };
  return map[s] ?? "bg-muted text-muted-foreground";
};

export function OrderSplitPane() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("orders")
      .select("id,order_number,status,payment_status,payment_method,total_amount,currency,created_at,customer_id,guest_email,customer_note,admin_note,shipping_address")
      .order("created_at", { ascending: false })
      .limit(200);
    if (statusFilter !== "all") q = q.eq("status", statusFilter as any);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    else setOrders((data as Order[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [statusFilter]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return orders;
    return orders.filter((o) =>
      o.order_number.toLowerCase().includes(s) ||
      (o.guest_email || "").toLowerCase().includes(s) ||
      o.id.includes(s),
    );
  }, [orders, search]);

  const selected = orders.find((o) => o.id === selectedId) || null;

  const toggleAll = (v: boolean) => {
    setChecked(v ? new Set(filtered.map((o) => o.id)) : new Set());
  };
  const toggleOne = (id: string, v: boolean) => {
    const next = new Set(checked);
    if (v) next.add(id); else next.delete(id);
    setChecked(next);
  };

  const bulkUpdate = async (status: string) => {
    if (checked.size === 0) return;
    setBusy(true);
    const ids = Array.from(checked);
    const { error } = await supabase.from("orders").update({ status: status as any }).in("id", ids);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Updated ${ids.length} order(s) → ${status}`);
    setChecked(new Set());
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Package className="h-6 w-6" /> Orders</h2>
          <p className="text-sm text-muted-foreground">Split-pane view with bulk actions.</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search #, email, id…" className="pl-8 w-60" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {checked.size > 0 && (
        <div className="sticky top-0 z-10 flex items-center gap-2 rounded-md border bg-card p-2 shadow-sm">
          <span className="text-sm font-medium px-2">{checked.size} selected</span>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => bulkUpdate("confirmed")}>
            <CheckCircle2 className="h-4 w-4 mr-1" /> Confirm
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => bulkUpdate("processing")}>
            Processing
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => bulkUpdate("shipped")}>
            <Truck className="h-4 w-4 mr-1" /> Mark shipped
          </Button>
          <Button size="sm" variant="destructive" disabled={busy} onClick={() => bulkUpdate("cancelled")}>
            <XCircle className="h-4 w-4 mr-1" /> Cancel
          </Button>
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setChecked(new Set())}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-4 min-h-[60vh]">
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center gap-3 px-3 py-2 border-b">
              <Checkbox
                checked={filtered.length > 0 && checked.size === filtered.length}
                onCheckedChange={(v) => toggleAll(!!v)}
                aria-label="Select all"
              />
              <span className="text-xs text-muted-foreground">{filtered.length} orders</span>
            </div>
            <ScrollArea className="h-[65vh]">
              {loading ? (
                <div className="flex items-center justify-center p-12 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">No orders match.</p>
              ) : (
                filtered.map((o) => {
                  const active = o.id === selectedId;
                  return (
                    <button
                      key={o.id}
                      onClick={() => setSelectedId(o.id)}
                      className={`w-full text-left px-3 py-3 border-b hover:bg-muted/50 transition-colors ${active ? "bg-muted" : ""}`}
                    >
                      <div className="flex items-start gap-3">
                        <div onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={checked.has(o.id)}
                            onCheckedChange={(v) => toggleOne(o.id, !!v)}
                            aria-label={`Select ${o.order_number}`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-sm font-medium truncate">{o.order_number}</span>
                            <span className="text-sm font-semibold tabular-nums">
                              {o.currency} {o.total_amount.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className={statusBadge(o.status)}>{o.status}</Badge>
                            <span className="text-xs text-muted-foreground">{o.payment_status}</span>
                            <span className="text-xs text-muted-foreground ml-auto">
                              {formatDistanceToNow(new Date(o.created_at), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            {!selected ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-20">
                <Package className="h-10 w-10 mb-3 opacity-50" />
                <p className="text-sm">Select an order to view details.</p>
              </div>
            ) : (
              <OrderDetail order={selected} onChanged={load} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function OrderDetail({ order, onChanged }: { order: Order; onChanged: () => void }) {
  const [adminNote, setAdminNote] = useState(order.admin_note || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => { setAdminNote(order.admin_note || ""); }, [order.id, order.admin_note]);

  const update = async (patch: Partial<Order>) => {
    setSaving(true);
    const { error } = await supabase.from("orders").update(patch as any).eq("id", order.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Updated"); onChanged(); }
  };

  const addr = order.shipping_address || {};

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold font-mono">{order.order_number}</h3>
          <p className="text-xs text-muted-foreground">
            {format(new Date(order.created_at), "PPpp")}
          </p>
        </div>
        <Badge variant="outline" className={statusBadge(order.status)}>{order.status}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div><span className="text-muted-foreground">Total: </span><span className="font-semibold">{order.currency} {order.total_amount.toFixed(2)}</span></div>
        <div><span className="text-muted-foreground">Payment: </span>{order.payment_status} ({order.payment_method || "—"})</div>
        <div className="col-span-2"><span className="text-muted-foreground">Contact: </span>{order.guest_email || order.customer_id || "—"}</div>
      </div>

      {addr && (addr.name || addr.line1) && (
        <div className="rounded-md border p-3 text-sm">
          <div className="font-medium">{addr.name}</div>
          <div className="text-muted-foreground">{addr.line1} {addr.line2}</div>
          <div className="text-muted-foreground">{addr.city}, {addr.state} {addr.pincode}</div>
          {addr.phone && <div className="text-muted-foreground">{addr.phone}</div>}
        </div>
      )}

      {order.customer_note && (
        <div className="rounded-md border bg-muted/40 p-3 text-sm">
          <p className="text-xs font-medium text-muted-foreground mb-1">Customer note</p>
          {order.customer_note}
        </div>
      )}

      <div>
        <p className="text-sm font-medium mb-2">Admin note</p>
        <Input value={adminNote} onChange={(e) => setAdminNote(e.target.value)} placeholder="Add an internal note…" />
        <div className="flex gap-2 mt-2">
          <Button size="sm" disabled={saving || adminNote === (order.admin_note || "")} onClick={() => update({ admin_note: adminNote })}>
            Save note
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-2 border-t">
        <Button size="sm" variant="outline" disabled={saving} onClick={() => update({ status: "confirmed" })}>Confirm</Button>
        <Button size="sm" variant="outline" disabled={saving} onClick={() => update({ status: "processing" })}>Processing</Button>
        <Button size="sm" variant="outline" disabled={saving} onClick={() => update({ status: "shipped" })}>
          <Truck className="h-4 w-4 mr-1" /> Shipped
        </Button>
        <Button size="sm" variant="outline" disabled={saving} onClick={() => update({ status: "delivered" })}>Delivered</Button>
        <Button size="sm" variant="destructive" disabled={saving} onClick={() => update({ status: "cancelled" })}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export default OrderSplitPane;
