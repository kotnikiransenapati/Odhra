import React, { useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/layout/Navbar';
import { ProductCard } from '@/components/shop/ProductCard';
import { SEOHead } from '@/components/SEOHead';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Star, CheckCircle2, Package, MapPin, Calendar, Store, ArrowLeft, SlidersHorizontal, Globe, Instagram, Facebook, Twitter, Share2, Sparkles, Truck, RotateCcw, Clock } from 'lucide-react';
import { normalizeSocialLink, type SocialPlatform } from '@/lib/socialLinkValidation';
import { toast } from 'sonner';
import { format } from 'date-fns';

const SOCIAL_ICONS: Record<SocialPlatform, React.ComponentType<{ className?: string }>> = {
  website: Globe,
  instagram: Instagram,
  facebook: Facebook,
  twitter: Twitter,
};

const SOCIAL_LABELS: Record<SocialPlatform, string> = {
  website: 'Website',
  instagram: 'Instagram',
  facebook: 'Facebook',
  twitter: 'X',
};

function VendorSocialBar({
  socialLinks,
  brandName,
  slug,
}: {
  socialLinks: Record<string, any> | null | undefined;
  brandName: string;
  slug: string | null | undefined;
}) {
  const platforms: SocialPlatform[] = ['website', 'instagram', 'facebook', 'twitter'];
  const valid = platforms
    .map((p) => {
      const raw = socialLinks?.[p];
      if (!raw || typeof raw !== 'string') return null;
      const v = normalizeSocialLink(p, raw);
      return v.ok && v.value ? { platform: p, href: v.value } : null;
    })
    .filter(Boolean) as { platform: SocialPlatform; href: string }[];

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/store/${slug}` : '';
    try {
      if (navigator.share) {
        await navigator.share({ title: brandName, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Storefront link copied');
      }
    } catch {
      /* user cancelled */
    }
  };

  if (valid.length === 0 && !slug) return null;

  return (
    <div className="flex items-center gap-2 mt-3 flex-wrap">
      {valid.map(({ platform, href }) => {
        const Icon = SOCIAL_ICONS[platform];
        return (
          <a
            key={platform}
            href={href}
            target="_blank"
            rel="noopener noreferrer me"
            aria-label={`${SOCIAL_LABELS[platform]} (opens in new tab)`}
            className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-border/60 bg-card hover:border-accent hover:text-accent transition-colors"
          >
            <Icon className="w-4 h-4" />
          </a>
        );
      })}
      {slug && (
        <button
          type="button"
          onClick={handleShare}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-border/60 bg-card text-sm hover:border-accent hover:text-accent transition-colors"
        >
          <Share2 className="w-4 h-4" />
          Share store
        </button>
      )}
    </div>
  );
}

export default function VendorStorefront() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const [sortBy, setSortBy] = useState('newest');
  const { isAdmin } = useAuth();
  const adminPreview = searchParams.get('preview') === 'admin' && isAdmin;

  const { data: vendor, isLoading: vendorLoading } = useQuery({
    queryKey: ['vendor-storefront', slug, adminPreview],
    queryFn: async () => {
      let query = supabase
        .from('vendors')
        .select('id, brand_name, slug, bio, logo_url, banner_url, is_active, is_verified, created_at, social_links')
        .eq('slug', slug!);

      if (!adminPreview) query = query.eq('is_active', true).eq('is_verified', true);

      const { data, error } = await query.single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['vendor-products', vendor?.id, sortBy],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select(`
          id, title, slug, price, compare_at_price, stock, is_featured, avg_rating, review_count, sold_count,
          product_images(url, is_primary, alt_text),
          categories(name)
        `)
        .eq('vendor_id', vendor!.id);

      if (!adminPreview) query = query.eq('is_active', true);

      switch (sortBy) {
        case 'price_low': query = query.order('price', { ascending: true }); break;
        case 'price_high': query = query.order('price', { ascending: false }); break;
        case 'popular': query = query.order('sold_count', { ascending: false }); break;
        case 'rating': query = query.order('avg_rating', { ascending: false }); break;
        default: query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!vendor?.id,
  });

  const { data: stats } = useQuery({
    queryKey: ['vendor-stats', vendor?.id],
    queryFn: async () => {
      const { count: productCount } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('vendor_id', vendor!.id)
        .eq('is_active', true);

      const { data: reviewData } = await supabase
        .from('products')
        .select('avg_rating, review_count')
        .eq('vendor_id', vendor!.id)
        .eq('is_active', true)
        .gt('review_count', 0);

      const totalReviews = reviewData?.reduce((sum, p) => sum + (p.review_count || 0), 0) || 0;
      const avgRating = totalReviews > 0
        ? reviewData!.reduce((sum, p) => sum + (p.avg_rating || 0) * (p.review_count || 0), 0) / totalReviews
        : 0;

      return { productCount: productCount || 0, totalReviews, avgRating };
    },
    enabled: !!vendor?.id,
  });

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  if (vendorLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[60vh]">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center h-[60vh] px-4">
          <Store className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Store Not Found</h2>
          <p className="text-muted-foreground mb-6">This vendor store doesn't exist or is no longer active.</p>
          <Button asChild><Link to="/shop">Browse All Products</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${vendor.brand_name} – Shop on Odhra`}
        description={vendor.bio || `Shop ${vendor.brand_name}'s collection on Odhra marketplace.`}
      />
      <Navbar />

      {adminPreview && (
        <div className="border-b border-warning/20 bg-warning/10 px-4 py-2 text-center text-sm text-warning">
          Admin preview · this storefront may include inactive products or an unapproved vendor profile
        </div>
      )}

      {/* Banner */}
      <div className="relative h-48 md:h-64 bg-gradient-to-br from-accent/20 via-primary/10 to-secondary/20 overflow-hidden">
        {vendor.banner_url && (
          <img src={vendor.banner_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      </div>

      {/* Vendor Info */}
      <div className="max-w-7xl mx-auto px-4 -mt-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start gap-5"
        >
          {/* Logo */}
          <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl border-4 border-background bg-card shadow-xl overflow-hidden shrink-0">
            {vendor.logo_url ? (
              <img src={vendor.logo_url} alt={vendor.brand_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-accent/10">
                <Store className="w-10 h-10 text-accent" />
              </div>
            )}
          </div>

          <div className="flex-1 pt-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-bold">{vendor.brand_name}</h1>
              {vendor.is_verified && (
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Verified
                </Badge>
              )}
              {adminPreview && !vendor.is_active && <Badge variant="destructive">Inactive</Badge>}
              {adminPreview && !vendor.is_verified && <Badge variant="outline" className="text-warning border-warning/30">Unverified</Badge>}
            </div>
            {vendor.bio && <p className="text-muted-foreground mt-1 max-w-2xl">{vendor.bio}</p>}

            {/* Stats */}
            <div className="flex flex-wrap gap-4 mt-3 text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Package className="w-4 h-4" />
                <span className="font-medium text-foreground">{stats?.productCount || 0}</span> Products
              </div>
              {(stats?.avgRating || 0) > 0 && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Star className="w-4 h-4 fill-warning text-warning" />
                  <span className="font-medium text-foreground">{stats!.avgRating.toFixed(1)}</span>
                  ({stats!.totalReviews} reviews)
                </div>
              )}
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                Since {format(new Date(vendor.created_at), 'MMM yyyy')}
              </div>
            </div>

            {/* Social links + share */}
            <VendorSocialBar
              socialLinks={vendor.social_links as any}
              brandName={vendor.brand_name}
              slug={vendor.slug}
            />
          </div>
        </motion.div>

        {/* Toolbar */}
        <div className="flex items-center justify-between mt-8 mb-6 flex-wrap gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/shop" className="gap-1.5">
              <ArrowLeft className="w-4 h-4" /> All Products
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[160px] h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="popular">Most Popular</SelectItem>
                <SelectItem value="rating">Top Rated</SelectItem>
                <SelectItem value="price_low">Price: Low → High</SelectItem>
                <SelectItem value="price_high">Price: High → Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Featured strip (only on default sort) */}
        {sortBy === 'newest' && products && products.some((p) => p.is_featured) && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-accent" />
              <h2 className="text-base font-semibold">Featured by {vendor.brand_name}</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 scrollbar-thin">
              {products
                .filter((p) => p.is_featured)
                .slice(0, 8)
                .map((product) => {
                  const primaryImage =
                    product.product_images?.find((img: any) => img.is_primary) || product.product_images?.[0];
                  return (
                    <div
                      key={`featured-${product.id}`}
                      className="snap-start shrink-0 w-[160px] sm:w-[180px]"
                    >
                      <ProductCard
                        id={product.id}
                        title={product.title}
                        slug={product.slug}
                        price={product.price}
                        compareAtPrice={product.compare_at_price}
                        imageUrl={primaryImage?.url}
                        rating={product.avg_rating || 0}
                        reviewCount={product.review_count || 0}
                        vendorName={vendor.brand_name}
                        isFeatured
                        stock={product.stock}
                        soldCount={product.sold_count || 0}
                      />
                    </div>
                  );
                })}
            </div>
          </section>
        )}

        {/* Products Grid */}
        {productsLoading ? (
          <div className="flex items-center justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : products && products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-10">
            {products.map((product) => {
              const primaryImage = product.product_images?.find((img: any) => img.is_primary) || product.product_images?.[0];
              return (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  title={product.title}
                  slug={product.slug}
                  price={product.price}
                  compareAtPrice={product.compare_at_price}
                  imageUrl={primaryImage?.url}
                  rating={product.avg_rating || 0}
                  reviewCount={product.review_count || 0}
                  vendorName={vendor.brand_name}
                  isFeatured={product.is_featured}
                  stock={product.stock}
                  soldCount={product.sold_count || 0}
                />
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Package className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">No products yet</h3>
            <p className="text-muted-foreground">This store hasn't listed any products yet.</p>
          </div>
        )}

        {/* About this store */}
        <StorePoliciesSection
          socialLinks={vendor.social_links as any}
          createdAt={vendor.created_at}
          bio={vendor.bio}
          brandName={vendor.brand_name}
        />
      </div>
    </div>
  );
}
