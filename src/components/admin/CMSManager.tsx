import React, { useState } from 'react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  GripVertical,
  Plus,
  Image,
  Type,
  Layers,
  Eye,
  EyeOff,
  Trash2,
  Edit,
  Save,
  LayoutGrid,
  Palette,
  Play,
  Pause,
  Timer,
  Link as LinkIcon,
  ShoppingBag,
  Star,
  Sparkles,
  Gift,
  TrendingUp,
  Clock,
  Users,
  Package,
  ChevronRight,
  Monitor,
  Smartphone,
  Tablet,
  Settings2,
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
}

interface HomepageSection {
  id: string;
  type: 'hero' | 'trending' | 'recommended' | 'categories' | 'spinwheel' | 'featured' | 'reviews' | 'stories' | 'vendor-cta' | 'trust-badges';
  title: string;
  isActive: boolean;
  order: number;
  settings: Record<string, any>;
}

interface FeaturedCollection {
  id: string;
  name: string;
  description: string;
  products: string[];
  isActive: boolean;
  displayType: 'grid' | 'carousel' | 'list';
}

// Default banners
const defaultBanners: HeroBanner[] = [
  {
    id: '1',
    title: 'Discover Extraordinary',
    subtitle: 'India\'s Premium Multi-Vendor Marketplace',
    imageUrl: '/hero-banner-1.jpg',
    ctaText: 'Shop Now',
    ctaLink: '/shop',
    isActive: true,
    order: 0,
  },
  {
    id: '2',
    title: 'New Season Arrivals',
    subtitle: 'Up to 50% off on fashion collection',
    imageUrl: '/hero-banner-2.jpg',
    ctaText: 'Explore',
    ctaLink: '/shop?category=fashion',
    isActive: true,
    order: 1,
  },
  {
    id: '3',
    title: 'Tech Deals',
    subtitle: 'Latest gadgets at best prices',
    imageUrl: '/hero-banner-3.jpg',
    ctaText: 'View Deals',
    ctaLink: '/shop?category=electronics',
    isActive: true,
    order: 2,
  },
];

// Default sections order
const defaultSections: HomepageSection[] = [
  { id: 'hero', type: 'hero', title: 'Hero Slider', isActive: true, order: 0, settings: { autoPlay: true, interval: 5000, showDots: true } },
  { id: 'trust', type: 'trust-badges', title: 'Trust Badges', isActive: true, order: 1, settings: {} },
  { id: 'trending', type: 'trending', title: 'Trending Products', isActive: true, order: 2, settings: { limit: 8, showViewAll: true } },
  { id: 'recommended', type: 'recommended', title: 'Recommended For You', isActive: true, order: 3, settings: { limit: 8, personalized: true } },
  { id: 'categories', type: 'categories', title: 'Shop by Category', isActive: true, order: 4, settings: { limit: 5, showDescription: true } },
  { id: 'spinwheel', type: 'spinwheel', title: 'Spin & Win', isActive: true, order: 5, settings: { showForNewUsers: true, minOrderAmount: 1499 } },
  { id: 'featured', type: 'featured', title: 'Featured Products', isActive: true, order: 6, settings: { limit: 8 } },
  { id: 'stories', type: 'stories', title: 'Customer Stories', isActive: true, order: 7, settings: { limit: 6 } },
  { id: 'reviews', type: 'reviews', title: 'Delivery Reviews', isActive: true, order: 8, settings: { limit: 4, showRating: true } },
  { id: 'vendor-cta', type: 'vendor-cta', title: 'Become a Seller', isActive: true, order: 9, settings: {} },
];

const sectionIcons: Record<string, React.ReactNode> = {
  hero: <Image className="w-4 h-4" />,
  trending: <TrendingUp className="w-4 h-4" />,
  recommended: <Star className="w-4 h-4" />,
  categories: <LayoutGrid className="w-4 h-4" />,
  spinwheel: <Gift className="w-4 h-4" />,
  featured: <Package className="w-4 h-4" />,
  stories: <Users className="w-4 h-4" />,
  reviews: <Star className="w-4 h-4" />,
  'vendor-cta': <ShoppingBag className="w-4 h-4" />,
  'trust-badges': <Sparkles className="w-4 h-4" />,
};

export function CMSManager() {
  const [banners, setBanners] = useState<HeroBanner[]>(defaultBanners);
  const [sections, setSections] = useState<HomepageSection[]>(defaultSections);
  const [collections, setCollections] = useState<FeaturedCollection[]>([]);
  const [editingBanner, setEditingBanner] = useState<HeroBanner | null>(null);
  const [editingSection, setEditingSection] = useState<HomepageSection | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [hasChanges, setHasChanges] = useState(false);

  // Banner CRUD
  const handleAddBanner = () => {
    const newBanner: HeroBanner = {
      id: Date.now().toString(),
      title: 'New Banner',
      subtitle: 'Add your subtitle here',
      imageUrl: '',
      ctaText: 'Shop Now',
      ctaLink: '/shop',
      isActive: true,
      order: banners.length,
    };
    setBanners([...banners, newBanner]);
    setEditingBanner(newBanner);
    setHasChanges(true);
  };

  const handleUpdateBanner = (updated: HeroBanner) => {
    setBanners(banners.map(b => b.id === updated.id ? updated : b));
    setEditingBanner(null);
    setHasChanges(true);
    toast.success('Banner updated');
  };

  const handleDeleteBanner = (id: string) => {
    setBanners(banners.filter(b => b.id !== id));
    setHasChanges(true);
    toast.success('Banner deleted');
  };

  const handleReorderBanners = (newOrder: HeroBanner[]) => {
    setBanners(newOrder.map((b, i) => ({ ...b, order: i })));
    setHasChanges(true);
  };

  // Sections
  const handleToggleSection = (id: string) => {
    setSections(sections.map(s => 
      s.id === id ? { ...s, isActive: !s.isActive } : s
    ));
    setHasChanges(true);
  };

  const handleReorderSections = (newOrder: HomepageSection[]) => {
    setSections(newOrder.map((s, i) => ({ ...s, order: i })));
    setHasChanges(true);
  };

  const handleUpdateSectionSettings = (id: string, settings: Record<string, any>) => {
    setSections(sections.map(s => 
      s.id === id ? { ...s, settings: { ...s.settings, ...settings } } : s
    ));
    setEditingSection(null);
    setHasChanges(true);
    toast.success('Section settings updated');
  };

  const handleSaveAll = () => {
    // In real implementation, save to database
    toast.success('Homepage configuration saved!');
    setHasChanges(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Homepage CMS</h2>
          <p className="text-muted-foreground">Drag and drop to customize your homepage layout</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Preview Mode Selector */}
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
          
          {hasChanges && (
            <Badge variant="outline" className="text-amber-600 border-amber-600">
              Unsaved changes
            </Badge>
          )}
          
          <Button onClick={handleSaveAll} disabled={!hasChanges} className="gap-2">
            <Save className="w-4 h-4" />
            Save Changes
          </Button>
        </div>
      </div>

      <Tabs defaultValue="sections" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="sections" className="gap-2">
            <Layers className="w-4 h-4" />
            Sections
          </TabsTrigger>
          <TabsTrigger value="banners" className="gap-2">
            <Image className="w-4 h-4" />
            Hero Banners
          </TabsTrigger>
          <TabsTrigger value="collections" className="gap-2">
            <LayoutGrid className="w-4 h-4" />
            Collections
          </TabsTrigger>
        </TabsList>

        {/* Sections Tab */}
        <TabsContent value="sections">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Homepage Section Order</CardTitle>
              <CardDescription>
                Drag sections to reorder. Toggle visibility and configure individual section settings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Reorder.Group
                axis="y"
                values={sections}
                onReorder={handleReorderSections}
                className="space-y-2"
              >
                {sections.map((section) => (
                  <Reorder.Item
                    key={section.id}
                    value={section}
                    className={`flex items-center gap-3 p-4 rounded-xl border transition-all cursor-grab active:cursor-grabbing ${
                      section.isActive 
                        ? 'bg-card border-border hover:border-accent/50' 
                        : 'bg-muted/50 border-muted'
                    }`}
                  >
                    <GripVertical className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    
                    <div className={`p-2 rounded-lg ${section.isActive ? 'bg-accent/10 text-accent' : 'bg-muted text-muted-foreground'}`}>
                      {sectionIcons[section.type]}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium ${!section.isActive && 'text-muted-foreground'}`}>
                        {section.title}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {section.type.replace('-', ' ')}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
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
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Configure {section.title}</DialogTitle>
                          </DialogHeader>
                          <SectionSettingsForm
                            section={section}
                            onSave={(settings) => handleUpdateSectionSettings(section.id, settings)}
                          />
                        </DialogContent>
                      </Dialog>
                      
                      <Switch
                        checked={section.isActive}
                        onCheckedChange={() => handleToggleSection(section.id)}
                      />
                    </div>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
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
                      banner.isActive ? 'bg-card border-border' : 'bg-muted/50 border-muted opacity-60'
                    }`}>
                      <GripVertical className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />
                      
                      {/* Banner Preview */}
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
                            <LinkIcon className="w-3 h-3 mr-1" />
                            {banner.ctaLink}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => setEditingBanner(banner)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-lg">
                            <DialogHeader>
                              <DialogTitle>Edit Banner</DialogTitle>
                            </DialogHeader>
                            <BannerEditForm
                              banner={banner}
                              onSave={handleUpdateBanner}
                              onCancel={() => setEditingBanner(null)}
                            />
                          </DialogContent>
                        </Dialog>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setBanners(banners.map(b => 
                            b.id === banner.id ? { ...b, isActive: !b.isActive } : b
                          ))}
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

              {banners.length === 0 && (
                <div className="text-center py-12">
                  <Image className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No banners yet</p>
                  <Button onClick={handleAddBanner} className="mt-4 gap-2">
                    <Plus className="w-4 h-4" />
                    Add Your First Banner
                  </Button>
                </div>
              )}
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
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                New Collection
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {/* Default collections */}
                {['Best Sellers', 'New Arrivals', 'Flash Deals'].map((name, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-xl border bg-card">
                    <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-accent/20 to-primary/10 flex items-center justify-center">
                      <Package className="w-6 h-6 text-accent" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{name}</p>
                      <p className="text-sm text-muted-foreground">12 products</p>
                    </div>
                    <Badge variant="secondary">Active</Badge>
                    <Button variant="ghost" size="icon">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Banner Edit Form Component
function BannerEditForm({ 
  banner, 
  onSave, 
  onCancel 
}: { 
  banner: HeroBanner; 
  onSave: (b: HeroBanner) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(banner);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Title</Label>
        <Input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Banner title"
        />
      </div>
      
      <div className="space-y-2">
        <Label>Subtitle</Label>
        <Textarea
          value={form.subtitle}
          onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
          placeholder="Banner subtitle"
          rows={2}
        />
      </div>
      
      <div className="space-y-2">
        <Label>Image URL</Label>
        <Input
          value={form.imageUrl}
          onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
          placeholder="https://..."
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Button Text</Label>
          <Input
            value={form.ctaText}
            onChange={(e) => setForm({ ...form, ctaText: e.target.value })}
            placeholder="Shop Now"
          />
        </div>
        <div className="space-y-2">
          <Label>Button Link</Label>
          <Input
            value={form.ctaLink}
            onChange={(e) => setForm({ ...form, ctaLink: e.target.value })}
            placeholder="/shop"
          />
        </div>
      </div>
      
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(form)}>Save Banner</Button>
      </DialogFooter>
    </div>
  );
}

// Section Settings Form Component
function SectionSettingsForm({ 
  section, 
  onSave 
}: { 
  section: HomepageSection;
  onSave: (settings: Record<string, any>) => void;
}) {
  const [settings, setSettings] = useState(section.settings);

  const renderSettings = () => {
    switch (section.type) {
      case 'hero':
        return (
          <>
            <div className="flex items-center justify-between">
              <Label>Auto-play slides</Label>
              <Switch
                checked={settings.autoPlay}
                onCheckedChange={(v) => setSettings({ ...settings, autoPlay: v })}
              />
            </div>
            <div className="space-y-2">
              <Label>Slide interval (ms)</Label>
              <Input
                type="number"
                value={settings.interval || 5000}
                onChange={(e) => setSettings({ ...settings, interval: parseInt(e.target.value) })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Show navigation dots</Label>
              <Switch
                checked={settings.showDots}
                onCheckedChange={(v) => setSettings({ ...settings, showDots: v })}
              />
            </div>
          </>
        );
      
      case 'trending':
      case 'recommended':
      case 'featured':
        return (
          <>
            <div className="space-y-2">
              <Label>Products to display</Label>
              <Select
                value={settings.limit?.toString() || '8'}
                onValueChange={(v) => setSettings({ ...settings, limit: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">4 products</SelectItem>
                  <SelectItem value="8">8 products</SelectItem>
                  <SelectItem value="12">12 products</SelectItem>
                  <SelectItem value="16">16 products</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Show "View All" link</Label>
              <Switch
                checked={settings.showViewAll !== false}
                onCheckedChange={(v) => setSettings({ ...settings, showViewAll: v })}
              />
            </div>
          </>
        );
      
      case 'spinwheel':
        return (
          <>
            <div className="flex items-center justify-between">
              <Label>Show for new users only</Label>
              <Switch
                checked={settings.showForNewUsers}
                onCheckedChange={(v) => setSettings({ ...settings, showForNewUsers: v })}
              />
            </div>
            <div className="space-y-2">
              <Label>Minimum order amount (₹)</Label>
              <Input
                type="number"
                value={settings.minOrderAmount || 0}
                onChange={(e) => setSettings({ ...settings, minOrderAmount: parseInt(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">
                Users get spin access after placing an order above this amount
              </p>
            </div>
          </>
        );
      
      case 'categories':
        return (
          <>
            <div className="space-y-2">
              <Label>Categories to show</Label>
              <Select
                value={settings.limit?.toString() || '5'}
                onValueChange={(v) => setSettings({ ...settings, limit: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">4 categories</SelectItem>
                  <SelectItem value="5">5 categories</SelectItem>
                  <SelectItem value="6">6 categories</SelectItem>
                  <SelectItem value="8">8 categories</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Show descriptions</Label>
              <Switch
                checked={settings.showDescription !== false}
                onCheckedChange={(v) => setSettings({ ...settings, showDescription: v })}
              />
            </div>
          </>
        );

      default:
        return (
          <p className="text-sm text-muted-foreground">No additional settings for this section.</p>
        );
    }
  };

  return (
    <div className="space-y-4">
      {renderSettings()}
      <DialogFooter>
        <Button onClick={() => onSave(settings)}>Save Settings</Button>
      </DialogFooter>
    </div>
  );
}
