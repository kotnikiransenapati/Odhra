import React from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useGuestForYou } from "@/hooks/useGuestForYou";
import { ProductCard } from "@/components/shop/ProductCard";

/**
 * "Inspired by your browsing" rail for anonymous / signed-out visitors.
 * Hidden entirely when the visitor has no affinity signal or no matches.
 */
export const GuestForYouRail: React.FC = () => {
  const { user } = useAuth();
  const { data, isLoading } = useGuestForYou(12);

  // Authenticated users get the richer PersonalizedRails component instead
  if (user) return null;
  if (isLoading) return null;
  if (!data || data.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="space-y-4 py-8 px-4"
      aria-label="Inspired by your browsing"
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-2 px-1 mb-4">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold tracking-tight">Inspired by your browsing</h2>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-thin">
          {data.map((p) => {
            const primary = (p.product_images ?? []).find((i) => i.is_primary) ?? p.product_images?.[0];
            return (
              <div key={p.id} className="w-48 flex-shrink-0 snap-start">
                <ProductCard
                  id={p.id}
                  title={p.title}
                  slug={p.slug ?? undefined}
                  price={p.price}
                  compareAtPrice={p.compare_at_price ?? undefined}
                  imageUrl={primary?.url}
                  rating={p.avg_rating ?? 0}
                  reviewCount={p.review_count ?? 0}
                  stock={p.stock}
                  soldCount={p.sold_count ?? 0}
                  isFeatured={p.is_featured ?? false}
                />
              </div>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
};

export default GuestForYouRail;
