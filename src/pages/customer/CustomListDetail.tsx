import { useParams, Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Globe, Lock, ArrowLeft, Trash2, ExternalLink } from "lucide-react";
import {
  useCustomList,
  useRemoveItemFromList,
  useUpdateCustomList,
} from "@/hooks/useCustomLists";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { getSiteBaseUrl } from "@/lib/siteUrl";

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export default function CustomListDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data, isLoading } = useCustomList(id);
  const remove = useRemoveItemFromList();
  const update = useUpdateCustomList();

  const list = data?.list;
  const items = data?.items ?? [];
  const isOwner = user && list && user.id === list.user_id;

  return (
    <div className="min-h-dvh bg-background">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 pt-24 pb-24 sm:pt-28">
        <Button variant="ghost" size="sm" asChild className="mb-3">
          <Link to="/account/lists"><ArrowLeft className="w-4 h-4 mr-1.5" /> All lists</Link>
        </Button>

        {isLoading ? (
          <div className="h-24 rounded-2xl bg-muted/30 animate-pulse" />
        ) : !list ? (
          <p className="text-muted-foreground">List not found.</p>
        ) : (
          <>
            <header className="glass rounded-2xl p-5 mb-4">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{list.name}</h1>
                <Badge variant="outline" className="text-[10px] capitalize">{list.list_type}</Badge>
                {list.is_public ? <Globe className="w-4 h-4 text-accent" /> : <Lock className="w-4 h-4 text-muted-foreground" />}
              </div>
              {list.description && <p className="text-sm text-muted-foreground">{list.description}</p>}
              {isOwner && list.is_public && list.share_slug && (
                <div className="mt-3 flex items-center gap-2">
                  <code className="text-[11px] bg-muted/40 px-2 py-1 rounded truncate flex-1">
                    {getSiteBaseUrl()}/lists/{list.share_slug}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await navigator.clipboard.writeText(`${getSiteBaseUrl()}/lists/${list.share_slug}`);
                      toast.success("Link copied");
                    }}
                  >
                    Copy
                  </Button>
                </div>
              )}
              {isOwner && (
                <div className="mt-3 flex items-center gap-2">
                  {list.is_public ? (
                    <Button size="sm" variant="ghost" onClick={() => update.mutate({ id: list.id, patch: { is_public: false } })}>
                      Make private
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => update.mutate({ id: list.id, patch: { is_public: true } })}>
                      Make public
                    </Button>
                  )}
                </div>
              )}
            </header>

            {items.length === 0 ? (
              <div className="text-center py-12 glass rounded-2xl">
                <p className="text-muted-foreground">No items yet.</p>
                <Button asChild className="mt-3">
                  <Link to="/shop"><ExternalLink className="w-4 h-4 mr-1.5" /> Browse shop</Link>
                </Button>
              </div>
            ) : (
              <ul className="space-y-2">
                {items.map((it) => {
                  const p = it.product;
                  if (!p) return null;
                  const img = p.product_images?.find((i) => i.is_primary)?.url || p.product_images?.[0]?.url || "/placeholder.svg";
                  const href = p.slug ? `/product/${p.slug}` : `/product/${p.id}`;
                  return (
                    <li key={it.id} className="glass rounded-xl p-3 flex items-center gap-3">
                      <Link to={href} className="w-14 h-14 rounded-lg overflow-hidden bg-muted/30 shrink-0">
                        <img src={img} alt={p.title} loading="lazy" className="w-full h-full object-contain" />
                      </Link>
                      <Link to={href} className="flex-1 min-w-0 group">
                        <p className="text-sm font-medium truncate group-hover:text-accent transition-colors">{p.title}</p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {inr(p.price)} · qty {it.quantity}
                        </p>
                        {it.note && <p className="text-[11px] text-muted-foreground italic truncate">"{it.note}"</p>}
                      </Link>
                      {isOwner && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => remove.mutate({ id: it.id, list_id: list.id })}
                          aria-label="Remove from list"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </main>
      <BottomNavigation />
    </div>
  );
}
