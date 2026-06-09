import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, Copy, Check, Eye, Trash2, Globe, Lock, Plus, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { haptic } from "@/lib/haptics";
import { getSiteBaseUrl } from "@/lib/siteUrl";
import {
  useSharedWishlists,
  useCreateSharedWishlist,
  useUpdateSharedWishlist,
  useDeleteSharedWishlist,
  type SharedWishlist,
} from "@/hooks/useSharedWishlists";

function shareUrl(code: string) {
  return `${getSiteBaseUrl()}/w/${code}`;
}

function CopyLink({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl(code));
      setCopied(true);
      haptic("success");
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Could not copy link");
    }
  };
  return (
    <Button variant="outline" size="sm" className="gap-2" onClick={onCopy}>
      {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
      {copied ? "Copied" : "Copy link"}
    </Button>
  );
}

function NativeShare({ row }: { row: SharedWishlist }) {
  const onShare = async () => {
    const url = shareUrl(row.share_code);
    if (navigator.share) {
      try {
        await navigator.share({ title: row.title, text: row.description ?? "My wishlist", url });
      } catch {/* user cancelled */}
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    }
  };
  return (
    <Button size="sm" className="gap-2" onClick={onShare}>
      <Share2 className="w-4 h-4" /> Share
    </Button>
  );
}

function CreateDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("My Wishlist");
  const [desc, setDesc] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const create = useCreateSharedWishlist();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2">
          <Plus className="w-4 h-4" /> New share
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share your wishlist</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Title</label>
            <Input value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="Wedding picks, Birthday list…" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Description (optional)</label>
            <Textarea value={desc} maxLength={280} onChange={(e) => setDesc(e.target.value)} placeholder="A short note for your friends" rows={3} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="text-sm font-medium flex items-center gap-2">
                {isPublic ? <Globe className="w-4 h-4 text-success" /> : <Lock className="w-4 h-4" />}
                Public link
              </div>
              <p className="text-xs text-muted-foreground">Anyone with the link can view your wishlist items.</p>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            disabled={create.isPending}
            onClick={async () => {
              await create.mutateAsync({ title, description: desc, is_public: isPublic });
              setOpen(false);
              setTitle("My Wishlist");
              setDesc("");
              setIsPublic(true);
            }}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ row }: { row: SharedWishlist }) {
  const update = useUpdateSharedWishlist();
  const del = useDeleteSharedWishlist();
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="rounded-xl border bg-card p-3 sm:p-4 space-y-3"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-accent/15 text-accent flex items-center justify-center">
          <LinkIcon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold truncate">{row.title}</h4>
            <Badge variant={row.is_public ? "default" : "secondary"} className="text-[10px]">
              {row.is_public ? "Public" : "Private"}
            </Badge>
            <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
              <Eye className="w-3 h-3" /> {row.view_count}
            </span>
          </div>
          {row.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{row.description}</p>
          )}
          <p className="text-[11px] text-muted-foreground mt-1 truncate">{shareUrl(row.share_code)}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <CopyLink code={row.share_code} />
        <NativeShare row={row} />
        <div className="flex items-center gap-2 ml-auto">
          <label className="text-xs text-muted-foreground inline-flex items-center gap-1">
            {row.is_public ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
            <Switch
              checked={row.is_public}
              onCheckedChange={(v) => update.mutate({ id: row.id, is_public: v })}
              aria-label="Toggle public"
            />
          </label>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => {
              if (confirm("Delete this share link? The URL will stop working.")) {
                del.mutate(row.id);
              }
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

export function SharedWishlistsPanel() {
  const { data, isLoading } = useSharedWishlists();
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Share2 className="w-4 h-4 text-accent" /> Shareable wishlists
          </CardTitle>
          <CreateDialog />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Create a public link to share your wishlist with friends and family.
          </p>
        ) : (
          <AnimatePresence initial={false}>
            {data.map((r) => <Row key={r.id} row={r} />)}
          </AnimatePresence>
        )}
      </CardContent>
    </Card>
  );
}
