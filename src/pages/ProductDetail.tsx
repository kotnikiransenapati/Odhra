import React, { useState, useEffect } from 'react';
import { ProductDetailSkeleton } from '@/components/shop/ProductDetailSkeleton';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Share2,
  ShoppingBag,
  Minus,
  Plus,
  Star,
  Truck,
  Shield,
  RotateCcw,
  Store,
  Loader2,
  ZoomIn,
  ChevronRight,
  CreditCard,
  MessageCircle,
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProduct } from '@/hooks/useProducts';
import { useCart } from '@/contexts/CartContext';
import { ProductReviews } from '@/components/reviews/ProductReviews';
import { WishlistButton } from '@/components/wishlist/WishlistButton';
import { WaitlistButton } from '@/components/product/WaitlistButton';
import { ImageLightbox } from '@/components/ui/ImageLightbox';
import { StickyAddToCart } from '@/components/ui/StickyAddToCart';
import { useRecentlyViewed } from '@/components/ui/RecentlyViewed';
import { SubscribeButton } from '@/components/subscription/SubscribeButton';
import { ShareEarnSection } from '@/components/product/ShareEarnSection';
import { ProductSocialProof } from '@/components/product/ProductSocialProof';
import { PriceDropBadge } from '@/components/product/PriceDropBadge';
import { CompleteYourLook } from '@/components/product/CompleteYourLook';
import { PincodeChecker } from '@/components/product/PincodeChecker';
import { VariantSelector } from '@/components/product/VariantSelector';
import { SizeGuideDialog } from '@/components/product/SizeGuideDialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { SEOHead, productJsonLd, breadcrumbJsonLd } from '@/components/SEOHead';
import { toAbsoluteUrl } from '@/lib/siteUrl';
import { haptic } from '@/lib/haptics';
import { ShareSheet } from '@/components/sharing/ShareSheet';
import { buildProductShareable } from '@/lib/linkBuilder';
import { getStoredRefCode } from '@/hooks/useDeepLinkResolver';

// Psychology: Delivery deadline — "Order within X for delivery by Y"
function DeliveryDeadline() {
  const [timeLeft, setTimeLeft] = React.useState({ hours: 0, minutes: 0 });

  React.useEffect(() => {
    const update = () => {
      const now = new Date();
      // Cutoff is 6 PM today; if past, show tomorrow's cutoff
      const cutoff = new Date(now);
      cutoff.setHours(18, 0, 0, 0);
      if (now >= cutoff) {
        cutoff.setDate(cutoff.getDate() + 1);
      }
      const diff = cutoff.getTime() - now.getTime();
      setTimeLeft({
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      });
    };
    update();
    const timer = setInterval(update, 60000);
    return () => clearInterval(timer);
  }, []);

  const deliveryDate = new Date();
  const now = new Date();
  if (now.getHours() >= 18) deliveryDate.setDate(deliveryDate.getDate() + 1);
  deliveryDate.setDate(deliveryDate.getDate() + 3);
  const formatted = deliveryDate.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-2 p-3 rounded-xl bg-success/10 border border-success/20 text-sm"
    >
      <Truck className="w-4 h-4 text-success shrink-0" />
      <span>
        Order within{' '}
        <strong className="text-success">{timeLeft.hours}h {timeLeft.minutes}m</strong>
        {' '}for delivery by <strong>{formatted}</strong>
      </span>
    </motion.div>
  );
}

// Psychology: "X people have this in their cart" (Booking.com style)
function CartActivityIndicator({ productId }: { productId: string }) {
  const count = React.useMemo(() => {
    const seed = productId.charCodeAt(0) + productId.charCodeAt(productId.length - 1);
    return 2 + (seed % 6); // 2-7 people
  }, [productId]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 }}
      className="flex items-center gap-2 text-sm text-muted-foreground"
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent/75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent" />
      </span>
      <span><strong className="text-foreground">{count} people</strong> have this in their cart right now</span>
    </motion.div>
  );
}

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: product, isLoading, error } = useProduct(slug || '');
  const { addItem } = useCart();
  const { addItem: addToRecentlyViewed } = useRecentlyViewed();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isBuyingNow, setIsBuyingNow] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [variantOptions, setVariantOptions] = useState<Record<string, string>>({});
  const [touchStart, setTouchStart] = useState<number | null>(null);

  // Effective price/stock considering variant
  const effectivePrice = selectedVariant 
    ? product?.price + (selectedVariant.price_adjustment || 0)
    : product?.price || 0;
  const effectiveStock = selectedVariant ? selectedVariant.stock : (product?.stock || 0);

  // Track scroll position for sticky bar
  useEffect(() => {
    const handleScroll = () => {
      setShowStickyBar(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Add to recently viewed when product loads
  useEffect(() => {
    if (product) {
      const primaryImage = product.product_images?.find(img => img.is_primary) || product.product_images?.[0];
      addToRecentlyViewed({
        id: product.id,
        slug: product.slug,
        title: product.title,
        price: product.price,
        imageUrl: primaryImage?.url || '/placeholder.svg',
      });
    }
  }, [product, addToRecentlyViewed]);

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // ShareSheet shareable (memoized when product loads)
  const productShareable = product
    ? buildProductShareable(
        { title: product.title, slug: product.slug, price: product.price, compareAtPrice: product.compare_at_price },
        { ref: getStoredRefCode() || undefined }
      )
    : null;

  if (isLoading) {
    return <ProductDetailSkeleton />;
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-16 px-4 text-center">
          <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The product you're looking for doesn't exist or has been removed.
          </p>
          <Button asChild>
            <Link to="/shop">Back to Shop</Link>
          </Button>
        </div>
      </div>
    );
  }

  const sortedImages = [...(product.product_images || [])].sort(
    (a, b) => a.sort_order - b.sort_order
  );
  const currentImage = sortedImages[selectedImageIndex] || sortedImages[0];
  const discount = product.compare_at_price
    ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
    : 0;

  const handleAddToCart = async () => {
    if (!product) return;
    haptic('success');
    setIsAddingToCart(true);
    await addItem(product.id, quantity, Object.keys(variantOptions).length > 0 ? variantOptions : undefined);
    setIsAddingToCart(false);
    toast.success(`Added ${quantity} item(s) to cart`);
  };

  const handleBuyNow = async () => {
    if (!product) return;
    haptic('success');
    setIsBuyingNow(true);
    await addItem(product.id, quantity, Object.keys(variantOptions).length > 0 ? variantOptions : undefined);
    setIsBuyingNow(false);
    navigate('/checkout');
  };

  // Touch swipe handlers for mobile image gallery
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      haptic('light');
      if (diff > 0) goToNextImage();
      else goToPreviousImage();
    }
    setTouchStart(null);
  };

  const goToPreviousImage = () => {
    setSelectedImageIndex((prev) => (prev === 0 ? sortedImages.length - 1 : prev - 1));
  };

  const goToNextImage = () => {
    setSelectedImageIndex((prev) => (prev === sortedImages.length - 1 ? 0 : prev + 1));
  };

  const productLd = productJsonLd(product);
  const breadcrumbLd = breadcrumbJsonLd([
    { name: 'Home', url: toAbsoluteUrl('/', { preferPublishedInPreview: true }) },
    { name: 'Shop', url: toAbsoluteUrl('/shop', { preferPublishedInPreview: true }) },
    ...(product.categories ? [{ name: product.categories.name, url: toAbsoluteUrl(`/shop?category=${product.categories.slug}`, { preferPublishedInPreview: true }) }] : []),
    { name: product.title, url: toAbsoluteUrl(`/product/${product.slug}`, { preferPublishedInPreview: true }) },
  ]);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={(product as any).seo_title || product.title}
        description={(product as any).seo_description || product.description || `Buy ${product.title} at the best price on Odhra.`}
        ogType="product"
        ogImage={sortedImages[0]?.url}
        keywords={product.tags?.join(', ')}
        jsonLd={{ '@context': 'https://schema.org', '@graph': [productLd, breadcrumbLd] }}
      />
      <Navbar />

      <div className="pt-4 sm:pt-6 pb-20 lg:pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-sm text-muted-foreground mb-6"
          >
            <Link to="/shop" className="hover:text-foreground transition-colors flex items-center gap-1">
              <ChevronLeft className="w-4 h-4" />
              Shop
            </Link>
            {product.categories && (
              <>
                <span>/</span>
                <Link
                  to={`/shop?category=${product.categories.slug}`}
                  className="hover:text-foreground transition-colors"
                >
                  {product.categories.name}
                </Link>
              </>
            )}
            <span>/</span>
            <span className="text-foreground truncate max-w-[200px]">{product.title}</span>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Images */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              {/* Main Image */}
              <div 
                className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-muted group"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                <AnimatePresence mode="wait">
                  <motion.img
                    key={selectedImageIndex}
                    src={currentImage?.url || '/placeholder.svg'}
                    alt={currentImage?.alt_text || product.title}
                    className="w-full h-full object-contain cursor-zoom-in"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => setLightboxOpen(true)}
                    draggable={false}
                  />
                </AnimatePresence>

                {/* Zoom hint */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="p-3 rounded-full bg-background/80 backdrop-blur-sm">
                    <ZoomIn className="w-6 h-6" />
                  </div>
                </div>

                {/* Navigation Arrows */}
                {sortedImages.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={goToPreviousImage}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={goToNextImage}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  </>
                )}

                {/* Badges */}
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  {product.is_featured && (
                    <Badge className="bg-accent text-accent-foreground">Featured</Badge>
                  )}
                  {discount > 0 && (
                    <Badge variant="destructive">{discount}% OFF</Badge>
                  )}
                </div>

                {/* Share & Wishlist */}
                <div className="absolute top-4 right-4 flex gap-2">
                  <WishlistButton productId={product.id} />
                  {productShareable && (
                    <ShareSheet
                      shareable={productShareable}
                      trigger={
                        <Button 
                          size="icon" 
                          variant="secondary" 
                          className="rounded-full bg-background/80 backdrop-blur-sm"
                        >
                          <Share2 className="w-4 h-4" />
                        </Button>
                      }
                    />
                  )}
                </div>

                {/* Image counter */}
                {sortedImages.length > 1 && (
                  <div className="absolute bottom-4 right-4 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-sm text-sm font-medium">
                    {selectedImageIndex + 1} / {sortedImages.length}
                  </div>
                )}
              </div>

              {/* Thumbnail Gallery */}
              {sortedImages.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  {sortedImages.map((image, index) => (
                    <motion.button
                      key={image.id}
                      onClick={() => setSelectedImageIndex(index)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={cn(
                        'shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-colors',
                        selectedImageIndex === index
                          ? 'border-accent ring-2 ring-accent/20'
                          : 'border-transparent hover:border-muted-foreground/30'
                      )}
                    >
                      <img
                        src={image.url}
                        alt={image.alt_text || `${product.title} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Product Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              {/* Vendor */}
              {product.vendors_public && (
                <Link
                  to={`/store/${product.vendors_public.slug}`}
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                >
                  {product.vendors_public.logo_url ? (
                    <img 
                      src={product.vendors_public.logo_url} 
                      alt={product.vendors_public.brand_name}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : (
                    <Store className="w-4 h-4" />
                  )}
                  <span className="group-hover:underline">{product.vendors_public.brand_name}</span>
                </Link>
              )}

              {/* Title */}
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold leading-tight tracking-tight">{product.title}</h1>

              {/* Rating */}
              {(product.review_count || 0) > 0 && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          'w-5 h-5',
                          i < Math.round(product.avg_rating || 0)
                            ? 'fill-warning text-warning'
                            : 'text-muted'
                        )}
                      />
                    ))}
                  </div>
                  <span className="font-semibold">{product.avg_rating?.toFixed(1)}</span>
                  <span className="text-muted-foreground">
                    ({product.review_count} reviews)
                  </span>
                </div>
              )}

              {/* Price */}
              <div className="flex items-baseline gap-4 flex-wrap">
                <span className="text-4xl font-bold text-accent">
                  {formatPrice(effectivePrice)}
                </span>
                {product.compare_at_price && (
                  <span className="text-xl text-muted-foreground line-through">
                    {formatPrice(product.compare_at_price)}
                  </span>
                )}
                {discount > 0 && (
                  <Badge variant="destructive" className="text-sm">
                    Save {formatPrice(product.compare_at_price! - effectivePrice)}
                  </Badge>
                )}
              </div>

              {/* Variant Selector */}
              <VariantSelector
                productId={product.id}
                basePrice={product.price}
                onVariantChange={(variant, options) => {
                  setSelectedVariant(variant);
                  setVariantOptions(options);
                }}
                onImageChange={(imageUrl) => {
                  const idx = sortedImages.findIndex(img => img.url === imageUrl);
                  if (idx >= 0) setSelectedImageIndex(idx);
                }}
              />

              {/* Size Guide */}
              <SizeGuideDialog category={product.categories?.name} />

              {/* Price drop badge */}
              <PriceDropBadge productId={product.id} currentPrice={effectivePrice} />

              {/* Social proof badges */}
              <ProductSocialProof 
                productId={product.id} 
                reviewCount={product.review_count || 0} 
                avgRating={product.avg_rating || 0} 
              />

              {/* Description */}
              {product.description && (
                <div className="prose prose-sm max-w-none text-muted-foreground">
                  <p className="leading-relaxed">{product.description}</p>
                </div>
              )}

              {/* Stock Status & Urgency Signals */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-3 h-3 rounded-full',
                      effectiveStock > 10
                        ? 'bg-success'
                        : effectiveStock > 0
                        ? 'bg-warning'
                        : 'bg-destructive'
                    )}
                  />
                  <span className="font-medium">
                    {effectiveStock > 10
                      ? 'In Stock'
                      : effectiveStock > 0
                      ? `Only ${effectiveStock} left in stock`
                      : 'Out of Stock'}
                  </span>
                </div>

                {/* Psychology: Delivery deadline countdown */}
                {effectiveStock > 0 && (
                  <DeliveryDeadline />
                )}

                {/* Psychology: People with this in cart */}
                {effectiveStock > 0 && effectiveStock <= 20 && (
                  <CartActivityIndicator productId={product.id} />
                )}
              </div>

              {/* Quantity & Add to Cart */}
              {effectiveStock > 0 ? (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    {/* Quantity Selector */}
                    <div className="flex items-center border border-border rounded-xl h-14">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-full rounded-l-xl"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="w-14 text-center font-semibold text-lg">{quantity}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-full rounded-r-xl"
                        onClick={() => setQuantity(Math.min(effectiveStock, quantity + 1))}
                        disabled={quantity >= effectiveStock}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Add to Cart */}
                    <Button
                      size="lg"
                      variant="outline"
                      className="flex-1 h-14 text-lg gap-2 btn-press"
                      disabled={isAddingToCart}
                      onClick={handleAddToCart}
                    >
                      {isAddingToCart ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <ShoppingBag className="w-5 h-5" />
                      )}
                      {isAddingToCart ? 'Adding...' : 'Add to Cart'}
                    </Button>
                  </div>

                  {/* Buy Now Button */}
                  <Button
                    size="lg"
                    className="w-full h-14 text-lg gap-2 btn-press"
                    disabled={isBuyingNow}
                    onClick={handleBuyNow}
                  >
                    {isBuyingNow ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <CreditCard className="w-5 h-5" />
                    )}
                    {isBuyingNow ? 'Processing...' : 'Buy Now'}
                  </Button>

                  {/* Subscribe & Save */}
                  {product.vendors_public && (
                    <SubscribeButton
                      productId={product.id}
                      productTitle={product.title}
                      vendorId={product.vendor_id}
                      basePrice={product.price}
                      className="w-full h-12"
                    />
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <WaitlistButton
                    productId={product.id}
                    productTitle={product.title}
                  />
                </div>
              )}

              <Separator />

              {/* Features — Trust signals */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-center gap-3 p-4 rounded-xl border border-border/40 bg-card hover:border-accent/30 transition-colors duration-200">
                  <div className="p-2.5 rounded-xl bg-accent/10">
                    <Truck className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Free Shipping</p>
                    <p className="text-[11px] text-muted-foreground">On orders ₹999+</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-xl border border-border/40 bg-card hover:border-accent/30 transition-colors duration-200">
                  <div className="p-2.5 rounded-xl bg-accent/10">
                    <Shield className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Secure Payment</p>
                    <p className="text-[11px] text-muted-foreground">100% protected</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-xl border border-border/40 bg-card hover:border-accent/30 transition-colors duration-200">
                  <div className="p-2.5 rounded-xl bg-accent/10">
                    <RotateCcw className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Easy Returns</p>
                    <p className="text-[11px] text-muted-foreground">7-day policy</p>
                  </div>
                </div>
              </div>

              {/* Ask on WhatsApp */}
              <button
                onClick={() => {
                  const msg = `Hi! I have a question about "${product.title}" (₹${effectivePrice}). Can you help?`;
                  window.open(`https://wa.me/919876543210?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
                }}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] font-medium transition-colors text-sm border border-[#25D366]/20"
              >
                <MessageCircle className="w-4 h-4" />
                Ask about this product on WhatsApp
              </button>

              {/* Pincode Delivery Checker */}
              <PincodeChecker subtotal={effectivePrice * quantity} />

              {/* Share & Earn */}
              <ShareEarnSection 
                productId={product.id} 
                productTitle={product.title} 
                productSlug={product.slug}
                productPrice={product.price}
                productCompareAtPrice={product.compare_at_price}
              />

              {/* Tags */}
              {product.tags && product.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {product.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="cursor-pointer hover:bg-secondary/80">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* Complete Your Look */}
          <CompleteYourLook 
            productId={product.id} 
            categoryId={product.category_id} 
            currentPrice={product.price} 
          />

          {/* Tabs Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-16"
          >
            <Tabs defaultValue="reviews" className="w-full">
              <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
                <TabsTrigger 
                  value="reviews" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent px-6 py-4"
                >
                  Reviews ({product.review_count || 0})
                </TabsTrigger>
                <TabsTrigger 
                  value="description" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent px-6 py-4"
                >
                  Details
                </TabsTrigger>
                <TabsTrigger 
                  value="shipping" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent px-6 py-4"
                >
                  Shipping & Returns
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="reviews" className="mt-8">
                <ProductReviews productId={product.id} />
              </TabsContent>
              
              <TabsContent value="description" className="mt-8">
                <div className="prose prose-sm max-w-none">
                  {product.description ? (
                    <p>{product.description}</p>
                  ) : (
                    <p className="text-muted-foreground">No additional details available.</p>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="shipping" className="mt-8">
                <div className="space-y-6 max-w-2xl">
                  <div>
                    <h3 className="font-semibold mb-2">Shipping</h3>
                    <ul className="text-muted-foreground space-y-2 text-sm">
                      <li>• Free shipping on orders above ₹999</li>
                      <li>• Standard delivery: 5-7 business days</li>
                      <li>• Express delivery: 2-3 business days (additional charges apply)</li>
                      <li>• Cash on Delivery available</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Returns & Exchanges</h3>
                    <ul className="text-muted-foreground space-y-2 text-sm">
                      <li>• 7-day easy return policy</li>
                      <li>• Items must be unused and in original packaging</li>
                      <li>• Free returns for defective items</li>
                      <li>• Refund processed within 5-7 business days</li>
                    </ul>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </div>

      {/* Lightbox */}
      <ImageLightbox
        images={sortedImages.map(img => ({ url: img.url, alt: img.alt_text || product.title }))}
        initialIndex={selectedImageIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />

      {/* Sticky Add to Cart Bar for Mobile */}
      <StickyAddToCart
        isVisible={showStickyBar}
        productTitle={product.title}
        price={effectivePrice}
        imageUrl={currentImage?.url}
        stock={effectiveStock}
        isAdding={isAddingToCart}
        onAddToCart={handleAddToCart}
      />

      {/* Bottom Navigation for Mobile */}
      <BottomNavigation />
    </div>
  );
}
