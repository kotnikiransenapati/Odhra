import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  FlaskConical,
  TrendingUp,
  TrendingDown,
  Trophy,
  BarChart3,
  Eye,
  MousePointer,
  Percent,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Crown,
  Target,
  Zap,
} from 'lucide-react';
import { useBannerABAnalytics } from '@/hooks/useBannerABTesting';
import { supabase } from '@/integrations/supabase/client';

interface ABStats {
  bannerId: string;
  bannerTitle?: string;
  variantA: { views: number; clicks: number; ctr: number };
  variantB: { views: number; clicks: number; ctr: number };
}

interface WinnerResult {
  winner: 'A' | 'B' | 'none';
  confidence: number;
  isSignificant: boolean;
  lift: number;
}

// Statistical significance calculation using Z-test for proportions
function calculateStatisticalSignificance(
  viewsA: number,
  clicksA: number,
  viewsB: number,
  clicksB: number
): WinnerResult {
  if (viewsA < 30 || viewsB < 30) {
    return { winner: 'none', confidence: 0, isSignificant: false, lift: 0 };
  }

  const pA = clicksA / viewsA;
  const pB = clicksB / viewsB;
  
  // Pooled proportion
  const pPooled = (clicksA + clicksB) / (viewsA + viewsB);
  
  // Standard error
  const se = Math.sqrt(pPooled * (1 - pPooled) * (1 / viewsA + 1 / viewsB));
  
  if (se === 0) {
    return { winner: 'none', confidence: 0, isSignificant: false, lift: 0 };
  }
  
  // Z-score
  const z = Math.abs(pA - pB) / se;
  
  // Convert Z-score to confidence level (two-tailed)
  // Z = 1.645 → 90%, Z = 1.96 → 95%, Z = 2.576 → 99%
  let confidence = 0;
  if (z >= 2.576) confidence = 99;
  else if (z >= 2.326) confidence = 98;
  else if (z >= 1.96) confidence = 95;
  else if (z >= 1.645) confidence = 90;
  else if (z >= 1.28) confidence = 80;
  else confidence = Math.min(70, z * 35);

  const isSignificant = confidence >= 95;
  const winner: 'A' | 'B' | 'none' = 
    !isSignificant ? 'none' : 
    pA > pB ? 'A' : 'B';

  const baseCTR = winner === 'A' ? pB : pA;
  const winnerCTR = winner === 'A' ? pA : pB;
  const lift = baseCTR > 0 ? ((winnerCTR - baseCTR) / baseCTR) * 100 : 0;

  return { winner, confidence, isSignificant, lift };
}

export function ABTestingDashboard() {
  const { fetchAnalytics } = useBannerABAnalytics();
  const [stats, setStats] = useState<ABStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [bannerTitles, setBannerTitles] = useState<Record<string, string>>({});
  const [promotingBanner, setPromotingBanner] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    bannerId: string;
    winner: 'A' | 'B';
    bannerTitle: string;
  } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAnalytics();
      setStats(data);

      // Fetch banner titles
      const bannerIds = data.map(s => s.bannerId);
      if (bannerIds.length > 0) {
        const { data: banners } = await supabase
          .from('cms_content')
          .select('id, title')
          .in('id', bannerIds);
        
        const titles: Record<string, string> = {};
        banners?.forEach(b => { titles[b.id] = b.title; });
        setBannerTitles(titles);
      }
    } catch (error) {
      console.error('Failed to load A/B analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePromoteWinner = async (bannerId: string, winner: 'A' | 'B') => {
    setPromotingBanner(bannerId);
    try {
      if (winner === 'B') {
        // Get current banner data
        const { data: banner } = await supabase
          .from('cms_content')
          .select('*')
          .eq('id', bannerId)
          .single();

        if (!banner) throw new Error('Banner not found');

        const currentContent = banner.content as Record<string, any>;
        const variantBContent = (banner as any).ab_variant_b_content || {};

        // Merge variant B content into main content
        const newContent = {
          ...currentContent,
          title: variantBContent.title || currentContent.title,
          subtitle: variantBContent.subtitle || currentContent.subtitle,
          imageUrl: variantBContent.imageUrl || currentContent.imageUrl,
          ctaText: variantBContent.ctaText || currentContent.ctaText,
          ctaLink: variantBContent.ctaLink || currentContent.ctaLink,
        };

        // Update banner with winner content and disable A/B testing
        await supabase
          .from('cms_content')
          .update({
            content: newContent,
            title: variantBContent.title || banner.title,
            ab_enabled: false,
            ab_variant_b_content: null,
          })
          .eq('id', bannerId);
      } else {
        // For variant A, just disable A/B testing (keep current content)
        await supabase
          .from('cms_content')
          .update({
            ab_enabled: false,
            ab_variant_b_content: null,
          })
          .eq('id', bannerId);
      }

      toast.success(`Variant ${winner} promoted as winner!`);
      setConfirmDialog(null);
      await loadData();
    } catch (error) {
      console.error('Failed to promote winner:', error);
      toast.error('Failed to promote winner');
    } finally {
      setPromotingBanner(null);
    }
  };

  const totalViews = stats.reduce((acc, s) => acc + s.variantA.views + s.variantB.views, 0);
  const totalClicks = stats.reduce((acc, s) => acc + s.variantA.clicks + s.variantB.clicks, 0);
  const activeTests = stats.length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
        >
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <FlaskConical className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Tests</p>
                  <p className="text-2xl font-bold">{activeTests}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-info/10 to-info/5 border-info/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-info/20">
                  <Eye className="w-5 h-5 text-info" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Views</p>
                  <p className="text-2xl font-bold">{totalViews.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/20">
                  <MousePointer className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Clicks</p>
                  <p className="text-2xl font-bold">{totalClicks.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/20">
                  <Percent className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg CTR</p>
                  <p className="text-2xl font-bold">
                    {totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(2) : '0.00'}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={loadData} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh Data
        </Button>
      </div>

      {/* Test Results */}
      {stats.length === 0 ? (
        <Card className="p-12 text-center">
          <FlaskConical className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">No A/B Tests Running</h3>
          <p className="text-muted-foreground">
            Enable A/B testing on your banners to start collecting data
          </p>
        </Card>
      ) : (
        <div className="grid gap-6">
          {stats.map((stat, index) => {
            const result = calculateStatisticalSignificance(
              stat.variantA.views,
              stat.variantA.clicks,
              stat.variantB.views,
              stat.variantB.clicks
            );

            const title = bannerTitles[stat.bannerId] || `Banner ${stat.bannerId.slice(0, 8)}`;
            const totalTestViews = stat.variantA.views + stat.variantB.views;
            const minSampleSize = 100; // Minimum for reliable results
            const sampleProgress = Math.min(100, (totalTestViews / minSampleSize) * 100);

            return (
              <motion.div
                key={stat.bannerId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="overflow-hidden">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {title}
                          {result.isSignificant && (
                            <Badge className="bg-success/20 text-success border-success/30">
                              <Trophy className="w-3 h-3 mr-1" />
                              Winner Found
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {totalTestViews.toLocaleString()} total views • 
                          {result.isSignificant 
                            ? ` ${result.confidence}% confidence`
                            : totalTestViews < minSampleSize 
                              ? ' Collecting data...'
                              : ' No clear winner yet'
                          }
                        </CardDescription>
                      </div>
                      {result.isSignificant && (
                        <Button
                          size="sm"
                          className="gap-2"
                          onClick={() => setConfirmDialog({
                            open: true,
                            bannerId: stat.bannerId,
                            winner: result.winner as 'A' | 'B',
                            bannerTitle: title,
                          })}
                        >
                          <Crown className="w-4 h-4" />
                          Promote Winner
                        </Button>
                      )}
                    </div>

                    {/* Sample Size Progress */}
                    {totalTestViews < minSampleSize && (
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Sample Progress</span>
                          <span className="font-medium">{totalTestViews} / {minSampleSize}</span>
                        </div>
                        <Progress value={sampleProgress} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          Need at least {minSampleSize} views for reliable results
                        </p>
                      </div>
                    )}
                  </CardHeader>

                  <CardContent className="pt-0">
                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Variant A */}
                      <div className={`p-4 rounded-xl border-2 transition-all ${
                        result.winner === 'A' 
                          ? 'border-success/50 bg-success/5' 
                          : 'border-border bg-muted/30'
                      }`}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-bold">A</Badge>
                            <span className="font-semibold">Control</span>
                            {result.winner === 'A' && (
                              <Trophy className="w-4 h-4 text-success" />
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-success">
                              {stat.variantA.ctr.toFixed(2)}%
                            </p>
                            <p className="text-xs text-muted-foreground">CTR</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Views</p>
                            <p className="font-semibold text-lg">{stat.variantA.views.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Clicks</p>
                            <p className="font-semibold text-lg">{stat.variantA.clicks.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>

                      {/* Variant B */}
                      <div className={`p-4 rounded-xl border-2 transition-all ${
                        result.winner === 'B' 
                          ? 'border-success/50 bg-success/5' 
                          : 'border-border bg-muted/30'
                      }`}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-bold">B</Badge>
                            <span className="font-semibold">Variant</span>
                            {result.winner === 'B' && (
                              <Trophy className="w-4 h-4 text-success" />
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-info">
                              {stat.variantB.ctr.toFixed(2)}%
                            </p>
                            <p className="text-xs text-muted-foreground">CTR</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Views</p>
                            <p className="font-semibold text-lg">{stat.variantB.views.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Clicks</p>
                            <p className="font-semibold text-lg">{stat.variantB.clicks.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Statistical Summary */}
                    {totalTestViews >= 30 && (
                      <div className="mt-4 p-4 rounded-lg bg-muted/50 flex items-center gap-4">
                        {result.isSignificant ? (
                          <>
                            <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                            <div>
                              <p className="font-medium">
                                Variant {result.winner} is performing {result.lift.toFixed(1)}% better
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Statistical confidence: {result.confidence}%. Safe to promote this variant.
                              </p>
                            </div>
                            <div className="ml-auto flex items-center gap-2">
                              {result.lift > 0 ? (
                                <TrendingUp className="w-5 h-5 text-success" />
                              ) : (
                                <TrendingDown className="w-5 h-5 text-destructive" />
                              )}
                              <span className={`font-bold ${result.lift > 0 ? 'text-success' : 'text-destructive'}`}>
                                {result.lift > 0 ? '+' : ''}{result.lift.toFixed(1)}%
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
                            <div>
                              <p className="font-medium">Results not yet statistically significant</p>
                              <p className="text-sm text-muted-foreground">
                                Current confidence: {result.confidence.toFixed(0)}%. Keep collecting data to reach 95%.
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Confirm Promotion Dialog */}
      <Dialog 
        open={confirmDialog?.open || false} 
        onOpenChange={(open) => !open && setConfirmDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-warning" />
              Promote Winning Variant
            </DialogTitle>
            <DialogDescription>
              This will make Variant {confirmDialog?.winner} the permanent banner content
              and disable A/B testing for "{confirmDialog?.bannerTitle}".
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-warning">
                    What happens next:
                  </p>
                  <ul className="mt-2 space-y-1 text-muted-foreground">
                    <li>• Variant {confirmDialog?.winner} content becomes the main banner</li>
                    <li>• A/B testing is disabled for this banner</li>
                    <li>• All visitors will see the winning variant</li>
                    <li>• Analytics data is preserved</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setConfirmDialog(null)}
              disabled={!!promotingBanner}
            >
              Cancel
            </Button>
            <Button
              onClick={() => confirmDialog && handlePromoteWinner(confirmDialog.bannerId, confirmDialog.winner)}
              disabled={!!promotingBanner}
              className="gap-2"
            >
              {promotingBanner ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Promoting...
                </>
              ) : (
                <>
                  <Trophy className="w-4 h-4" />
                  Promote Variant {confirmDialog?.winner}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
