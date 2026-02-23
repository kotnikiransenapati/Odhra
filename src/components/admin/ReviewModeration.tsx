import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  CheckCircle, XCircle, Star, Loader2, Search, MessageSquare,
  AlertTriangle, Brain, ThumbsUp, ThumbsDown, Shield, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAdminReviews, useModerateReview } from '@/hooks/useAdmin';
import { cn } from '@/lib/utils';

interface SentimentResult {
  sentiment: 'positive' | 'neutral' | 'negative';
  score: number;
  flags: string[];
  shouldFlag: boolean;
  reason?: string;
}

export function ReviewModeration() {
  const queryClient = useQueryClient();
  const { data: reviews, isLoading } = useAdminReviews();
  const moderateReview = useModerateReview();
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ reviewId: string; action: 'approve' | 'reject' } | null>(null);
  const [sentimentResults, setSentimentResults] = useState<Map<string, SentimentResult>>(new Map());
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());

  // AI Sentiment Analysis
  const analyzeSentiment = useMutation({
    mutationFn: async (reviewIds: string[]) => {
      const reviewsToAnalyze = reviews?.filter(r => reviewIds.includes(r.id)).map(r => ({
        reviewId: r.id,
        content: r.content || '',
        rating: r.rating,
        title: r.title || undefined,
      })) || [];

      if (reviewsToAnalyze.length === 0) return [];

      const { data, error } = await supabase.functions.invoke('analyze-review-sentiment', {
        body: { reviews: reviewsToAnalyze },
      });
      if (error) throw error;
      return data?.results || [];
    },
    onSuccess: (results: SentimentResult[]) => {
      const newMap = new Map(sentimentResults);
      results.forEach((r: any) => newMap.set(r.reviewId, r));
      setSentimentResults(newMap);
      setAnalyzingIds(new Set());
      toast.success(`Analyzed ${results.length} review(s)`);
    },
    onError: (e: Error) => {
      setAnalyzingIds(new Set());
      toast.error('Sentiment analysis failed: ' + e.message);
    },
  });

  const handleAnalyzeAll = () => {
    const pending = reviews?.filter(r => !sentimentResults.has(r.id)).map(r => r.id) || [];
    if (pending.length === 0) {
      toast.info('All reviews already analyzed');
      return;
    }
    const batch = pending.slice(0, 10); // Analyze up to 10 at a time
    setAnalyzingIds(new Set(batch));
    analyzeSentiment.mutate(batch);
  };

  const handleAnalyzeSingle = (reviewId: string) => {
    setAnalyzingIds(new Set([reviewId]));
    analyzeSentiment.mutate([reviewId]);
  };

  const filteredReviews = reviews?.filter((review) => {
    const query = searchQuery.toLowerCase();
    return (
      review.product_title?.toLowerCase().includes(query) ||
      review.user_name?.toLowerCase().includes(query) ||
      review.content?.toLowerCase().includes(query) ||
      review.title?.toLowerCase().includes(query) ||
      review.vendor_name?.toLowerCase().includes(query)
    );
  });

  const handleModerate = (reviewId: string, action: 'approve' | 'reject') => {
    setConfirmAction({ reviewId, action });
  };

  const confirmModeration = async () => {
    if (!confirmAction) return;
    await moderateReview.mutateAsync(confirmAction);
    setConfirmAction(null);
  };

  const SentimentBadge = ({ reviewId }: { reviewId: string }) => {
    const result = sentimentResults.get(reviewId);
    const isAnalyzing = analyzingIds.has(reviewId);

    if (isAnalyzing) return <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />;
    if (!result) return null;

    const sentimentConfig = {
      positive: { color: 'bg-success/10 text-success', icon: ThumbsUp },
      neutral: { color: 'bg-muted text-muted-foreground', icon: Shield },
      negative: { color: 'bg-destructive/10 text-destructive', icon: ThumbsDown },
    };
    const cfg = sentimentConfig[result.sentiment];
    const Icon = cfg.icon;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              <Badge className={`${cfg.color} gap-1`}>
                <Icon className="w-3 h-3" />
                {result.sentiment} ({(result.score * 100).toFixed(0)}%)
              </Badge>
              {result.shouldFlag && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Flagged
                </Badge>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="space-y-1">
              {result.flags.length > 0 && <p className="text-xs"><strong>Flags:</strong> {result.flags.join(', ')}</p>}
              {result.reason && <p className="text-xs"><strong>Reason:</strong> {result.reason}</p>}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Review Moderation</h2>
          <p className="text-muted-foreground">Approve or reject customer reviews with AI-powered sentiment analysis</p>
        </div>
        <Button onClick={handleAnalyzeAll} disabled={analyzeSentiment.isPending} className="gap-2">
          <Brain className="w-4 h-4" />
          {analyzeSentiment.isPending ? 'Analyzing...' : 'AI Analyze All'}
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search reviews..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-warning" />
            <div>
              <p className="text-2xl font-bold">{filteredReviews?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Pending Moderation</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-accent" />
            <div>
              <p className="text-2xl font-bold">{sentimentResults.size}</p>
              <p className="text-xs text-muted-foreground">AI Analyzed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <div>
              <p className="text-2xl font-bold">
                {[...sentimentResults.values()].filter(r => r.shouldFlag).length}
              </p>
              <p className="text-xs text-muted-foreground">AI Flagged</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reviews List */}
      {filteredReviews && filteredReviews.length > 0 ? (
        <div className="space-y-4">
          {filteredReviews.map((review) => {
            const initials = review.user_name?.split(' ').map((n) => n[0]).join('').toUpperCase() || 'U';
            const sentiment = sentimentResults.get(review.id);
            const isFlagged = sentiment?.shouldFlag;

            return (
              <Card key={review.id} className={cn('overflow-hidden', isFlagged && 'border-destructive/50 bg-destructive/5')}>
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Product Info */}
                    <div className="flex items-start gap-4 lg:w-1/4">
                      <img src={review.product_image} alt={review.product_title} className="w-16 h-16 rounded-lg object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{review.product_title}</p>
                        <p className="text-sm text-muted-foreground">{review.vendor_name}</p>
                      </div>
                    </div>

                    {/* Review Content */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-accent/20 text-accent text-xs">{initials}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{review.user_name}</span>
                              {review.is_verified_purchase && <Badge variant="secondary" className="text-xs">Verified Purchase</Badge>}
                            </div>
                            <span className="text-xs text-muted-foreground">{review.user_email}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star key={star} className={cn('w-4 h-4', star <= review.rating ? 'fill-warning text-warning' : 'text-muted-foreground/30')} />
                          ))}
                        </div>
                      </div>

                      {review.title && <h4 className="font-semibold">{review.title}</h4>}
                      {review.content && <p className="text-muted-foreground text-sm leading-relaxed">{review.content}</p>}

                      {review.images && review.images.length > 0 && (
                        <div className="flex gap-2">
                          {review.images.map((image, index) => (
                            <img key={index} src={image} alt={`Review image ${index + 1}`} className="w-16 h-16 rounded-lg object-cover" />
                          ))}
                        </div>
                      )}

                      {/* Sentiment + Timestamp row */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <SentimentBadge reviewId={review.id} />
                        {!sentimentResults.has(review.id) && !analyzingIds.has(review.id) && (
                          <Button variant="ghost" size="sm" onClick={() => handleAnalyzeSingle(review.id)} className="gap-1 text-xs h-7">
                            <Brain className="w-3 h-3" /> Analyze
                          </Button>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto">
                          Submitted {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex lg:flex-col gap-2 lg:w-32">
                      <Button variant="default" size="sm" className="flex-1 gap-2" onClick={() => handleModerate(review.id, 'approve')} disabled={moderateReview.isPending}>
                        <CheckCircle className="w-4 h-4" /> Approve
                      </Button>
                      <Button variant="destructive" size="sm" className="flex-1 gap-2" onClick={() => handleModerate(review.id, 'reject')} disabled={moderateReview.isPending}>
                        <XCircle className="w-4 h-4" /> Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium mb-2">No Pending Reviews</h3>
            <p className="text-muted-foreground">All reviews have been moderated. Check back later!</p>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmAction?.action === 'approve' ? 'Approve Review' : 'Reject Review'}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.action === 'approve'
                ? 'This review will become publicly visible on the product page.'
                : 'This review will be permanently deleted and the customer will not be notified.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmModeration} className={confirmAction?.action === 'reject' ? 'bg-destructive hover:bg-destructive/90' : ''}>
              {moderateReview.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {confirmAction?.action === 'approve' ? 'Approve' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
