import React, { useState, useEffect, useCallback } from 'react';
import { motion, Reorder } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { ImageUploader } from '@/components/vendor/ImageUploader';
import { useImageUpload } from '@/hooks/useImageUpload';
import { ProductPickerDialog } from './ProductPickerDialog';
import { HomepagePreview } from './HomepagePreview';
import { ABTestingDashboard } from './ABTestingDashboard';
import { PromoStripManager } from './PromoStripManager';
import {
  useCMSContent,
  useCreateCMSContent,
  useUpdateCMSContent,
  useDeleteCMSContent,
  useBulkUpdateCMSOrder,
  CMSContent,
} from '@/hooks/useCMSContent';
import { useBannerABAnalytics } from '@/hooks/useBannerABTesting';
import { useAutoWinnerSelection } from '@/hooks/useAutoWinnerSelection';
import {
  GripVertical,
  Plus,
  Image,
  Layers,
  Eye,
  EyeOff,
  Trash2,
  Edit,
  Save,
  LayoutGrid,
  Settings2,
  ShoppingBag,
  Star,
  Sparkles,
  Gift,
  TrendingUp,
  Users,
  Package,
  Monitor,
  Smartphone,
  Tablet,
  RefreshCw,
  AlertCircle,
  Megaphone,
  Timer,
  FlaskConical,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  Beaker,
  Zap,
  Grid3X3,
  MessageSquare,
  Award,
  Store,
  CheckCircle,
  Clock,
  Search,
} from 'lucide-react';

// Types
interface HeroBanner {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  ctaText: string;
  ctaLink: string;
  isActive: boolean;
  order: number;
  startsAt: string | null;
  endsAt: string | null;
  abEnabled: boolean;
  abTrafficSplit: number;
  abVariantBContent: {
    title?: string;
    subtitle?: string;
    imageUrl?: string;
    ctaText?: string;
    ctaLink?: string;
  } | null;
  bgColor: string;
  badge: string;
  badgeColor: string;
  offerText: string;
  price: string;
  imageOnly: boolean;
  customBgColor: string;
}

// ALL homepage sections that can be controlled via CMS
type SectionType = 
  | 'hero'
  | 'promo-strip'
  | 'quick-services'
  | 'category-tabs'
  | 'deals'
  | 'trending'
  | 'bestsellers'
  | 'new-arrivals'
  | 'featured'
  | 'recommended'
  | 'previously-purchased'
  | 'categories'
  | 'spinwheel'
  | 'stories'
  | 'reviews'
  | 'vendor-cta'
  | 'trust-badges'
  | 'recently-viewed';

interface HomepageSection {
  id: string;
  type: SectionType;
  title: string;
  isActive: boolean;
  order: number;
  settings: Record<string, any>;
}

interface FeaturedCollection {
  id: string;
  name: string;
  description: string;
  productIds: string[];
  imageUrl: string;
  isActive: boolean;
  displayType: 'grid' | 'carousel' | 'list';
}

// Complete list of all homepage sections with default settings
const ALL_SECTION_TYPES: { type: SectionType; title: string; description: string; settings: Record<string, any> }[] = [
  { type: 'hero', title: 'Hero Slider', description: 'Main banner slider at top of page', settings: { autoPlay: true, interval: 5000, showDots: true } },
  { type: 'promo-strip', title: 'Promo Strip', description: 'Announcement bar with countdown', settings: {} },
  { type: 'quick-services', title: 'Quick Services', description: 'Icon grid for quick navigation', settings: { showSpinWheel: true, showDeals: true } },
  { type: 'category-tabs', title: 'Category Tabs', description: 'Horizontal scrollable category pills', settings: { limit: 8 } },
  { type: 'deals', title: 'Deals & Discounts', description: 'Products with active discounts', settings: { limit: 10, minDiscount: 10 } },
  { type: 'trending', title: 'Trending Products', description: 'Most viewed products carousel', settings: { limit: 10, sortBy: 'trending', pinnedProductIds: [], bgColor: '', badge: '🔥 Hot' } },
  { type: 'bestsellers', title: 'Best Sellers', description: 'Top selling products carousel', settings: { limit: 10, sortBy: 'popular', pinnedProductIds: [], bgColor: '', badge: '🏆 Top' } },
  { type: 'new-arrivals', title: 'New Arrivals', description: 'Recently added products', settings: { limit: 10, sortBy: 'newest', pinnedProductIds: [], bgColor: '', badge: '✨ New' } },
  { type: 'featured', title: 'Featured Products', description: 'Hand-picked featured products', settings: { limit: 10, featured: true, pinnedProductIds: [], bgColor: '' } },
  { type: 'recommended', title: 'Recommended For You', description: 'Personalized recommendations', settings: { limit: 8, personalized: true } },
  { type: 'previously-purchased', title: 'Buy Again', description: 'Products user bought before', settings: { limit: 8 } },
  { type: 'categories', title: 'Shop by Category', description: 'Category grid showcase', settings: { limit: 6, showDescription: true } },
  { type: 'spinwheel', title: 'Spin & Win', description: 'Gamification spin wheel section', settings: { showForNewUsers: true, minOrderAmount: 1499 } },
  { type: 'stories', title: 'Customer Stories', description: 'User-generated content & stories', settings: { limit: 6 } },
  { type: 'reviews', title: 'Delivery Reviews', description: 'Customer delivery feedback', settings: { limit: 4, showRating: true } },
  { type: 'vendor-cta', title: 'Become a Seller', description: 'Vendor signup call-to-action', settings: {} },
  { type: 'trust-badges', title: 'Trust Badges', description: 'Trust signals and guarantees', settings: {} },
  { type: 'recently-viewed', title: 'Recently Viewed', description: 'Products user recently viewed', settings: { limit: 10 } },
];

// Mapping from legacy DB slugs to canonical section types
const SLUG_TO_TYPE: Record<string, SectionType> = {
  'hero-slider': 'hero',
  'trending-products': 'trending',
  'featured-products': 'featured',
  'recommended-products': 'recommended',
  'customer-stories': 'stories',
  'delivery-reviews': 'reviews',
  'spin-wheel': 'spinwheel',
  'trust-badges': 'trust-badges',
  'vendor-cta': 'vendor-cta',
  'categories': 'categories',
  'quick-services': 'quick-services',
  'category-tabs': 'category-tabs',
  'deals': 'deals',
  'bestsellers': 'bestsellers',
  'new-arrivals': 'new-arrivals',
  'promo-strip': 'promo-strip',
  'previously-purchased': 'previously-purchased',
  'recently-viewed': 'recently-viewed',
};

function normalizeSlugToType(slug: string): SectionType {
  return (SLUG_TO_TYPE[slug] ?? slug) as SectionType;
}

const sectionIcons: Record<SectionType, React.ReactNode> = {
  'hero': <Image className="w-4 h-4" />,
  'promo-strip': <Megaphone className="w-4 h-4" />,
  'quick-services': <Zap className="w-4 h-4" />,
  'category-tabs': <Grid3X3 className="w-4 h-4" />,
  'deals': <Percent className="w-4 h-4" />,
  'trending': <TrendingUp className="w-4 h-4" />,
  'bestsellers': <Award className="w-4 h-4" />,
  'new-arrivals': <Sparkles className="w-4 h-4" />,
  'featured': <Star className="w-4 h-4" />,
  'recommended': <Star className="w-4 h-4" />,
  'previously-purchased': <Clock className="w-4 h-4" />,
  'categories': <LayoutGrid className="w-4 h-4" />,
  'spinwheel': <Gift className="w-4 h-4" />,
  'stories': <MessageSquare className="w-4 h-4" />,
  'reviews': <Star className="w-4 h-4" />,
  'vendor-cta': <Store className="w-4 h-4" />,
  'trust-badges': <CheckCircle className="w-4 h-4" />,
  'recently-viewed': <Clock className="w-4 h-4" />,
};

// Helper to convert CMS content to local types
function cmsToHeroBanner(cms: CMSContent): HeroBanner {
  const content = cms.content as Record<string, any>;
  return {
    id: cms.id,
    title: content.title || cms.title,
    subtitle: content.subtitle || '',
    imageUrl: content.imageUrl || '',
    ctaText: content.ctaText || 'Shop Now',
    ctaLink: content.ctaLink || '/shop',
    isActive: cms.is_active,
    order: cms.sort_order,
    startsAt: cms.starts_at,
    endsAt: cms.ends_at,
    abEnabled: (cms as any).ab_enabled || false,
    abTrafficSplit: (cms as any).ab_traffic_split || 50,
    abVariantBContent: (cms as any).ab_variant_b_content || null,
    bgColor: content.bgColor || '',
    badge: content.badge || '',
    badgeColor: content.badgeColor || '',
    offerText: content.offerText || '',
    price: content.price || '',
    imageOnly: content.imageOnly || false,
    customBgColor: content.customBgColor || '',
  };
}

function cmsToSection(cms: CMSContent): HomepageSection {
  const content = cms.content as Record<string, any>;
  return {
    id: cms.id,
    type: normalizeSlugToType(cms.slug),
    title: cms.title,
    isActive: cms.is_active,
    order: cms.sort_order,
    settings: content.settings || content || {},
  };
}

function cmsToCollection(cms: CMSContent): FeaturedCollection {
  const content = cms.content as Record<string, any>;
  return {
    id: cms.id,
    name: cms.title,
    description: content.description || '',
    productIds: content.productIds || [],
    imageUrl: content.imageUrl || '',
    isActive: cms.is_active,
    displayType: content.displayType || 'carousel',
  };
}

// Section Settings Form Component
function SectionSettingsForm({ 
  section, 
  onSave, 
  onUpdateTitle 
}: { 
  section: HomepageSection; 
  onSave: (settings: Record<string, any>) => void;
  onUpdateTitle: (title: string) => void;
}) {
  const [settings, setSettings] = useState(section.settings);
  const [title, setTitle] = useState(section.title);

  const sectionInfo = ALL_SECTION_TYPES.find(s => s.type === section.type);

  const handleSave = () => {
    if (title !== section.title) {
      onUpdateTitle(title);
    }
    onSave(settings);
  };

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Section Title</Label>
        <Input 
          value={title} 
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Section title"
        />
      </div>

      {sectionInfo && (
        <p className="text-sm text-muted-foreground">{sectionInfo.description}</p>
      )}

      <Separator />

      {/* Common settings */}
      {['trending', 'bestsellers', 'new-arrivals', 'featured', 'deals', 'recommended'].includes(section.type) && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Products Limit</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[settings.limit || 10]}
                onValueChange={([v]) => updateSetting('limit', v)}
                min={4}
                max={20}
                step={2}
                className="flex-1"
              />
              <span className="w-8 text-sm font-medium">{settings.limit || 10}</span>
            </div>
          </div>

          {['trending', 'bestsellers', 'new-arrivals'].includes(section.type) && (
            <>
              <div className="space-y-2">
                <Label>Badge Text</Label>
                <Input 
                  value={settings.badge || ''} 
                  onChange={(e) => updateSetting('badge', e.target.value)}
                  placeholder="e.g., 🔥 Hot"
                />
              </div>
              <div className="space-y-2">
                <Label>Background Color (Tailwind class)</Label>
                <Input 
                  value={settings.bgColor || ''} 
                  onChange={(e) => updateSetting('bgColor', e.target.value)}
                  placeholder="e.g., bg-gradient-to-r from-orange-50 to-red-50"
                />
              </div>
            </>
          )}
        </div>
      )}

      {section.type === 'spinwheel' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Minimum Order Amount (₹)</Label>
            <Input 
              type="number"
              value={settings.minOrderAmount || 1499} 
              onChange={(e) => updateSetting('minOrderAmount', parseInt(e.target.value))}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Show for New Users</Label>
            <Switch 
              checked={settings.showForNewUsers !== false}
              onCheckedChange={(v) => updateSetting('showForNewUsers', v)}
            />
          </div>
        </div>
      )}

      {section.type === 'categories' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Categories to Show</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[settings.limit || 6]}
                onValueChange={([v]) => updateSetting('limit', v)}
                min={4}
                max={12}
                step={1}
                className="flex-1"
              />
              <span className="w-8 text-sm font-medium">{settings.limit || 6}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label>Show Descriptions</Label>
            <Switch 
              checked={settings.showDescription !== false}
              onCheckedChange={(v) => updateSetting('showDescription', v)}
            />
          </div>
        </div>
      )}

      {section.type === 'category-tabs' && (
        <div className="space-y-2">
          <Label>Max Tabs to Show</Label>
          <div className="flex items-center gap-4">
            <Slider
              value={[settings.limit || 8]}
              onValueChange={([v]) => updateSetting('limit', v)}
              min={4}
              max={12}
              step={1}
              className="flex-1"
            />
            <span className="w-8 text-sm font-medium">{settings.limit || 8}</span>
          </div>
        </div>
      )}

      {section.type === 'stories' && (
        <div className="space-y-2">
          <Label>Stories to Show</Label>
          <div className="flex items-center gap-4">
            <Slider
              value={[settings.limit || 6]}
              onValueChange={([v]) => updateSetting('limit', v)}
              min={3}
              max={12}
              step={1}
              className="flex-1"
            />
            <span className="w-8 text-sm font-medium">{settings.limit || 6}</span>
          </div>
        </div>
      )}

      {section.type === 'reviews' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Reviews to Show</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[settings.limit || 4]}
                onValueChange={([v]) => updateSetting('limit', v)}
                min={2}
                max={8}
                step={1}
                className="flex-1"
              />
              <span className="w-8 text-sm font-medium">{settings.limit || 4}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label>Show Rating Stars</Label>
            <Switch 
              checked={settings.showRating !== false}
              onCheckedChange={(v) => updateSetting('showRating', v)}
            />
          </div>
        </div>
      )}

      {section.type === 'hero' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Auto Play</Label>
            <Switch 
              checked={settings.autoPlay !== false}
              onCheckedChange={(v) => updateSetting('autoPlay', v)}
            />
          </div>
          <div className="space-y-2">
            <Label>Slide Interval (ms)</Label>
            <Input 
              type="number"
              value={settings.interval || 5000} 
              onChange={(e) => updateSetting('interval', parseInt(e.target.value))}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Show Navigation Dots</Label>
            <Switch 
              checked={settings.showDots !== false}
              onCheckedChange={(v) => updateSetting('showDots', v)}
            />
          </div>
        </div>
      )}

      <DialogFooter>
        <Button onClick={handleSave} className="gap-2">
          <Save className="w-4 h-4" />
          Save Settings
        </Button>
      </DialogFooter>
    </div>
  );
}

// Banner Edit Form Component
function BannerEditForm({
  banner,
  onSave,
  onCancel,
  isSaving,
}: {
  banner: HeroBanner;
  onSave: (banner: HeroBanner) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [formData, setFormData] = useState(banner);
  const { uploadImage, isUploading } = useImageUpload({ bucket: 'vendor-assets' });

  const handleImageUpload = async (file: File): Promise<string> => {
    const result = await uploadImage(file, 'banners');
    if (result) {
      setFormData(prev => ({ ...prev, imageUrl: result.url }));
      return result.url;
    }
    return '';
  };

  return (
    <ScrollArea className="max-h-[70vh]">
      <div className="space-y-4 p-1">
        {/* Display Mode Toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
          <div>
            <Label className="font-medium">Image Only Mode</Label>
            <p className="text-xs text-muted-foreground">Display full image without text overlay</p>
          </div>
          <Switch
            checked={formData.imageOnly}
            onCheckedChange={(v) => setFormData(prev => ({ ...prev, imageOnly: v }))}
          />
        </div>

        {/* Image Upload */}
        <div className="space-y-2">
          <Label>Banner Image</Label>
          <ImageUploader
            value={formData.imageUrl}
            onChange={(url) => setFormData(prev => ({ ...prev, imageUrl: url }))}
            onUpload={handleImageUpload}
            isUploading={isUploading}
          />
        </div>

        {!formData.imageOnly && (
          <>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Subtitle</Label>
              <Textarea
                value={formData.subtitle}
                onChange={(e) => setFormData(prev => ({ ...prev, subtitle: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Badge Text (optional)</Label>
              <Input
                value={formData.badge}
                onChange={(e) => setFormData(prev => ({ ...prev, badge: e.target.value }))}
                placeholder="e.g., LIMITED OFFER"
              />
            </div>

            <div className="space-y-2">
              <Label>Offer Text (optional)</Label>
              <Input
                value={formData.offerText}
                onChange={(e) => setFormData(prev => ({ ...prev, offerText: e.target.value }))}
                placeholder="e.g., Up to 50% OFF"
              />
            </div>

            <div className="space-y-2">
              <Label>Price Text (optional)</Label>
              <Input
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                placeholder="e.g., Starting ₹999"
              />
            </div>
          </>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>CTA Text</Label>
            <Input
              value={formData.ctaText}
              onChange={(e) => setFormData(prev => ({ ...prev, ctaText: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>CTA Link</Label>
            <Input
              value={formData.ctaLink}
              onChange={(e) => setFormData(prev => ({ ...prev, ctaLink: e.target.value }))}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Background Gradient</Label>
          <Select
            value={formData.bgColor}
            onValueChange={(v) => setFormData(prev => ({ ...prev, bgColor: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select gradient" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="from-primary to-primary/80">Primary</SelectItem>
              <SelectItem value="from-accent to-accent/80">Accent</SelectItem>
              <SelectItem value="from-primary/90 to-accent/90">Primary-Accent</SelectItem>
              <SelectItem value="from-success to-success/80">Success</SelectItem>
              <SelectItem value="from-destructive to-destructive/80">Urgent</SelectItem>
              <SelectItem value="from-warning to-warning/80">Warning</SelectItem>
              <SelectItem value="from-info to-info/80">Info</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label>Scheduling (Optional)</Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Start Date</Label>
              <Input
                type="datetime-local"
                value={formData.startsAt || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, startsAt: e.target.value || null }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">End Date</Label>
              <Input
                type="datetime-local"
                value={formData.endsAt || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, endsAt: e.target.value || null }))}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={formData.isActive}
              onCheckedChange={(v) => setFormData(prev => ({ ...prev, isActive: v }))}
            />
            <Label>Active</Label>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
            <Button onClick={() => onSave(formData)} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Banner'}
            </Button>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

export function CMSManager() {
  const { data: allContent, isLoading, error, refetch } = useCMSContent();
  const createContent = useCreateCMSContent();
  const updateContent = useUpdateCMSContent();
  const deleteContent = useDeleteCMSContent();
  const bulkUpdateOrder = useBulkUpdateCMSOrder();

  useAutoWinnerSelection({ 
    enabled: true, 
    checkInterval: 300000,
    autoPromote: false,
    minSampleSize: 100,
    confidenceThreshold: 95,
  });

  const [banners, setBanners] = useState<HeroBanner[]>([]);
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [collections, setCollections] = useState<FeaturedCollection[]>([]);
  const [editingBanner, setEditingBanner] = useState<HeroBanner | null>(null);
  const [editingSection, setEditingSection] = useState<HomepageSection | null>(null);
  const [editingCollection, setEditingCollection] = useState<FeaturedCollection | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isSaving, setIsSaving] = useState(false);
  const [bannerDialogOpen, setBannerDialogOpen] = useState(false);
  const [collectionDialogOpen, setCollectionDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Parse CMS content and merge with default sections
  useEffect(() => {
    if (allContent) {
      const bannerContent = allContent.filter(c => c.type === 'hero_banner');
      const sectionContent = allContent.filter(c => c.type === 'homepage_section' || c.type === 'section');
      const collectionContent = allContent.filter(c => c.type === 'featured_collection');

      setBanners(bannerContent.map(cmsToHeroBanner).sort((a, b) => a.order - b.order));
      
      // Merge existing sections with all possible sections
      const existingSections = sectionContent.map(cmsToSection);
      const existingTypes = new Set(existingSections.map(s => s.type));
      
      // Add missing sections as inactive
      const allSections: HomepageSection[] = [...existingSections];
      ALL_SECTION_TYPES.forEach((sectionDef, index) => {
        if (!existingTypes.has(sectionDef.type)) {
          allSections.push({
            id: `virtual-${sectionDef.type}`,
            type: sectionDef.type,
            title: sectionDef.title,
            isActive: false, // New sections start as inactive
            order: existingSections.length + index,
            settings: sectionDef.settings,
          });
        }
      });
      
      setSections(allSections.sort((a, b) => a.order - b.order));
      setCollections(collectionContent.map(cmsToCollection));
    }
  }, [allContent]);

  // Initialize a section in the database (for virtual sections)
  const initializeSection = async (section: HomepageSection) => {
    const sectionDef = ALL_SECTION_TYPES.find(s => s.type === section.type);
    if (!sectionDef) return null;

    try {
      const result = await createContent.mutateAsync({
        slug: section.type,
        type: 'homepage_section',
        title: sectionDef.title,
        content: sectionDef.settings,
        is_active: true,
        sort_order: section.order,
        starts_at: null,
        ends_at: null,
      });
      return result;
    } catch (err) {
      console.error('Failed to initialize section:', err);
      return null;
    }
  };

  // Initialize all default sections at once
  const initializeAllDefaultSections = async () => {
    setIsSaving(true);
    try {
      const existingTypes = new Set(
        sections.filter(s => !s.id.startsWith('virtual-')).map(s => s.type)
      );

      let order = sections.filter(s => !s.id.startsWith('virtual-')).length;

      for (const sectionDef of ALL_SECTION_TYPES) {
        if (!existingTypes.has(sectionDef.type)) {
          await createContent.mutateAsync({
            slug: sectionDef.type,
            type: 'homepage_section',
            title: sectionDef.title,
            content: sectionDef.settings,
            is_active: true,
            sort_order: order++,
            starts_at: null,
            ends_at: null,
          });
        }
      }
      toast.success('All sections initialized successfully');
    } catch (err) {
      toast.error('Failed to initialize some sections');
    } finally {
      setIsSaving(false);
    }
  };

  // Banner operations
  const handleAddBanner = () => {
    setEditingBanner({
      id: '',
      title: 'New Banner',
      subtitle: 'Add your subtitle here',
      imageUrl: '',
      ctaText: 'Shop Now',
      ctaLink: '/shop',
      isActive: true,
      order: banners.length,
      startsAt: null,
      endsAt: null,
      abEnabled: false,
      abTrafficSplit: 50,
      abVariantBContent: null,
      bgColor: 'from-primary to-primary/80',
      badge: '',
      badgeColor: 'bg-accent text-accent-foreground',
      offerText: '',
      price: '',
      imageOnly: false,
      customBgColor: '',
    });
    setBannerDialogOpen(true);
  };

  const handleSaveBanner = async (banner: HeroBanner) => {
    setIsSaving(true);
    try {
      const contentData = {
        title: banner.title,
        subtitle: banner.subtitle,
        imageUrl: banner.imageUrl,
        ctaText: banner.ctaText,
        ctaLink: banner.ctaLink,
        bgColor: banner.bgColor,
        badge: banner.badge,
        badgeColor: banner.badgeColor,
        offerText: banner.offerText,
        price: banner.price,
        imageOnly: banner.imageOnly,
        customBgColor: banner.customBgColor,
      };

      if (banner.id) {
        await updateContent.mutateAsync({
          id: banner.id,
          title: banner.title,
          content: contentData,
          is_active: banner.isActive,
          sort_order: banner.order,
          starts_at: banner.startsAt,
          ends_at: banner.endsAt,
        });
      } else {
        await createContent.mutateAsync({
          slug: `banner-${Date.now()}`,
          type: 'hero_banner',
          title: banner.title,
          content: contentData,
          is_active: banner.isActive,
          sort_order: banners.length,
          starts_at: banner.startsAt,
          ends_at: banner.endsAt,
        });
      }
      setBannerDialogOpen(false);
      setEditingBanner(null);
    } catch (err) {
      toast.error('Failed to save banner');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!confirm('Are you sure you want to delete this banner?')) return;
    try {
      await deleteContent.mutateAsync(id);
    } catch (err) {
      toast.error('Failed to delete banner');
    }
  };

  const handleToggleBanner = async (id: string, isActive: boolean) => {
    try {
      await updateContent.mutateAsync({ id, is_active: isActive });
    } catch (err) {
      toast.error('Failed to update banner');
    }
  };

  const handleReorderBanners = async (newOrder: HeroBanner[]) => {
    setBanners(newOrder);
    const updates = newOrder.map((b, i) => ({ id: b.id, sort_order: i }));
    try {
      await bulkUpdateOrder.mutateAsync(updates);
    } catch (err) {
      console.error('Failed to save banner order');
    }
  };

  // Section operations
  const handleToggleSection = async (section: HomepageSection, isActive: boolean) => {
    try {
      // If it's a virtual section, create it first
      if (section.id.startsWith('virtual-')) {
        const sectionDef = ALL_SECTION_TYPES.find(s => s.type === section.type);
        if (!sectionDef) return;

        await createContent.mutateAsync({
          slug: section.type,
          type: 'homepage_section',
          title: sectionDef.title,
          content: sectionDef.settings,
          is_active: isActive,
          sort_order: section.order,
          starts_at: null,
          ends_at: null,
        });
        toast.success(`${section.title} section ${isActive ? 'enabled' : 'disabled'}`);
      } else {
        await updateContent.mutateAsync({ id: section.id, is_active: isActive });
      }
    } catch (err) {
      toast.error('Failed to update section');
    }
  };

  const handleReorderSections = async (newOrder: HomepageSection[]) => {
    setSections(newOrder);
    // Only update non-virtual sections
    const updates = newOrder
      .filter(s => !s.id.startsWith('virtual-'))
      .map((s, i) => ({ id: s.id, sort_order: i }));
    
    if (updates.length > 0) {
      try {
        await bulkUpdateOrder.mutateAsync(updates);
      } catch (err) {
        console.error('Failed to save section order');
      }
    }
  };

  const handleUpdateSectionSettings = async (section: HomepageSection, settings: Record<string, any>) => {
    try {
      // If it's a virtual section, create it first
      if (section.id.startsWith('virtual-')) {
        await createContent.mutateAsync({
          slug: section.type,
          type: 'homepage_section',
          title: section.title,
          content: { ...section.settings, ...settings },
          is_active: true,
          sort_order: section.order,
          starts_at: null,
          ends_at: null,
        });
      } else {
        await updateContent.mutateAsync({
          id: section.id,
          content: { ...section.settings, ...settings },
        });
      }
      setEditingSection(null);
      toast.success('Section settings saved');
    } catch (err) {
      toast.error('Failed to update section settings');
    }
  };

  const handleUpdateSectionTitle = async (section: HomepageSection, title: string) => {
    if (section.id.startsWith('virtual-')) return; // Can't update virtual sections
    try {
      await updateContent.mutateAsync({ id: section.id, title });
    } catch (err) {
      toast.error('Failed to update section title');
    }
  };

  // Collection operations
  const handleAddCollection = () => {
    setEditingCollection({
      id: '',
      name: 'New Collection',
      description: '',
      productIds: [],
      imageUrl: '',
      isActive: true,
      displayType: 'carousel',
    });
    setCollectionDialogOpen(true);
  };

  const handleSaveCollection = async (collection: FeaturedCollection) => {
    setIsSaving(true);
    try {
      const contentData = {
        description: collection.description,
        productIds: collection.productIds,
        imageUrl: collection.imageUrl,
        displayType: collection.displayType,
      };

      if (collection.id) {
        await updateContent.mutateAsync({
          id: collection.id,
          title: collection.name,
          content: contentData,
          is_active: collection.isActive,
        });
      } else {
        await createContent.mutateAsync({
          slug: `collection-${Date.now()}`,
          type: 'featured_collection',
          title: collection.name,
          content: contentData,
          is_active: collection.isActive,
          sort_order: collections.length,
          starts_at: null,
          ends_at: null,
        });
      }
      setCollectionDialogOpen(false);
      setEditingCollection(null);
    } catch (err) {
      toast.error('Failed to save collection');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCollection = async (id: string) => {
    if (!confirm('Are you sure you want to delete this collection?')) return;
    try {
      await deleteContent.mutateAsync(id);
    } catch (err) {
      toast.error('Failed to delete collection');
    }
  };

  // Filter sections by search
  const filteredSections = sections.filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Count stats
  const activeSections = sections.filter(s => s.isActive).length;
  const totalSections = sections.length;
  const activeBanners = banners.filter(b => b.isActive).length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <h3 className="font-semibold text-lg mb-2">Failed to load CMS content</h3>
        <p className="text-muted-foreground mb-4">{(error as Error).message}</p>
        <Button onClick={() => refetch()} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Layers className="w-6 h-6 text-accent" />
              Homepage CMS
            </h2>
            <p className="text-muted-foreground">Complete control over your homepage layout and content</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-1">
              <Button
                variant={previewMode === 'desktop' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setPreviewMode('desktop')}
              >
                <Monitor className="w-4 h-4" />
              </Button>
              <Button
                variant={previewMode === 'tablet' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setPreviewMode('tablet')}
              >
                <Tablet className="w-4 h-4" />
              </Button>
              <Button
                variant={previewMode === 'mobile' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setPreviewMode('mobile')}
              >
                <Smartphone className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <CheckCircle className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeSections}</p>
                <p className="text-xs text-muted-foreground">Active Sections</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Layers className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalSections}</p>
                <p className="text-xs text-muted-foreground">Total Sections</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary">
                <Image className="w-5 h-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeBanners}</p>
                <p className="text-xs text-muted-foreground">Active Banners</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Package className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{collections.length}</p>
                <p className="text-xs text-muted-foreground">Collections</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="sections" className="space-y-6">
        <TabsList className="grid w-full max-w-4xl grid-cols-5">
          <TabsTrigger value="sections" className="gap-2">
            <Layers className="w-4 h-4" />
            <span className="hidden sm:inline">Sections</span>
          </TabsTrigger>
          <TabsTrigger value="banners" className="gap-2">
            <Image className="w-4 h-4" />
            <span className="hidden sm:inline">Banners</span>
          </TabsTrigger>
          <TabsTrigger value="promo" className="gap-2">
            <Megaphone className="w-4 h-4" />
            <span className="hidden sm:inline">Promo</span>
          </TabsTrigger>
          <TabsTrigger value="ab-testing" className="gap-2">
            <FlaskConical className="w-4 h-4" />
            <span className="hidden sm:inline">A/B Test</span>
          </TabsTrigger>
          <TabsTrigger value="collections" className="gap-2">
            <LayoutGrid className="w-4 h-4" />
            <span className="hidden sm:inline">Collections</span>
          </TabsTrigger>
        </TabsList>

        {/* Sections Tab */}
        <TabsContent value="sections">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Homepage Sections</CardTitle>
                <CardDescription>
                  Toggle visibility and drag to reorder. All sections are CMS-controlled.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search sections..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-full sm:w-48"
                  />
                </div>
                <Button 
                  onClick={initializeAllDefaultSections} 
                  variant="outline" 
                  size="sm"
                  className="gap-2 whitespace-nowrap"
                  disabled={isSaving}
                >
                  <RefreshCw className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Sync All</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Reorder.Group
                axis="y"
                values={filteredSections}
                onReorder={handleReorderSections}
                className="space-y-2"
              >
                {filteredSections.map((section) => {
                  const isVirtual = section.id.startsWith('virtual-');
                  const sectionInfo = ALL_SECTION_TYPES.find(s => s.type === section.type);
                  
                  return (
                    <Reorder.Item
                      key={section.id}
                      value={section}
                      className={`flex items-center gap-3 p-4 rounded-xl border transition-all cursor-grab active:cursor-grabbing ${
                        section.isActive 
                          ? 'bg-card border-border hover:border-accent/50 shadow-sm' 
                          : 'bg-muted/30 border-muted'
                      }`}
                    >
                      <GripVertical className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      
                      <div className={`p-2.5 rounded-xl ${section.isActive ? 'bg-accent/10 text-accent' : 'bg-muted text-muted-foreground'}`}>
                        {sectionIcons[section.type] || <Layers className="w-4 h-4" />}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`font-medium ${!section.isActive && 'text-muted-foreground'}`}>
                            {section.title}
                          </p>
                          {isVirtual && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              Not synced
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {sectionInfo?.description || section.type.replace(/-/g, ' ')}
                        </p>
                      </div>

                      <Badge 
                        variant={section.isActive ? 'default' : 'secondary'} 
                        className={`text-xs ${section.isActive ? 'bg-success/10 text-success border-success/20' : ''}`}
                      >
                        {section.isActive ? 'Visible' : 'Hidden'}
                      </Badge>

                      <div className="flex items-center gap-1">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingSection(section)}
                            >
                              <Settings2 className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                {sectionIcons[section.type]}
                                Configure {section.title}
                              </DialogTitle>
                            </DialogHeader>
                            <SectionSettingsForm
                              section={section}
                              onSave={(settings) => handleUpdateSectionSettings(section, settings)}
                              onUpdateTitle={(title) => handleUpdateSectionTitle(section, title)}
                            />
                          </DialogContent>
                        </Dialog>
                        
                        <Switch
                          checked={section.isActive}
                          onCheckedChange={(checked) => handleToggleSection(section, checked)}
                        />
                      </div>
                    </Reorder.Item>
                  );
                })}
              </Reorder.Group>

              {filteredSections.length === 0 && searchQuery && (
                <div className="text-center py-8 text-muted-foreground">
                  No sections found matching "{searchQuery}"
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Banners Tab */}
        <TabsContent value="banners">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Hero Slider Banners</CardTitle>
                <CardDescription>
                  Manage the rotating banners on your homepage hero section
                </CardDescription>
              </div>
              <Button onClick={handleAddBanner} size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Add Banner
              </Button>
            </CardHeader>
            <CardContent>
              {banners.length === 0 ? (
                <div className="text-center py-12">
                  <Image className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No banners yet</p>
                  <Button onClick={handleAddBanner} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Your First Banner
                  </Button>
                </div>
              ) : (
                <Reorder.Group
                  axis="y"
                  values={banners}
                  onReorder={handleReorderBanners}
                  className="space-y-4"
                >
                  {banners.map((banner) => (
                    <Reorder.Item
                      key={banner.id}
                      value={banner}
                      className="cursor-grab active:cursor-grabbing"
                    >
                      <div className={`flex gap-4 p-4 rounded-xl border transition-all ${
                        banner.isActive ? 'bg-card border-border shadow-sm' : 'bg-muted/30 border-muted opacity-60'
                      }`}>
                        <GripVertical className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />
                        
                        <div className="w-32 h-20 rounded-lg bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {banner.imageUrl ? (
                            <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover" />
                          ) : (
                            <Image className="w-8 h-8 text-muted-foreground" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{banner.title}</p>
                          <p className="text-sm text-muted-foreground truncate">{banner.subtitle}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {banner.ctaLink}
                            </Badge>
                            {banner.imageOnly && (
                              <Badge variant="secondary" className="text-xs">
                                Image Only
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => {
                              setEditingBanner(banner);
                              setBannerDialogOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleBanner(banner.id, !banner.isActive)}
                          >
                            {banner.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteBanner(banner.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              )}
            </CardContent>
          </Card>

          <Dialog open={bannerDialogOpen} onOpenChange={setBannerDialogOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingBanner?.id ? 'Edit Banner' : 'Add New Banner'}</DialogTitle>
              </DialogHeader>
              {editingBanner && (
                <BannerEditForm
                  banner={editingBanner}
                  onSave={handleSaveBanner}
                  onCancel={() => {
                    setBannerDialogOpen(false);
                    setEditingBanner(null);
                  }}
                  isSaving={isSaving}
                />
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Promo Strip Tab */}
        <TabsContent value="promo">
          <PromoStripManager />
        </TabsContent>

        {/* A/B Testing Tab */}
        <TabsContent value="ab-testing">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FlaskConical className="w-5 h-5" />
                    A/B Testing Analytics
                  </CardTitle>
                  <CardDescription>
                    Compare banner variants and find winners with statistical significance
                  </CardDescription>
                </div>
                <Badge variant="outline" className="gap-1">
                  <Beaker className="w-3 h-3" />
                  Auto-monitoring active
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ABTestingDashboard />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Collections Tab */}
        <TabsContent value="collections">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Featured Collections</CardTitle>
                <CardDescription>
                  Create curated product collections for your homepage
                </CardDescription>
              </div>
              <Button onClick={handleAddCollection} size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                New Collection
              </Button>
            </CardHeader>
            <CardContent>
              {collections.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No collections yet</p>
                  <Button onClick={handleAddCollection} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Create Your First Collection
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {collections.map((collection) => (
                    <div key={collection.id} className="flex items-center gap-4 p-4 rounded-xl border bg-card">
                      <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-accent/20 to-primary/10 flex items-center justify-center overflow-hidden">
                        {collection.imageUrl ? (
                          <img src={collection.imageUrl} alt={collection.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold">{collection.name}</p>
                        <p className="text-sm text-muted-foreground truncate">{collection.description || 'No description'}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {collection.productIds.length} products
                          </Badge>
                          <Badge variant="outline" className="text-xs capitalize">
                            {collection.displayType}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={collection.isActive}
                          onCheckedChange={(checked) => {
                            updateContent.mutate({ id: collection.id, is_active: checked });
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingCollection(collection);
                            setCollectionDialogOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => handleDeleteCollection(collection.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
