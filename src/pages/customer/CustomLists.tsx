import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, ListPlus, Share2, Trash2, Globe, Lock, Loader2, ChevronRight } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  useMyCustomLists,
  useCreateCustomList,
  useDeleteCustomList,
  useUpdateCustomList,
  type ListType,
} from "@/hooks/useCustomLists";
import { useAuth } from "@/contexts/AuthContext";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";
import { getSiteBaseUrl } from "@/lib/siteUrl";
import { formatDistanceToNow } from "date-fns";

const TYPES: { value: ListType; label: string }[] = [
  { value: "wishlist", label: "Wishlist" },
  { value: "registry", label: "Gift Registry" },
  { value: "gift", label: "Gift Ideas" },
  { value: "project", label: "Project / Build" },
  { value: "custom", label: "Custom" },
];

export default function CustomLists() {
  const { user } = useAuth();
  const { data: lists = [], isLoading } = useMyCustomLists();
  const create = useCreateCustomList();
  const update = useUpdateCustomList();
  const remove = useDeleteCustomList();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<ListType>("registry");
  const [isPublic, setIsPublic] = useState(false);

  const copyShare = async (slug: string) => {
    const url = `${getSiteBaseUrl()}/lists/${slug}`;
    await navigator.clipboard.writeText(url);
    toast.success("Share link copied");
  };

  if (!user) {
    return (
      <div className="min-h-dvh bg-background">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 pt-24 pb-24 text-center">
          <h1 className="text-2xl font-bold mb-2">Sign in to manage lists</h1>
          <p className="text-muted-foreground mb-6">Create gift registries, wishlists & build lists.</p>
          <Button asChild>
            <Link to={`/auth?redirect=${encodeURIComponent("/account/lists")}`}>Sign in</Link>
          </Button>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 pt-24 pb-24 sm:pt-28">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My Lists</h1>
            <p className="text-sm text-muted-foreground">Registries, wishlists, gift ideas & more</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => haptic("light")}>
                <Plus className="w-4 h-4 mr-1.5" /> New list
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a new list</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground">Name</label>
                  <Input
                    autoFocus
                    maxLength={80}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Our wedding registry"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as ListType)}
                    className="w-full mt-1 bg-background border border-border/60 rounded-md px-3 py-2 text-sm"
                  >
                    {TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <label className="flex items-center justify-between">
                  <span className="text-sm">Make shareable (public link)</span>
                  <Switch checked={isPublic} onCheckedChange={setIsPublic} />
                </label>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button
                  disabled={!name.trim() || create.isPending}
                  onClick={async () => {
                    try {
                      await create.mutateAsync({ name, list_type: type, is_public: isPublic });
                      setOpen(false);
                      setName("");
                      setIsPublic(false);
                    } catch { /* toast handled */ }
                  }}
                >
                  {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : lists.length === 0 ? (
          <div className="text-center py-16 glass rounded-2xl">
            <ListPlus className="w-10 h-10 text-accent mx-auto mb-3" />
            <p className="font-medium">No lists yet</p>
            <p className="text-sm text-muted-foreground">Create one to start collecting products.</p>
          </div>
        ) : (
          <motion.ul className="space-y-2">
            {lists.map((l) => (
              <li key={l.id} className="glass rounded-2xl p-4 flex items-center gap-3">
                <Link to={`/account/lists/${l.id}`} className="flex-1 min-w-0 group">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate group-hover:text-accent transition-colors">{l.name}</p>
                    <Badge variant="outline" className="text-[10px] capitalize">{l.list_type}</Badge>
                    {l.is_public ? (
                      <Globe className="w-3.5 h-3.5 text-accent" aria-label="Public" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-muted-foreground" aria-label="Private" />
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {l.item_count ?? 0} items · updated {formatDistanceToNow(new Date(l.updated_at), { addSuffix: true })}
                  </p>
                </Link>

                {l.is_public ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={async () => {
                      if (!l.share_slug) {
                        await update.mutateAsync({ id: l.id, patch: { is_public: true } });
                        toast.message("Share link minted — tap share again");
                        return;
                      }
                      copyShare(l.share_slug);
                    }}
                    aria-label="Copy share link"
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => update.mutate({ id: l.id, patch: { is_public: true } })}
                    aria-label="Make public"
                  >
                    <Globe className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    if (confirm(`Delete "${l.name}"?`)) remove.mutate(l.id);
                  }}
                  aria-label={`Delete ${l.name}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <ChevronRight className="w-4 h-4 text-muted-foreground" aria-hidden />
              </li>
            ))}
          </motion.ul>
        )}
      </main>
      <BottomNavigation />
    </div>
  );
}
