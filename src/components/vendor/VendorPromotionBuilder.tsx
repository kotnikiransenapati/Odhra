import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useVendorImpersonation } from "@/contexts/VendorImpersonationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tag, Plus, Trash2, Pencil, Copy, Sparkles } from "lucide-react";
import { haptic } from "@/lib/haptics";

interface Promo {
  id: string;
  name: string;
  code: string | null;
  type: string;
  discount_type: string;
  discount_value: number;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  usage_limit: number | null;
  usage_count: number;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
}

interface FormState {
  id?: string;
  name: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: string;
  min_order_amount: string;
  max_discount_amount: string;
  usage_limit: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
}

const emptyForm = (): FormState => ({
  name: "",
  code: "",
  discount_type: "percentage",
  discount_value: "10",
  min_order_amount: "0",
  max_discount_amount: "",
  usage_limit: "",
  starts_at: new Date().toISOString().slice(0, 16),
  ends_at: "",
  is_active: true,
});

const randomCode = () =>
  "VND" + Math.random().toString(36).slice(2, 8).toUpperCase();

export function VendorPromotionBuilder() {
  const { user } = useAuth();
  const { impersonatedVendor, isImpersonating } = useVendorImpersonation();
  const impersonatedId = isImpersonating ? impersonatedVendor?.id : null;
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  const load = async (vId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("promotions")
      .select("id, name, code, type, discount_type, discount_value, min_order_amount, max_discount_amount, usage_limit, usage_count, starts_at, ends_at, is_active")
      .contains("applicable_vendors", [vId])
      .order("created_at", { ascending: false });
    setPromos((data as Promo[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!user?.id && !impersonatedId) return;
    (async () => {
      let vId = impersonatedId ?? null;
      if (!vId) {
        const { data } = await supabase.from("vendors").select("id").eq("user_id", user!.id).maybeSingle();
        vId = data?.id ?? null;
      }
      if (vId) { setVendorId(vId); load(vId); }
      else setLoading(false);
    })();
  }, [user?.id, impersonatedId]);

  const openCreate = () => { setForm({ ...emptyForm(), code: randomCode() }); setOpen(true); };
  const openEdit = (p: Promo) => {
    setForm({
      id: p.id,
      name: p.name,
      code: p.code || "",
      discount_type: (p.discount_type === "fixed" ? "fixed" : "percentage"),
      discount_value: String(p.discount_value ?? ""),
      min_order_amount: String(p.min_order_amount ?? "0"),
      max_discount_amount: p.max_discount_amount != null ? String(p.max_discount_amount) : "",
      usage_limit: p.usage_limit != null ? String(p.usage_limit) : "",
      starts_at: p.starts_at ? p.starts_at.slice(0, 16) : new Date().toISOString().slice(0, 16),
      ends_at: p.ends_at ? p.ends_at.slice(0, 16) : "",
      is_active: p.is_active,
    });
    setOpen(true);
  };

  const submit = async () => {
    if (!vendorId || !user?.id) return;
    if (!form.name.trim()) { toast.error("Name required"); return; }
    const value = Number(form.discount_value);
    if (!value || value <= 0) { toast.error("Invalid discount value"); return; }
    if (form.discount_type === "percentage" && value > 90) { toast.error("Max 90% discount"); return; }

    setSaving(true);
    try {
      const payload: any = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase() || null,
        type: "coupon",
        discount_type: form.discount_type,
        discount_value: value,
        min_order_amount: Number(form.min_order_amount) || 0,
        max_discount_amount: form.max_discount_amount ? Number(form.max_discount_amount) : null,
        usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
        is_active: form.is_active,
        applicable_vendors: [vendorId],
      };
      if (form.id) {
        const { error } = await supabase.from("promotions").update(payload).eq("id", form.id);
        if (error) throw error;
        toast.success("Promotion updated");
      } else {
        const { error } = await supabase.from("promotions").insert({ ...payload, created_by: user.id });
        if (error) throw error;
        toast.success("Promotion created");
      }
      haptic("success");
      setOpen(false);
      await load(vendorId);
    } catch (e: any) {
      haptic("error");
      toast.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p: Promo) => {
    const { error } = await supabase.from("promotions").update({ is_active: !p.is_active }).eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    setPromos(prev => prev.map(x => x.id === p.id ? { ...x, is_active: !p.is_active } : x));
  };
  const remove = async (p: Promo) => {
    if (!confirm(`Delete "${p.name}"?`)) return;
    const { error } = await supabase.from("promotions").delete().eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    setPromos(prev => prev.filter(x => x.id !== p.id));
    toast.success("Deleted");
  };
  const copyCode = (code: string | null) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    toast.success(`Copied ${code}`);
  };

  const stats = useMemo(() => ({
    total: promos.length,
    active: promos.filter(p => p.is_active).length,
    redemptions: promos.reduce((a, p) => a + (p.usage_count || 0), 0),
  }), [promos]);

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Tag className="w-5 h-5 text-accent" /> Promotion Builder
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex gap-3 text-xs text-muted-foreground">
              <span><b className="text-foreground">{stats.total}</b> total</span>
              <span><b className="text-success">{stats.active}</b> active</span>
              <span><b className="text-foreground">{stats.redemptions}</b> redeemed</span>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" />New</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{form.id ? "Edit promotion" : "Create promotion"}</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-3 py-2">
                  <div className="col-span-2 space-y-1">
                    <Label>Name</Label>
                    <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Diwali Flash 20%" />
                  </div>
                  <div className="space-y-1">
                    <Label>Code</Label>
                    <div className="flex gap-1">
                      <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="VNDXXX" />
                      <Button type="button" size="icon" variant="ghost" onClick={() => setForm({ ...form, code: randomCode() })}>
                        <Sparkles className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Discount type</Label>
                    <Select value={form.discount_type} onValueChange={(v: any) => setForm({ ...form, discount_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                        <SelectItem value="fixed">Fixed (₹)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>{form.discount_type === "percentage" ? "Percent off" : "Amount off (₹)"}</Label>
                    <Input type="number" value={form.discount_value} onChange={e => setForm({ ...form, discount_value: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Min order (₹)</Label>
                    <Input type="number" value={form.min_order_amount} onChange={e => setForm({ ...form, min_order_amount: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Max discount (₹)</Label>
                    <Input type="number" value={form.max_discount_amount} onChange={e => setForm({ ...form, max_discount_amount: e.target.value })} placeholder="Optional" />
                  </div>
                  <div className="space-y-1">
                    <Label>Total uses</Label>
                    <Input type="number" value={form.usage_limit} onChange={e => setForm({ ...form, usage_limit: e.target.value })} placeholder="Unlimited" />
                  </div>
                  <div className="space-y-1">
                    <Label>Starts</Label>
                    <Input type="datetime-local" value={form.starts_at} onChange={e => setForm({ ...form, starts_at: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Ends</Label>
                    <Input type="datetime-local" value={form.ends_at} onChange={e => setForm({ ...form, ends_at: e.target.value })} />
                  </div>
                  <div className="col-span-2 flex items-center justify-between rounded-lg bg-secondary/40 p-3">
                    <Label>Active immediately</Label>
                    <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
                  <Button onClick={submit} disabled={saving}>{saving ? "Saving..." : form.id ? "Update" : "Create"}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">{[0,1,2].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : promos.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            <Tag className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No promotions yet</p>
            <p className="text-xs mt-1">Create your first coupon to drive repeat purchases.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {promos.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, type: "spring", stiffness: 400, damping: 30 }}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-secondary/20 p-3.5"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${p.is_active ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'}`}>
                    <Tag className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm truncate">{p.name}</p>
                      {p.code && (
                        <button onClick={() => copyCode(p.code)} className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-accent/10 text-accent hover:bg-accent/20 inline-flex items-center gap-1">
                          {p.code}<Copy className="w-3 h-3" />
                        </button>
                      )}
                      <Badge variant="outline" className="text-[10px]">
                        {p.discount_type === "percentage" ? `${p.discount_value}% off` : `₹${p.discount_value} off`}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {p.usage_count}/{p.usage_limit ?? '∞'} used · {p.ends_at ? `ends ${format(new Date(p.ends_at), 'MMM d')}` : 'no end date'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Switch checked={p.is_active} onCheckedChange={() => toggleActive(p)} />
                  <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(p)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default VendorPromotionBuilder;
