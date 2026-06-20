import React, { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePersonalizedRails } from "@/hooks/usePersonalizedRails";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ProductCard } from "@/components/shop/ProductCard";
import { motion } from "framer-motion";
import { Sparkles, TrendingUp, History } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { trackRailEvent } from "@/lib/railAnalytics";

const RAIL_ICONS: Record<string, React.ElementType> = {
  for_you: Sparkles,
  trending: TrendingUp,
  continue: History,
};

export const PersonalizedRails: React.FC = () => {
  const { user } = useAuth();
  const { data: rails, isLoading } = usePersonalizedRails(user?.id);

  // Trigger compute on first mount if no rails
  useEffect(() => {
    if (!user?.id) return;
    if (!isLoading && (!rails || rails.length === 0)) {
      supabase.functions.invoke("compute-personalized-rails").catch(() => {});
    }
  }, [user?.id, isLoading, rails]);

  if (!user) return null;
  if (isLoading) {
    return (
      <div className="space-y-8 py-8">
        {[1, 2].map((i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-7 w-48" />
            <div className="flex gap-4 overflow-hidden">
              {[1, 2, 3, 4].map((j) => <Skeleton key={j} className="h-64 w-48 flex-shrink-0" />)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!rails || rails.length === 0) return null;

  return (
    <section className="space-y-10 py-8" aria-label="Personalized recommendations">
      {rails.map((rail) => (
        <RailRow key={rail.id} title={rail.title} railKey={rail.rail_key} productIds={rail.product_ids} />
      ))}
    </section>
  );
};

const RailRow: React.FC<{ title: string; railKey: string; productIds: string[] }> = ({ title, railKey, productIds }) => {
  const Icon = RAIL_ICONS[railKey] ?? Sparkles;
  const { data: products } = useQuery({
    queryKey: ["rail-products", railKey, productIds],
    enabled: productIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, title, slug, price, compare_at_price, avg_rating, review_count, stock, sold_count, is_featured, product_images(url, is_primary)")
        .in("id", productIds)
        .eq("is_active", true);
      const map = new Map((data ?? []).map((p: any) => [p.id, p]));
      return productIds.map((id) => map.get(id)).filter(Boolean) as any[];
    },
  });

  if (!products || products.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="space-y-4"
    >
      <div className="flex items-center gap-2 px-1">
        <Icon className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-thin">
        {products.map((p: any, idx: number) => {
          const primary = (p.product_images ?? []).find((i: any) => i.is_primary) ?? p.product_images?.[0];
          return (
            <RailTile key={p.id} railKey={railKey} productId={p.id} rank={idx}>
              <ProductCard
                id={p.id}
                title={p.title}
                slug={p.slug}
                price={p.price}
                compareAtPrice={p.compare_at_price}
                imageUrl={primary?.url}
                rating={p.avg_rating ?? 0}
                reviewCount={p.review_count ?? 0}
                stock={p.stock}
                soldCount={p.sold_count ?? 0}
                isFeatured={p.is_featured}
              />
            </RailTile>
          );
        })}
      </div>
    </motion.div>
  );
};


export default PersonalizedRails;
