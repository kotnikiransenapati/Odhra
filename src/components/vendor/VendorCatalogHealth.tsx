import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVendorId } from '@/hooks/useVendorDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Image as ImageIcon, FileText, Tag, Scale, Search, Boxes } from 'lucide-react';

type ProductRow = {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  weight: number | null;
  hsn_code: string | null;
  seo_title: string | null;
  seo_description: string | null;
  low_stock_threshold: number | null;
  tags: string[] | null;
  is_active: boolean | null;
  image_count: number;
};

type Issue = {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  weight: number;
  test: (p: ProductRow) => boolean;
  hint: string;
};

const ISSUES: Issue[] = [
  { key: 'images', label: 'Has product image', icon: ImageIcon, weight: 25, test: (p) => p.image_count > 0, hint: 'Upload at least one image' },
  { key: 'multi_images', label: '2+ images for richness', icon: ImageIcon, weight: 10, test: (p) => p.image_count >= 2, hint: 'Add a secondary image' },
  { key: 'desc', label: 'Description ≥ 80 chars', icon: FileText, weight: 15, test: (p) => (p.description?.trim().length ?? 0) >= 80, hint: 'Write a richer description' },
  { key: 'seo_title', label: 'SEO title set', icon: Search, weight: 10, test: (p) => !!p.seo_title?.trim(), hint: 'Add SEO title' },
  { key: 'seo_desc', label: 'SEO meta description', icon: Search, weight: 10, test: (p) => !!p.seo_description?.trim(), hint: 'Add SEO meta description' },
  { key: 'weight', label: 'Shipping weight set', icon: Scale, weight: 10, test: (p) => !!p.weight && p.weight > 0, hint: 'Set product weight for accurate shipping' },
  { key: 'hsn', label: 'HSN code (GST)', icon: Tag, weight: 10, test: (p) => !!p.hsn_code?.trim(), hint: 'Add HSN code for tax compliance' },
  { key: 'tags', label: 'Has tags', icon: Tag, weight: 5, test: (p) => !!p.tags && p.tags.length > 0, hint: 'Add tags to improve discoverability' },
  { key: 'low_stock', label: 'Low-stock alert threshold', icon: Boxes, weight: 5, test: (p) => (p.low_stock_threshold ?? 0) > 0, hint: 'Configure low-stock alert' },
];

const MAX_WEIGHT = ISSUES.reduce((a, b) => a + b.weight, 0);

export function VendorCatalogHealth() {
  const { data: vendorId } = useVendorId();

  const { data: products, isLoading } = useQuery({
    queryKey: ['vendor-catalog-health', vendorId],
    enabled: !!vendorId,
    staleTime: 60_000,
    queryFn: async (): Promise<ProductRow[]> => {
      const { data: prods, error } = await supabase
        .from('products')
        .select('id,title,slug,description,weight,hsn_code,seo_title,seo_description,low_stock_threshold,tags,is_active')
        .eq('vendor_id', vendorId!)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      const ids = (prods ?? []).map((p) => p.id);
      let imageMap = new Map<string, number>();
      if (ids.length) {
        const { data: imgs } = await supabase
          .from('product_images')
          .select('product_id')
          .in('product_id', ids);
        (imgs ?? []).forEach((r: any) => imageMap.set(r.product_id, (imageMap.get(r.product_id) ?? 0) + 1));
      }
      return (prods ?? []).map((p: any) => ({ ...p, image_count: imageMap.get(p.id) ?? 0 })) as ProductRow[];
    },
  });

  const summary = useMemo(() => {
    if (!products?.length) return null;
    let totalScore = 0;
    const issueCounts: Record<string, number> = {};
    const worst: { product: ProductRow; score: number; missing: Issue[] }[] = [];
    for (const p of products) {
      let s = 0;
      const missing: Issue[] = [];
      for (const i of ISSUES) {
        if (i.test(p)) s += i.weight;
        else {
          missing.push(i);
          issueCounts[i.key] = (issueCounts[i.key] ?? 0) + 1;
        }
      }
      const pct = Math.round((s / MAX_WEIGHT) * 100);
      totalScore += pct;
      worst.push({ product: p, score: pct, missing });
    }
    worst.sort((a, b) => a.score - b.score);
    return {
      avgScore: Math.round(totalScore / products.length),
      total: products.length,
      worst: worst.slice(0, 6),
      issues: ISSUES.map((i) => ({ ...i, count: issueCounts[i.key] ?? 0 })).filter((i) => i.count > 0).sort((a, b) => b.count - a.count),
    };
  }, [products]);

  if (isLoading) {
    return <Skeleton className="h-64 rounded-2xl" />;
  }

  if (!products?.length) {
    return (
      <Card className="border-border/40">
        <CardContent className="py-14 text-center text-muted-foreground">
          <Boxes className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No products yet</p>
          <p className="text-xs mt-1">Add products to see your catalog health score.</p>
        </CardContent>
      </Card>
    );
  }

  const scoreColor =
    (summary?.avgScore ?? 0) >= 85 ? 'text-success' : (summary?.avgScore ?? 0) >= 60 ? 'text-warning' : 'text-destructive';

  return (
    <div className="space-y-6">
      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-lg">Catalog Health</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Listing completeness across {summary?.total} products.</p>
            </div>
            <div className="text-right">
              <p className={`text-3xl font-bold tracking-tight ${scoreColor}`}>{summary?.avgScore}%</p>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Avg score</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={summary?.avgScore ?? 0} className="h-2" />
        </CardContent>
      </Card>

      {summary && summary.issues.length > 0 && (
        <Card className="border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Top missing fields</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {summary.issues.map((i) => (
                <div key={i.key} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40 border border-border/30">
                  <div className="w-9 h-9 rounded-lg bg-warning/10 text-warning flex items-center justify-center">
                    <i.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{i.label}</p>
                    <p className="text-xs text-muted-foreground">{i.hint}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">{i.count} product{i.count > 1 ? 's' : ''}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Products needing attention</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {summary?.worst.map((w) => (
            <div key={w.product.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/30 hover:bg-secondary/30 transition-colors">
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{w.product.title}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {w.missing.slice(0, 4).map((m) => (
                    <Badge key={m.key} variant="outline" className="text-[10px]">
                      <AlertTriangle className="w-2.5 h-2.5 mr-1" />{m.label}
                    </Badge>
                  ))}
                  {w.missing.length === 0 && (
                    <Badge variant="outline" className="text-[10px] text-success border-success/30">
                      <CheckCircle2 className="w-2.5 h-2.5 mr-1" />Complete
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`text-sm font-bold ${w.score >= 85 ? 'text-success' : w.score >= 60 ? 'text-warning' : 'text-destructive'}`}>
                  {w.score}%
                </span>
                <Button size="sm" variant="outline" asChild>
                  <Link to={`/vendor/products/${w.product.id}/edit`}>Fix</Link>
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
