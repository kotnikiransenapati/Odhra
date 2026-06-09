import { useParams, Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { Badge } from "@/components/ui/badge";
import { Globe, ShoppingBag } from "lucide-react";
import { usePublicCustomList } from "@/hooks/useCustomLists";
import { SEOHead } from "@/components/SEOHead";

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export default function PublicListView() {
  const { slug } = useParams();
  const { data, isLoading } = usePublicCustomList(slug);
  const list = data?.list;
  const items = data?.items ?? [];

  return (
    <div className="min-h-dvh bg-background">
      {list && (
        <SEOHead
          title={`${list.name} – Shared list on Odhra`}
          description={list.description ?? `${list.name} – ${items.length} curated items.`}
          noIndex
        />
      )}
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 pt-24 pb-24 sm:pt-28">
        {isLoading ? (
          <div className="h-24 rounded-2xl bg-muted/30 animate-pulse" />
        ) : !list ? (
          <div className="text-center py-16">
            <h1 className="text-xl font-semibold mb-1">List unavailable</h1>
            <p className="text-sm text-muted-foreground">The owner may have made it private or deleted it.</p>
          </div>
        ) : (
          <>
            <header className="glass rounded-2xl p-5 mb-4">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{list.name}</h1>
                <Badge variant="outline" className="text-[10px] capitalize">{list.list_type}</Badge>
                <Globe className="w-4 h-4 text-accent" />
              </div>
              {list.description && <p className="text-sm text-muted-foreground">{list.description}</p>}
              <p className="text-[11px] text-muted-foreground mt-1">{items.length} items shared with you</p>
            </header>

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
                      <p className="text-xs text-muted-foreground tabular-nums">{inr(p.price)} · qty {it.quantity}</p>
                      {it.note && <p className="text-[11px] text-muted-foreground italic truncate">"{it.note}"</p>}
                    </Link>
                    <Link
                      to={href}
                      className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline shrink-0"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" /> Buy
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </main>
      <BottomNavigation />
    </div>
  );
}
