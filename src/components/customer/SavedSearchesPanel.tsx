import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Bookmark, Search, Trash2, Bell, Plus, ExternalLink } from "lucide-react";
import { haptic } from "@/lib/haptics";

interface SavedSearch {
  id: string;
  name: string;
  query: string | null;
  filters: Record<string, any>;
  sort_by: string | null;
  alert_enabled: boolean;
  last_match_count: number;
}

const buildShopUrl = (s: SavedSearch) => {
  const p = new URLSearchParams();
  if (s.query) p.set("q", s.query);
  Object.entries(s.filters || {}).forEach(([k, v]) => {
    if (v == null || v === "") return;
    p.set(k, Array.isArray(v) ? v.join(",") : String(v));
  });
  if (s.sort_by) p.set("sort", s.sort_by);
  const qs = p.toString();
  return qs ? `/shop?${qs}` : "/shop";
};

interface SaveCurrentSearchButtonProps {
  query?: string;
  filters?: Record<string, any>;
  sort?: string;
  className?: string;
}

export function SaveCurrentSearchButton({ query, filters = {}, sort, className }: SaveCurrentSearchButtonProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(query || "My search");
  const [alertOn, setAlertOn] = useState(true);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!user?.id) { toast.error("Sign in to save searches"); return; }
    if (!name.trim()) { toast.error("Name required"); return; }
    setBusy(true);
    const { error } = await supabase.from("saved_searches").insert({
      user_id: user.id,
      name: name.trim().slice(0, 80),
      query: query || null,
      filters: filters as any,
      sort_by: sort || null,
      alert_enabled: alertOn,
    });
    setBusy(false);
    if (error) { haptic("error"); toast.error(error.message); return; }
    haptic("success");
    toast.success("Search saved");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={`gap-1.5 ${className || ""}`}>
          <Bookmark className="w-4 h-4" /> Save search
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Save this search</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold">Name</label>
            <Input value={name} onChange={e => setName(e.target.value)} maxLength={80} />
          </div>
          {query && <p className="text-xs text-muted-foreground">Query: <b>{query}</b></p>}
          {Object.keys(filters).length > 0 && (
            <p className="text-xs text-muted-foreground">{Object.keys(filters).length} filter(s) applied.</p>
          )}
          <div className="flex items-center justify-between rounded-lg bg-secondary/40 p-3">
            <div>
              <p className="text-sm font-semibold">Notify on new matches</p>
              <p className="text-[11px] text-muted-foreground">Get an in-app alert when new products match.</p>
            </div>
            <Switch checked={alertOn} onCheckedChange={setAlertOn} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
          <Button onClick={save} disabled={busy}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SavedSearchesPanel() {
  const { user } = useAuth();
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("saved_searches")
      .select("id, name, query, filters, sort_by, alert_enabled, last_match_count")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setSearches((data as any as SavedSearch[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [user?.id]);

  const toggleAlert = async (s: SavedSearch) => {
    const next = !s.alert_enabled;
    setSearches(prev => prev.map(x => x.id === s.id ? { ...x, alert_enabled: next } : x));
    const { error } = await supabase.from("saved_searches").update({ alert_enabled: next }).eq("id", s.id);
    if (error) { toast.error(error.message); load(); }
  };
  const remove = async (s: SavedSearch) => {
    if (!confirm(`Delete "${s.name}"?`)) return;
    const { error } = await supabase.from("saved_searches").delete().eq("id", s.id);
    if (error) { toast.error(error.message); return; }
    setSearches(prev => prev.filter(x => x.id !== s.id));
    toast.success("Deleted");
  };

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Bookmark className="w-5 h-5 text-accent" /> Saved Searches
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">{[0,1].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : searches.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No saved searches</p>
            <p className="text-xs mt-1">Apply filters on the shop page and tap "Save search".</p>
          </div>
        ) : (
          <div className="space-y-2">
            {searches.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, type: "spring", stiffness: 400, damping: 30 }}
                className="flex items-center gap-3 rounded-xl border border-border/40 bg-secondary/20 p-3"
              >
                <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
                  <Search className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{s.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {s.query && <Badge variant="outline" className="text-[10px]">"{s.query}"</Badge>}
                    {Object.keys(s.filters || {}).length > 0 && (
                      <Badge variant="outline" className="text-[10px]">{Object.keys(s.filters).length} filters</Badge>
                    )}
                    {s.alert_enabled && (
                      <Badge className="bg-success/15 text-success border-success/30 text-[10px] gap-1">
                        <Bell className="w-3 h-3" /> Alerts on
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Switch checked={s.alert_enabled} onCheckedChange={() => toggleAlert(s)} />
                  <Button asChild size="icon" variant="ghost">
                    <Link to={buildShopUrl(s)}><ExternalLink className="w-4 h-4" /></Link>
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(s)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default SavedSearchesPanel;
