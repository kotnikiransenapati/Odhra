import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useVendorImpersonation } from "@/contexts/VendorImpersonationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Truck, PackageCheck, RefreshCw, Layers } from "lucide-react";
import { haptic } from "@/lib/haptics";

interface Row {
  id: string;
  sub_order_number: string;
  status: string;
  total_amount: number;
  created_at: string;
}

const CARRIERS = ["India Post", "Delhivery", "Other"];

export function VendorBulkOrderActions() {
  const { user } = useAuth();
  const { impersonatedVendor, isImpersonating } = useVendorImpersonation();
  const impersonatedId = isImpersonating ? impersonatedVendor?.id : null;

  const [vendorId, setVendorId] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [shipOpen, setShipOpen] = useState(false);
  const [carrier, setCarrier] = useState(CARRIERS[0]);
  const [tracking, setTracking] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("pending");

  const load = async (vId: string, status: string) => {
    setLoading(true);
    const q = supabase
      .from("sub_orders")
      .select("id, sub_order_number, status, total_amount, created_at")
      .eq("vendor_id", vId)
      .order("created_at", { ascending: false })
      .limit(100);
    const { data } = status === "all" ? await q : await q.eq("status", status as any);
    setRows((data as Row[]) || []);
    setSelected(new Set());
    setLoading(false);
  };

  useEffect(() => {
    if (!user?.id && !impersonatedId) return;
    (async () => {
      let vId: string | null = impersonatedId ?? null;
      if (!vId) {
        const { data } = await supabase.from("vendors").select("id").eq("user_id", user!.id).maybeSingle();
        vId = data?.id ?? null;
      }
      if (vId) {
        setVendorId(vId);
        load(vId, statusFilter);
      } else setLoading(false);
    })();
  }, [user?.id, impersonatedId]);

  useEffect(() => { if (vendorId) load(vendorId, statusFilter); }, [statusFilter]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };
  const toggleAll = () => {
    setSelected(prev => prev.size === rows.length ? new Set() : new Set(rows.map(r => r.id)));
  };

  const bulkUpdate = async (patch: Record<string, any>, label: string) => {
    if (selected.size === 0) return;
    setSubmitting(true);
    try {
      const ids = Array.from(selected);
      const { error } = await supabase.from("sub_orders").update(patch as any).in("id", ids);
      if (error) throw error;
      haptic("success");
      toast.success(`${label}: ${ids.length} order(s) updated`);
      setShipOpen(false); setTracking(""); 
      if (vendorId) await load(vendorId, statusFilter);
    } catch (e: any) {
      haptic("error");
      toast.error(e.message || "Update failed");
    } finally {
      setSubmitting(false);
    }
  };

  const markConfirmed = () => bulkUpdate({ status: "confirmed" }, "Confirmed");
  const markProcessing = () => bulkUpdate({ status: "processing" }, "Processing");
  const markShipped = () => {
    if (!tracking.trim()) { toast.error("Tracking number required"); return; }
    bulkUpdate(
      { status: "shipped", carrier, tracking_number: tracking.trim(), shipped_at: new Date().toISOString() },
      "Shipped"
    );
  };

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Layers className="w-5 h-5 text-accent" /> Bulk Order Actions
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={() => vendorId && load(vendorId, statusFilter)} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-between flex-wrap gap-2"
          >
            <span className="text-sm font-semibold">{selected.size} selected</span>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={markConfirmed} disabled={submitting}>
                <PackageCheck className="w-4 h-4 mr-1" /> Confirm
              </Button>
              <Button size="sm" variant="outline" onClick={markProcessing} disabled={submitting}>
                Processing
              </Button>
              <Button size="sm" onClick={() => setShipOpen(true)} disabled={submitting}>
                <Truck className="w-4 h-4 mr-1" /> Mark Shipped
              </Button>
            </div>
          </motion.div>
        )}

        {loading ? (
          <div className="space-y-2">{[0,1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground">No orders match this filter.</div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border/40">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-3 text-left w-10">
                    <Checkbox
                      checked={selected.size === rows.length && rows.length > 0}
                      onCheckedChange={toggleAll}
                    />
                  </th>
                  <th className="p-3 text-left">Order</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-t border-border/30 hover:bg-secondary/20">
                    <td className="p-3"><Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggle(r.id)} /></td>
                    <td className="p-3 font-mono text-xs">{r.sub_order_number}</td>
                    <td className="p-3"><Badge variant="outline" className="capitalize text-[10px]">{r.status}</Badge></td>
                    <td className="p-3 text-right font-semibold">₹{Number(r.total_amount).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Dialog open={shipOpen} onOpenChange={setShipOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mark {selected.size} order(s) as shipped</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Carrier</label>
                <Select value={carrier} onValueChange={setCarrier}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CARRIERS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Tracking number</label>
                <Input value={tracking} onChange={e => setTracking(e.target.value)} placeholder="e.g. ABC123456789" />
                {selected.size > 1 && (
                  <p className="text-[11px] text-muted-foreground">
                    The same tracking number will be applied to all selected orders. For per-order tracking, ship individually.
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShipOpen(false)} disabled={submitting}>Cancel</Button>
              <Button onClick={markShipped} disabled={submitting || !tracking.trim()}>
                {submitting ? "Updating..." : "Confirm shipment"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

export default VendorBulkOrderActions;
