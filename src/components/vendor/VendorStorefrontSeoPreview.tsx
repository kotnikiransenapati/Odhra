import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useVendorImpersonation } from "@/contexts/VendorImpersonationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Search, ExternalLink, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { getSiteUrl } from "@/lib/siteUrl";

interface VendorInfo {
  id: string;
  brand_name: string;
  slug: string;
  bio: string | null;
  logo_url: string | null;
  banner_url: string | null;
  is_verified: boolean;
}

interface Check {
  id: string;
  label: string;
  weight: number;
  pass: boolean;
  hint?: string;
}

export function VendorStorefrontSeoPreview() {
  const { user } = useAuth();
  const { impersonatedVendor, isImpersonating } = useVendorImpersonation();
  const impersonatedId = isImpersonating ? impersonatedVendor?.id : null;
  const [vendor, setVendor] = useState<VendorInfo | null>(null);
  const [productCount, setProductCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id && !impersonatedId) return;
    (async () => {
      setLoading(true);
      const q = impersonatedId
        ? supabase.from("vendors").select("id, brand_name, slug, bio, logo_url, banner_url, is_verified").eq("id", impersonatedId).maybeSingle()
        : supabase.from("vendors").select("id, brand_name, slug, bio, logo_url, banner_url, is_verified").eq("user_id", user!.id).maybeSingle();
      const { data: v } = await q;
      if (v) {
        setVendor(v as VendorInfo);
        const { count } = await supabase.from("products")
          .select("id", { count: "exact", head: true })
          .eq("vendor_id", (v as any).id).eq("is_active", true);
        setProductCount(count || 0);
      }
      setLoading(false);
    })();
  }, [user?.id, impersonatedId]);

  const checks: Check[] = useMemo(() => {
    if (!vendor) return [];
    const bio = (vendor.bio || "").trim();
    return [
      { id: "name", label: "Brand name set", weight: 10, pass: !!vendor.brand_name?.trim() },
      { id: "slug", label: "Custom storefront URL", weight: 10, pass: !!vendor.slug },
      { id: "bio_min", label: "Bio at least 80 characters", weight: 15, pass: bio.length >= 80, hint: bio.length === 0 ? "Add a bio so search engines know what you sell." : `Currently ${bio.length} chars.` },
      { id: "bio_max", label: "Bio under 160 characters (meta-friendly)", weight: 5, pass: bio.length > 0 && bio.length <= 160 },
      { id: "logo", label: "Logo uploaded", weight: 10, pass: !!vendor.logo_url, hint: "Logos boost CTR in social previews." },
      { id: "banner", label: "Banner image uploaded", weight: 10, pass: !!vendor.banner_url },
      { id: "verified", label: "Verified seller badge", weight: 15, pass: vendor.is_verified, hint: "Complete KYC to verify." },
      { id: "products", label: "At least 5 active products", weight: 25, pass: productCount >= 5, hint: `Currently ${productCount} active.` },
    ];
  }, [vendor, productCount]);

  const score = useMemo(() => {
    if (checks.length === 0) return 0;
    const earned = checks.filter(c => c.pass).reduce((a, c) => a + c.weight, 0);
    const total = checks.reduce((a, c) => a + c.weight, 0);
    return Math.round((earned / total) * 100);
  }, [checks]);

  if (loading) {
    return <Card className="border-border/40"><CardContent className="p-6 space-y-3">
      <Skeleton className="h-8 w-48" /><Skeleton className="h-40 w-full" /><Skeleton className="h-32 w-full" />
    </CardContent></Card>;
  }
  if (!vendor) {
    return <Card className="border-border/40"><CardContent className="p-10 text-center text-sm text-muted-foreground">Storefront not set up yet.</CardContent></Card>;
  }

  const url = `${getSiteUrl()}/store/${vendor.slug}`;
  const metaTitle = `${vendor.brand_name} · Shop on Odhra`;
  const metaDesc = (vendor.bio || `Discover ${vendor.brand_name} — handpicked products with fast India Post & Delhivery shipping.`).slice(0, 160);
  const scoreColor = score >= 80 ? "text-success" : score >= 50 ? "text-warning" : "text-destructive";

  return (
    <div className="space-y-6">
      <Card className="border-border/40">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="w-5 h-5 text-accent" /> Storefront SEO Preview
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold ${scoreColor}`}>{score}</span>
              <span className="text-xs text-muted-foreground">/ 100</span>
              <Button asChild size="sm" variant="outline" className="ml-2 gap-1">
                <Link to={`/store/${vendor.slug}`} target="_blank"><ExternalLink className="w-3.5 h-3.5" /> View live</Link>
              </Button>
            </div>
          </div>
          <Progress value={score} className="mt-3 h-2" />
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Google preview */}
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">Google result preview</p>
            <div className="rounded-xl border border-border/40 bg-background p-4 font-sans">
              <p className="text-xs text-emerald-700 dark:text-emerald-400 truncate">{url}</p>
              <p className="text-[19px] leading-snug text-blue-700 dark:text-blue-400 hover:underline cursor-pointer mt-0.5 font-normal">{metaTitle}</p>
              <p className="text-sm text-muted-foreground leading-snug mt-1 line-clamp-2">{metaDesc}</p>
            </div>
          </div>

          {/* Social preview */}
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">Social share card</p>
            <div className="rounded-xl border border-border/40 overflow-hidden bg-background max-w-md">
              <div className="aspect-[1.91/1] bg-secondary/40 relative overflow-hidden">
                {vendor.banner_url ? (
                  <img src={vendor.banner_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No banner uploaded</div>
                )}
                {vendor.logo_url && (
                  <img src={vendor.logo_url} alt="" className="absolute bottom-3 left-3 w-12 h-12 rounded-lg border-2 border-background object-cover bg-background" />
                )}
              </div>
              <div className="p-3 border-t border-border/40">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">odhra.com</p>
                <p className="font-semibold text-sm leading-tight mt-0.5">{metaTitle}</p>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{metaDesc}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/40">
        <CardHeader className="pb-3"><CardTitle className="text-base">Optimization checklist</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {checks.map(c => (
              <li key={c.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/20">
                {c.pass ? (
                  <CheckCircle2 className="w-4 h-4 text-success mt-0.5 shrink-0" />
                ) : c.weight >= 15 ? (
                  <XCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${c.pass ? '' : 'text-foreground'}`}>{c.label}</p>
                  {!c.pass && c.hint && <p className="text-xs text-muted-foreground mt-0.5">{c.hint}</p>}
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">{c.weight}pt</Badge>
              </li>
            ))}
          </ul>
          <Button asChild variant="outline" size="sm" className="mt-4 w-full">
            <Link to="/vendor/settings">Edit storefront details</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default VendorStorefrontSeoPreview;
