import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Scale, X, ShoppingBag, Star, Truck, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { SEOHead } from "@/components/SEOHead";
import { useCompare } from "@/contexts/CompareContext";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { haptic } from "@/lib/haptics";
import { EditorialPageHeader } from "@/components/layout/EditorialPageHeader";

interface FullProduct {
  id: string;
  title: string;
  slug: string | null;
  price: number;
  compare_at_price: number | null;
  review_count: number | null;
  stock: number | null;
  description: string | null;
  vendor_id: string | null;
  category_id: string | null;
  image: string | null;
}

const ROW_DEFINITIONS: Array<{
  label: string;
  format: (p: FullProduct) => string | number;
}> = [
  { label: "Price", format: (p) => `₹${p.price.toLocaleString("en-IN")}` },
  {
    label: "Discount",
    format: (p) =>
      p.compare_at_price && p.compare_at_price > p.price
        ? `${Math.round(((p.compare_at_price - p.price) / p.compare_at_price) * 100)}% off`
        : "—",
  },
  {
    label: "Reviews",
    format: (p) => (p.review_count ? `${p.review_count} reviews` : "No reviews yet"),
  },
  {
    label: "Availability",
    format: (p) => ((p.stock ?? 0) > 0 ? "In stock" : "Out of stock"),
  },
];

export default function Compare() {
  const { items, remove, clear } = useCompare();
  const { addItem } = useCart();

  const ids = items.map((i) => i.id);
  const { data: products, isLoading } = useQuery({
    queryKey: ["compare-products", ids.slice().sort().join(",")],
    enabled: ids.length > 0,
    queryFn: async (): Promise<FullProduct[]> => {
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, title, slug, price, compare_at_price, review_count, stock, description, vendor_id, category_id"
        )
        .in("id", ids);
      if (error) throw error;
      const map = new Map(
        (data ?? []).map((p) => [
          p.id,
          { ...p, image: items.find((i) => i.id === p.id)?.image ?? null } as FullProduct,
        ])
      );
      return ids.map((id) => map.get(id)).filter(Boolean) as FullProduct[];
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Compare Products"
        description="Compare products side-by-side on price, rating, availability and more."
        noIndex
      />
      <Navbar />

      <main className="container mx-auto px-3 sm:px-4 py-6 pb-32">
        <EditorialPageHeader
          eyebrow="Side By Side"
          title="Compare"
          subtitle={items.length > 0 ? `${items.length} of 4 products selected — find the perfect match` : 'Add up to 4 products to compare specs, prices, and reviews.'}
          icon={<Scale className="w-6 h-6 text-accent" />}
          actions={
            items.length > 0 ? (
              <Button variant="outline" size="sm" onClick={() => { haptic("warning"); clear(); }}>
                Clear all
              </Button>
            ) : null
          }
        />


        {items.length === 0 ? (
          <div className="text-center py-20 max-w-md mx-auto">
            <Scale className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            <h2 className="text-lg font-medium mb-2">Nothing to compare yet</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Tap "Compare" on any product to add it here. Up to 4 items.
            </p>
            <Button asChild>
              <Link to="/shop">Browse products</Link>
            </Button>
          </div>
        ) : isLoading || !products ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {items.map((_, i) => (
              <Skeleton key={i} className="h-80 rounded-2xl" />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="overflow-x-auto -mx-3 sm:mx-0"
          >
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className="w-32 text-left p-2 sticky left-0 bg-background z-10" />
                  {products.map((p) => (
                    <th key={p.id} className="p-2 align-top min-w-[200px]">
                      <article className="rounded-2xl border border-border/40 p-3 bg-card">
                        <button
                          type="button"
                          onClick={() => { haptic("warning"); remove(p.id); }}
                          className="ml-auto block text-muted-foreground hover:text-destructive"
                          aria-label={`Remove ${p.title}`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <Link to={`/product/${p.slug ?? p.id}`} className="block">
                          <div className="aspect-square rounded-xl overflow-hidden bg-muted mb-2">
                            {p.image && (
                              <img
                                src={p.image}
                                alt={p.title}
                                loading="lazy"
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                          <h3 className="text-sm font-medium line-clamp-2 hover:text-accent">
                            {p.title}
                          </h3>
                        </Link>
                        <Button
                          size="sm"
                          className="w-full mt-3"
                          disabled={(p.stock ?? 0) <= 0}
                          onClick={() => {
                            haptic("medium");
                            addItem(p.id, 1);
                          }}
                        >
                          <ShoppingBag className="w-4 h-4 mr-1.5" />
                          {(p.stock ?? 0) > 0 ? "Add to cart" : "Sold out"}
                        </Button>
                      </article>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROW_DEFINITIONS.map((row) => (
                  <tr key={row.label} className="border-t border-border/30">
                    <td className="p-3 font-medium text-xs uppercase text-muted-foreground sticky left-0 bg-background">
                      {row.label}
                    </td>
                    {products.map((p) => (
                      <td key={p.id} className="p-3 align-top">
                        {row.format(p)}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="border-t border-border/30">
                  <td className="p-3 font-medium text-xs uppercase text-muted-foreground sticky left-0 bg-background">
                    Description
                  </td>
                  {products.map((p) => (
                    <td key={p.id} className="p-3 align-top text-xs text-muted-foreground">
                      <span className="line-clamp-4 whitespace-pre-wrap">
                        {p.description?.trim() || "—"}
                      </span>
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-border/30">
                  <td className="p-3 font-medium text-xs uppercase text-muted-foreground sticky left-0 bg-background">
                    Perks
                  </td>
                  {products.map((p) => (
                    <td key={p.id} className="p-3 align-top">
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        <li className="flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 text-accent" />
                          {p.price >= 999 ? "Free shipping" : "Standard shipping"}
                        </li>
                        <li className="flex items-center gap-1.5">
                          <RotateCcw className="w-3.5 h-3.5 text-accent" /> 7-day returns
                        </li>
                        <li className="flex items-center gap-1.5">
                          <Star className="w-3.5 h-3.5 text-accent" />
                          {p.review_count ? `${p.review_count} reviews` : "New"}
                        </li>
                      </ul>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </motion.div>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
}
