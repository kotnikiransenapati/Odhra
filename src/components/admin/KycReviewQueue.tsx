import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, ShieldCheck, ShieldAlert, ExternalLink, Clock, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

type KycDoc = {
  id: string;
  vendor_id: string;
  document_type: string;
  document_url: string;
  document_number: string | null;
  status: string;
  rejection_reason: string | null;
  uploaded_at: string;
};

type Bucket = "0-24h" | "1-3d" | "3-7d" | "7d+";

const bucketOf = (uploaded: string): Bucket => {
  const hrs = (Date.now() - new Date(uploaded).getTime()) / 3_600_000;
  if (hrs < 24) return "0-24h";
  if (hrs < 72) return "1-3d";
  if (hrs < 168) return "3-7d";
  return "7d+";
};
const bucketStyles: Record<Bucket, string> = {
  "0-24h": "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  "1-3d": "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  "3-7d": "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  "7d+": "bg-destructive/10 text-destructive",
};

export function KycReviewQueue() {
  const [docs, setDocs] = useState<KycDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState<Bucket | "all">("all");
  const [rejectFor, setRejectFor] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("vendor_kyc_documents")
      .select("id,vendor_id,document_type,document_url,document_number,status,rejection_reason,uploaded_at")
      .eq("status", "pending")
      .order("uploaded_at", { ascending: true });
    if (error) toast.error(error.message);
    else setDocs((data as KycDoc[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const counts = useMemo(() => {
    const c: Record<Bucket, number> = { "0-24h": 0, "1-3d": 0, "3-7d": 0, "7d+": 0 };
    docs.forEach((d) => { c[bucketOf(d.uploaded_at)]++; });
    return c;
  }, [docs]);

  const visible = tab === "all" ? docs : docs.filter((d) => bucketOf(d.uploaded_at) === tab);

  const approve = async (id: string) => {
    setBusy(id);
    const { error } = await supabase
      .from("vendor_kyc_documents")
      .update({ status: "approved", verified_at: new Date().toISOString() })
      .eq("id", id);
    setBusy(null);
    if (error) toast.error(error.message);
    else { toast.success("Approved"); load(); }
  };

  const reject = async (id: string) => {
    if (!rejectReason.trim()) return toast.error("Reason required");
    setBusy(id);
    const { error } = await supabase
      .from("vendor_kyc_documents")
      .update({ status: "rejected", rejection_reason: rejectReason.trim(), verified_at: new Date().toISOString() })
      .eq("id", id);
    setBusy(null);
    if (error) toast.error(error.message);
    else {
      toast.success("Rejected");
      setRejectFor(null);
      setRejectReason("");
      load();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="h-6 w-6" /> KYC Review Queue</h2>
          <p className="text-sm text-muted-foreground">Aging buckets surface stale verifications first.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(Object.entries(counts) as [Bucket, number][]).map(([b, n]) => (
          <Card key={b} className="cursor-pointer" onClick={() => setTab(b)}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" /> {b}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${n > 0 && (b === "3-7d" || b === "7d+") ? "text-destructive" : ""}`}>{n}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Bucket | "all")}>
        <TabsList>
          <TabsTrigger value="all">All ({docs.length})</TabsTrigger>
          <TabsTrigger value="0-24h">0-24h</TabsTrigger>
          <TabsTrigger value="1-3d">1-3d</TabsTrigger>
          <TabsTrigger value="3-7d">3-7d</TabsTrigger>
          <TabsTrigger value="7d+">7d+</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center p-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : visible.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Queue is empty.</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {visible.map((d) => {
                const b = bucketOf(d.uploaded_at);
                return (
                  <Card key={d.id}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{d.document_type}</span>
                            <Badge variant="outline" className={bucketStyles[b]}>{b}</Badge>
                            {d.document_number && (
                              <span className="text-xs font-mono text-muted-foreground">#{d.document_number}</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Vendor {d.vendor_id.slice(0, 8)} · uploaded {formatDistanceToNow(new Date(d.uploaded_at), { addSuffix: true })}
                          </p>
                        </div>
                        <a
                          href={d.document_url} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          View <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>

                      {rejectFor === d.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            autoFocus
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Reason for rejection (sent to vendor)"
                          />
                          <Button size="sm" variant="destructive" disabled={busy === d.id} onClick={() => reject(d.id)}>
                            Confirm reject
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setRejectFor(null); setRejectReason(""); }}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button size="sm" disabled={busy === d.id} onClick={() => approve(d.id)}>
                            <ShieldCheck className="h-4 w-4 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setRejectFor(d.id)}>
                            <ShieldAlert className="h-4 w-4 mr-1" /> Reject
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default KycReviewQueue;
