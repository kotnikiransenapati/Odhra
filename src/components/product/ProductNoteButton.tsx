import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { StickyNote, Loader2, Trash2, Pin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import {
  useProductNote,
  useUpsertProductNote,
  useDeleteProductNote,
} from "@/hooks/useProductNotes";
import { haptic } from "@/lib/haptics";

interface Props {
  productId: string;
  className?: string;
  size?: "sm" | "default";
}

const MAX = 2000;

export function ProductNoteButton({ productId, className, size = "sm" }: Props) {
  const { user } = useAuth();
  const { data: existing } = useProductNote(productId);
  const upsert = useUpsertProductNote();
  const del = useDeleteProductNote();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    if (open) {
      setText(existing?.note ?? "");
      setPinned(existing?.pinned ?? false);
    }
  }, [open, existing]);

  if (!user) {
    return (
      <Button asChild variant="outline" size={size} className={className}>
        <Link to={`/auth?redirect=${encodeURIComponent(window.location.pathname)}`}>
          <StickyNote className="w-4 h-4 mr-1.5" /> Add private note
        </Link>
      </Button>
    );
  }

  const hasNote = !!existing;

  const handleSave = async () => {
    haptic("light");
    await upsert.mutateAsync({ product_id: productId, note: text, pinned });
    setOpen(false);
  };

  const handleDelete = async () => {
    if (!existing) return;
    haptic("warning");
    await del.mutateAsync(existing.id);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant={hasNote ? "secondary" : "outline"}
          size={size}
          className={className}
          onClick={() => haptic("selection")}
          aria-label={hasNote ? "Edit your private note" : "Add a private note"}
        >
          <StickyNote className="w-4 h-4 mr-1.5" />
          {hasNote ? "My note" : "Add note"}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2">
            <StickyNote className="w-5 h-5 text-accent" /> Private note
          </SheetTitle>
          <SheetDescription>
            Only you can see this. Great for sizes, gift ideas or reorder cues.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX))}
            placeholder="e.g. Mom loved this in size M — reorder for Diwali"
            rows={6}
            className="resize-none"
            aria-label="Note text"
          />
          <p className="text-[11px] text-muted-foreground text-right tabular-nums">
            {text.length}/{MAX}
          </p>

          <div className="flex items-center justify-between rounded-xl border border-border/40 px-3 py-2.5">
            <Label htmlFor="pin-toggle" className="flex items-center gap-2 cursor-pointer">
              <Pin className="w-4 h-4 text-accent" /> Pin to top of my notes
            </Label>
            <Switch id="pin-toggle" checked={pinned} onCheckedChange={setPinned} />
          </div>
        </div>

        <SheetFooter className="flex-row gap-2">
          {hasNote && (
            <Button
              variant="ghost"
              className="text-destructive"
              onClick={handleDelete}
              disabled={del.isPending}
            >
              {del.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </Button>
          )}
          <Button
            className="flex-1"
            onClick={handleSave}
            disabled={upsert.isPending || !text.trim()}
          >
            {upsert.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
            ) : null}
            Save note
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
