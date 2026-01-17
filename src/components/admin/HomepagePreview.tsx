import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Monitor,
  Tablet,
  Smartphone,
  RefreshCw,
  ExternalLink,
  Eye,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

// Import actual homepage components for preview
import { HeroSlider } from '@/components/home/HeroSlider';
import { TrustBadges } from '@/components/home/TrustBadges';
import { TrendingProducts } from '@/components/home/TrendingProducts';
import { RecommendedProducts } from '@/components/home/RecommendedProducts';
import { CategoryShowcase } from '@/components/home/CategoryShowcase';
import { FeaturedProducts } from '@/components/home/FeaturedProducts';
import { CustomerStories } from '@/components/home/CustomerStories';
import { DeliveryReviews } from '@/components/home/DeliveryReviews';
import { PromoStrip } from '@/components/home/PromoStrip';

interface HomepageSection {
  id: string;
  type: string;
  title: string;
  isActive: boolean;
  order: number;
  settings: Record<string, any>;
}

interface PromoStripData {
  message: string;
  link?: string;
  linkText?: string;
  countdownTo?: string | null;
}

interface HomepagePreviewProps {
  sections: HomepageSection[];
  promoStrip?: PromoStripData | null;
  onRefresh?: () => void;
}

type PreviewSize = 'desktop' | 'tablet' | 'mobile';

const previewSizes: Record<PreviewSize, { width: string; label: string }> = {
  desktop: { width: '100%', label: 'Desktop' },
  tablet: { width: '768px', label: 'Tablet' },
  mobile: { width: '375px', label: 'Mobile' },
};

// Simplified preview components that match actual components
const PreviewComponents: Record<string, React.ComponentType<any>> = {
  hero: HeroSlider,
  'trust-badges': TrustBadges,
  trending: TrendingProducts,
  recommended: RecommendedProducts,
  categories: CategoryShowcase,
  featured: FeaturedProducts,
  stories: CustomerStories,
  reviews: DeliveryReviews,
};

export function HomepagePreview({ sections, promoStrip, onRefresh }: HomepagePreviewProps) {
  const [previewSize, setPreviewSize] = useState<PreviewSize>('desktop');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const activeSections = sections.filter((s) => s.isActive).sort((a, b) => a.order - b.order);

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
    onRefresh?.();
  };

  const renderSection = (section: HomepageSection) => {
    const Component = PreviewComponents[section.type];

    if (!Component) {
      // Placeholder for sections without preview components
      return (
        <div className="p-8 text-center bg-muted/30 border-2 border-dashed border-border rounded-xl">
          <p className="text-muted-foreground font-medium">{section.title}</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Preview not available</p>
        </div>
      );
    }

    return <Component {...section.settings} />;
  };

  const PreviewContent = () => (
    <div key={refreshKey} className="bg-background min-h-[600px]">
      {/* Promo Strip Preview */}
      {promoStrip && (
        <PromoStrip
          message={promoStrip.message}
          link={promoStrip.link}
          linkText={promoStrip.linkText}
          countdownTo={promoStrip.countdownTo}
          dismissible={false}
        />
      )}

      {/* Sections Preview */}
      <div className="space-y-2">
        {activeSections.map((section) => (
          <motion.div
            key={section.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative group"
          >
            {/* Section label overlay */}
            <div className="absolute top-2 left-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
              <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm shadow-sm">
                {section.title}
              </Badge>
            </div>
            {renderSection(section)}
          </motion.div>
        ))}
      </div>

      {activeSections.length === 0 && (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <div className="text-center">
            <Eye className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No active sections to preview</p>
            <p className="text-sm opacity-60">Enable some sections to see them here</p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Eye className="w-5 h-5 text-accent" />
              Live Homepage Preview
            </CardTitle>
            <CardDescription>
              See how your homepage looks with current settings
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {/* Device Size Selector */}
            <div className="flex items-center gap-1 bg-background rounded-lg p-1 border">
              <Button
                variant={previewSize === 'desktop' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setPreviewSize('desktop')}
                className="h-8 w-8 p-0"
              >
                <Monitor className="w-4 h-4" />
              </Button>
              <Button
                variant={previewSize === 'tablet' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setPreviewSize('tablet')}
                className="h-8 w-8 p-0"
              >
                <Tablet className="w-4 h-4" />
              </Button>
              <Button
                variant={previewSize === 'mobile' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setPreviewSize('mobile')}
                className="h-8 w-8 p-0"
              >
                <Smartphone className="w-4 h-4" />
              </Button>
            </div>

            {/* Refresh */}
            <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>

            {/* Fullscreen Dialog */}
            <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Maximize2 className="w-4 h-4" />
                  Expand
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] w-full h-[90vh] p-0">
                <DialogHeader className="p-4 border-b bg-muted/30">
                  <div className="flex items-center justify-between">
                    <DialogTitle>Homepage Preview - {previewSizes[previewSize].label}</DialogTitle>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-background rounded-lg p-1 border">
                        <Button
                          variant={previewSize === 'desktop' ? 'secondary' : 'ghost'}
                          size="sm"
                          onClick={() => setPreviewSize('desktop')}
                          className="h-8 w-8 p-0"
                        >
                          <Monitor className="w-4 h-4" />
                        </Button>
                        <Button
                          variant={previewSize === 'tablet' ? 'secondary' : 'ghost'}
                          size="sm"
                          onClick={() => setPreviewSize('tablet')}
                          className="h-8 w-8 p-0"
                        >
                          <Tablet className="w-4 h-4" />
                        </Button>
                        <Button
                          variant={previewSize === 'mobile' ? 'secondary' : 'ghost'}
                          size="sm"
                          onClick={() => setPreviewSize('mobile')}
                          className="h-8 w-8 p-0"
                        >
                          <Smartphone className="w-4 h-4" />
                        </Button>
                      </div>
                      <Button variant="outline" size="sm" onClick={handleRefresh}>
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </DialogHeader>
                <ScrollArea className="flex-1 h-[calc(90vh-80px)]">
                  <div
                    className="mx-auto transition-all duration-300"
                    style={{
                      width: previewSizes[previewSize].width,
                      maxWidth: '100%',
                    }}
                  >
                    <PreviewContent />
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>

            {/* Open in new tab */}
            <Button variant="outline" size="sm" asChild className="gap-2">
              <a href="/" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4" />
                Open
              </a>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[600px]">
          <div
            className="mx-auto transition-all duration-300 border-x border-border/50"
            style={{
              width: previewSizes[previewSize].width,
              maxWidth: '100%',
            }}
          >
            <PreviewContent />
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
