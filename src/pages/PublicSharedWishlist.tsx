import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, ShoppingBag, Eye, ArrowLeft, Lock } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePublicSharedWishlist } from "@/hooks/useSharedWishlists";
import { useEffect } from "react";

function priceFmt(n: number) {
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

export default function PublicSharedWishlist() {
  const { code } = useParams<{ code: string }>();
  const { data, isLoading, isError } = usePublicSharedWishlist(code);

  const title = data?.title ? `${data.title} — Shared wishlist` : "Shared wishlist";
  const desc = data?.description || "A wishlist shared on Odhra";

  useEffect(() => {
    document.title = title.slice(0, 60);
    const setMeta = (name: string, content: string, isProp = false) => {
      const sel = isProp ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let el = document.head.querySelector<HTMLMetaElement>(sel);
      if (!el) {
        el = document.createElement("meta");
        if (isProp) el.setAttribute("property", name); else el.setAttribute("name", name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };
    setMeta("description", desc.slice(0, 160));
    setMeta("og:title", title, true);
    setMeta("og:description", desc, true);
    setMeta("robots", data ? "index,follow" : "noindex");
  }, [title, desc, data]);

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-0">
      <Navbar />
      <main className="pt-24 px-4 max-w-5xl mx-auto">
        <Button variant="ghost" asChild className="mb-4">
          <Link to="/shop" className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Browse shop
          </Link>
        </Button>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] w-full" />)}
            </div>
          </div>
        ) : isError || !data ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center mb-4">
              <Lock className="w-7 h-7 text-muted-foreground" />
            </div>
            <h1 className="text-xl font-semibold mb-2">Wishlist unavailable</h1>
            <p className="text-muted-foreground mb-6">This link may be private or no longer exists.</p>
            <Button asChild><Link to="/shop">Explore products</Link></Button>
          </div>
        ) : (
          <>
            <motion.header
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-4 mb-6 p-4 rounded-2xl bg-gradient-to-br from-accent/10 to-primary/5 border"
            >
              <Avatar className="w-14 h-14">
                <AvatarImage src={data.owner?.avatar_url ?? undefined} />
                <AvatarFallback>
                  {(data.owner?.display_name?.[0] ?? "U").toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl md:text-2xl font-bold truncate">{data.title}</h1>
                <p className="text-sm text-muted-foreground truncate">
                  Curated by {data.owner?.display_name ?? "an Odhra shopper"}
                </p>
                {data.description && (
                  <p className="text-sm mt-1 line-clamp-2">{data.description}</p>
                )}
              </div>
              <Badge variant="secondary" className="hidden sm:inline-flex gap-1">
                <Eye className="w-3 h-3" /> {data.view_count}
              </Badge>
            </motion.header>

            {data.items.length === 0 ? (
              <div className="text-center py-16">
                <Heart className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground">This wishlist is empty for now.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {data.items.map((it, idx) => {
                  const img = it.product.images.find((i) => i.is_primary)?.url ?? it.product.images[0]?.url;
                  const href = it.product.slug ? `/product/${it.product.slug}` : `/product/${it.product.id}`;
                  const off = it.product.compare_at_price && it.product.compare_at_price > it.product.price
                    ? Math.round(((it.product.compare_at_price - it.product.price) / it.product.compare_at_price) * 100)
                    : 0;
                  return (
                    <motion.div
                      key={it.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx * 0.02, 0.3) }}
                    >
                      <Link to={href} className="block group rounded-xl overflow-hidden border bg-card card-interactive">
                        <div className="aspect-[3/4] bg-muted relative overflow-hidden">
                          {img ? (
                            <img src={img} alt={it.product.title} loading="lazy" className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">No image</div>
                          )}
                          {off > 0 && (
                            <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-success text-success-foreground">
                              -{off}%
                            </span>
                          )}
                          {it.product.stock === 0 && (
                            <span className="absolute top-2 right-2 text-[10px] font-medium px-2 py-0.5 rounded-full bg-background/90">
                              Sold out
                            </span>
                          )}
                        </div>
                        <div className="p-2.5 space-y-1">
                          <p className="text-sm font-medium line-clamp-2 leading-tight">{it.product.title}</p>
                          <div className="flex items-baseline gap-2">
                            <span className="font-bold text-accent">{priceFmt(it.product.price)}</span>
                            {off > 0 && (
                              <span className="text-xs line-through text-muted-foreground">
                                {priceFmt(it.product.compare_at_price!)}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            )}

            <div className="mt-10 text-center">
              <Button asChild size="lg" className="gap-2">
                <Link to="/shop">
                  <ShoppingBag className="w-4 h-4" /> Discover more on Odhra
                </Link>
              </Button>
            </div>
          </>
        )}
      </main>
      <BottomNavigation />
    </div>
  );
}
