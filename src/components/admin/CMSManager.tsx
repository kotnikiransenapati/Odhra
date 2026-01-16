import React, { useState, useEffect } from 'react';
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
import { toast } from 'sonner';
import { ImageUploader } from '@/components/vendor/ImageUploader';
import { useImageUpload } from '@/hooks/useImageUpload';
import { ProductPickerDialog } from './ProductPickerDialog';
import {
  useCMSContent,
  useCreateCMSContent,
  useUpdateCMSContent,
  useDeleteCMSContent,
  useBulkUpdateCMSOrder,
  CMSContent,
} from '@/hooks/useCMSContent';
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
  productIds: string[];
  imageUrl: string;
  isActive: boolean;
  displayType: 'grid' | 'carousel' | 'list';
}

// Default sections for initialization
const defaultSectionTypes = [
  { type: 'hero', title: 'Hero Slider', settings: { autoPlay: true, interval: 5000, showDots: true } },
  { type: 'trust-badges', title: 'Trust Badges', settings: {} },
  { type: 'trending', title: 'Trending Products', settings: { limit: 8, showViewAll: true } },
  { type: 'recommended', title: 'Recommended For You', settings: { limit: 8, personalized: true } },
  { type: 'categories', title: 'Shop by Category', settings: { limit: 5, showDescription: true } },
  { type: 'spinwheel', title: 'Spin & Win', settings: { showForNewUsers: true, minOrderAmount: 1499 } },
  { type: 'featured', title: 'Featured Products', settings: { limit: 8 } },
  { type: 'stories', title: 'Customer Stories', settings: { limit: 6 } },
  { type: 'reviews', title: 'Delivery Reviews', settings: { limit: 4, showRating: true } },
  { type: 'vendor-cta', title: 'Become a Seller', settings: {} },
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
  };
}

function cmsToSection(cms: CMSContent): HomepageSection {
  const content = cms.content as Record<string, any>;
  return {
    id: cms.id,
    type: cms.slug as HomepageSection['type'],
    title: cms.title,
    isActive: cms.is_active,
    order: cms.sort_order,
    settings: content.settings || {},
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

export function CMSManager() {
  const { data: allContent, isLoading, error, refetch } = useCMSContent();
  const createContent = useCreateCMSContent();
  const updateContent = useUpdateCMSContent();
  const deleteContent = useDeleteCMSContent();
  const bulkUpdateOrder = useBulkUpdateCMSOrder();

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

  // Parse CMS content into local state
  useEffect(() => {
    if (allContent) {
      const bannerContent = allContent.filter(c => c.type === 'hero_banner');
      // Support both 'homepage_section' and legacy 'section' types
      const sectionContent = allContent.filter(c => c.type === 'homepage_section' || c.type === 'section');
      const collectionContent = allContent.filter(c => c.type === 'featured_collection');

      setBanners(bannerContent.map(cmsToHeroBanner).sort((a, b) => a.order - b.order));
      setSections(sectionContent.map(cmsToSection).sort((a, b) => a.order - b.order));
      setCollections(collectionContent.map(cmsToCollection));
    }
  }, [allContent]);

  // Initialize default sections if none exist
  const initializeDefaultSections = async () => {
    if (!allContent) return;
    
    // Support both 'homepage_section' and legacy 'section' types
    const existingSections = allContent.filter(c => c.type === 'homepage_section' || c.type === 'section');
    if (existingSections.length === 0) {
      setIsSaving(true);
      try {
        for (let i = 0; i < defaultSectionTypes.length; i++) {
          const section = defaultSectionTypes[i];
          await createContent.mutateAsync({
            slug: section.type,
            type: 'homepage_section',
            title: section.title,
            content: { settings: section.settings },
            is_active: true,
            sort_order: i,
            starts_at: null,
            ends_at: null,
          });
        }
        toast.success('Default sections initialized');
      } catch (err) {
        toast.error('Failed to initialize sections');
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Banner CRUD
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
      };

      if (banner.id) {
        // Update existing
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
        // Create new
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
  const handleToggleSection = async (id: string, isActive: boolean) => {
    try {
      await updateContent.mutateAsync({ id, is_active: isActive });
    } catch (err) {
      toast.error('Failed to update section');
    }
  };

  const handleReorderSections = async (newOrder: HomepageSection[]) => {
    setSections(newOrder);
    const updates = newOrder.map((s, i) => ({ id: s.id, sort_order: i }));
    try {
      await bulkUpdateOrder.mutateAsync(updates);
    } catch (err) {
      console.error('Failed to save section order');
    }
  };

  const handleUpdateSectionSettings = async (id: string, settings: Record<string, any>) => {
    try {
      const section = sections.find(s => s.id === id);
      if (!section) return;
      
      await updateContent.mutateAsync({
        id,
        content: { settings },
      });
      setEditingSection(null);
    } catch (err) {
      toast.error('Failed to update section settings');
    }
  };

  // Collection CRUD
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
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Homepage CMS</h2>
          <p className="text-muted-foreground">Manage your homepage layout, banners, and collections</p>
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

          {sections.length === 0 && (
            <Button 
              onClick={initializeDefaultSections} 
              variant="outline" 
              className="gap-2"
              disabled={isSaving}
            >
              <RefreshCw className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
              Initialize Defaults
            </Button>
          )}
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
            Banners
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
              {sections.length === 0 ? (
                <div className="text-center py-12">
                  <Layers className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No sections configured yet</p>
                  <Button onClick={initializeDefaultSections} className="gap-2" disabled={isSaving}>
                    <Plus className="w-4 h-4" />
                    Initialize Default Sections
                  </Button>
                </div>
              ) : (
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
                        {sectionIcons[section.type] || <Layers className="w-4 h-4" />}
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
                          onCheckedChange={(checked) => handleToggleSection(section.id, checked)}
                        />
                      </div>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
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
                              {banner.ctaLink}
                            </Badge>
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

          {/* Banner Edit Dialog */}
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
                          <Package className="w-6 h-6 text-accent" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">{collection.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {collection.productIds.length} products • {collection.displayType}
                        </p>
                      </div>
                      <Badge variant={collection.isActive ? 'secondary' : 'outline'}>
                        {collection.isActive ? 'Active' : 'Inactive'}
                      </Badge>
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
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteCollection(collection.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Collection Edit Dialog */}
          <Dialog open={collectionDialogOpen} onOpenChange={setCollectionDialogOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingCollection?.id ? 'Edit Collection' : 'Create Collection'}</DialogTitle>
              </DialogHeader>
              {editingCollection && (
                <CollectionEditForm
                  collection={editingCollection}
                  onSave={handleSaveCollection}
                  onCancel={() => {
                    setCollectionDialogOpen(false);
                    setEditingCollection(null);
                  }}
                  isSaving={isSaving}
                />
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
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
  onSave: (b: HeroBanner) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState(banner);
  const { uploadImage, deleteImage, isUploading, progress } = useImageUpload({ bucket: 'vendor-assets' });

  const handleUpload = async (file: File) => {
    const result = await uploadImage(file, 'banners');
    return result?.url || null;
  };

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto">
      <div className="space-y-2">
        <ImageUploader
          value={form.imageUrl}
          onChange={(url) => setForm({ ...form, imageUrl: url })}
          onUpload={handleUpload}
          isUploading={isUploading}
          progress={progress}
          label="Banner Image"
          aspectRatio="wide"
        />
      </div>

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

      {/* Scheduling Section */}
      <div className="p-4 rounded-lg bg-muted/50 space-y-4">
        <p className="text-sm font-medium">Schedule Banner (Optional)</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Start Date & Time</Label>
            <Input
              type="datetime-local"
              value={form.startsAt ? new Date(form.startsAt).toISOString().slice(0, 16) : ''}
              onChange={(e) => setForm({ ...form, startsAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
            />
          </div>
          <div className="space-y-2">
            <Label>End Date & Time</Label>
            <Input
              type="datetime-local"
              value={form.endsAt ? new Date(form.endsAt).toISOString().slice(0, 16) : ''}
              onChange={(e) => setForm({ ...form, endsAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Leave empty to show banner immediately with no end date.
        </p>
      </div>

      <div className="flex items-center justify-between pt-2">
        <Label>Active</Label>
        <Switch
          checked={form.isActive}
          onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
        />
      </div>
      
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={isSaving || isUploading}>Cancel</Button>
        <Button onClick={() => onSave(form)} disabled={isSaving || isUploading}>
          {isSaving ? 'Saving...' : 'Save Banner'}
        </Button>
      </DialogFooter>
    </div>
  );
}

// Collection Edit Form Component
function CollectionEditForm({ 
  collection, 
  onSave, 
  onCancel,
  isSaving,
}: { 
  collection: FeaturedCollection; 
  onSave: (c: FeaturedCollection) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState(collection);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const { uploadImage, deleteImage, isUploading, progress } = useImageUpload({ bucket: 'vendor-assets' });

  const handleUpload = async (file: File) => {
    const result = await uploadImage(file, 'collections');
    return result?.url || null;
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <ImageUploader
          value={form.imageUrl}
          onChange={(url) => setForm({ ...form, imageUrl: url })}
          onUpload={handleUpload}
          isUploading={isUploading}
          progress={progress}
          label="Collection Image"
        />
      </div>

      <div className="space-y-2">
        <Label>Collection Name</Label>
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g., Best Sellers"
        />
      </div>
      
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Collection description"
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label>Display Type</Label>
        <Select
          value={form.displayType}
          onValueChange={(v: 'grid' | 'carousel' | 'list') => setForm({ ...form, displayType: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="carousel">Carousel</SelectItem>
            <SelectItem value="grid">Grid</SelectItem>
            <SelectItem value="list">List</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Products ({form.productIds.length} selected)</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setProductPickerOpen(true)}
            className="gap-2"
          >
            <Package className="w-4 h-4" />
            Select Products
          </Button>
        </div>
        {form.productIds.length > 0 && (
          <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg max-h-32 overflow-y-auto">
            {form.productIds.map((id) => (
              <Badge key={id} variant="secondary" className="text-xs font-mono">
                {id.slice(0, 8)}...
              </Badge>
            ))}
          </div>
        )}
        <ProductPickerDialog
          open={productPickerOpen}
          onOpenChange={setProductPickerOpen}
          selectedIds={form.productIds}
          onSelect={(ids) => setForm({ ...form, productIds: ids })}
        />
      </div>

      <div className="flex items-center justify-between pt-2">
        <Label>Active</Label>
        <Switch
          checked={form.isActive}
          onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
        />
      </div>
      
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={isSaving || isUploading}>Cancel</Button>
        <Button onClick={() => onSave(form)} disabled={isSaving || isUploading}>
          {isSaving ? 'Saving...' : 'Save Collection'}
        </Button>
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

      case 'stories':
      case 'reviews':
        return (
          <>
            <div className="space-y-2">
              <Label>Items to display</Label>
              <Select
                value={settings.limit?.toString() || '4'}
                onValueChange={(v) => setSettings({ ...settings, limit: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">4 items</SelectItem>
                  <SelectItem value="6">6 items</SelectItem>
                  <SelectItem value="8">8 items</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {section.type === 'reviews' && (
              <div className="flex items-center justify-between">
                <Label>Show ratings</Label>
                <Switch
                  checked={settings.showRating !== false}
                  onCheckedChange={(v) => setSettings({ ...settings, showRating: v })}
                />
              </div>
            )}
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
