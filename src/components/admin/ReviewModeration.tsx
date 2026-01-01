import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  CheckCircle,
  XCircle,
  Star,
  Loader2,
  Search,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAdminReviews, useModerateReview } from '@/hooks/useAdmin';
import { cn } from '@/lib/utils';

export function ReviewModeration() {
  const { data: reviews, isLoading } = useAdminReviews();
  const moderateReview = useModerateReview();
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmAction, setConfirmAction] = useState<{
    reviewId: string;
    action: 'approve' | 'reject';
  } | null>(null);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Review Moderation</h2>
        <p className="text-muted-foreground">
          Approve or reject customer reviews before they go public
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search reviews..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats Card */}
      <Card className="bg-amber-500/10 border-amber-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Pending Reviews
          </CardTitle>
          <CardDescription>
            {filteredReviews?.length || 0} review{(filteredReviews?.length || 0) !== 1 ? 's' : ''} awaiting moderation
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Reviews List */}
      {filteredReviews && filteredReviews.length > 0 ? (
        <div className="space-y-4">
          {filteredReviews.map((review) => {
            const initials = review.user_name
              ?.split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase() || 'U';

            return (
              <Card key={review.id} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Product Info */}
                    <div className="flex items-start gap-4 lg:w-1/4">
                      <img
                        src={review.product_image}
                        alt={review.product_title}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{review.product_title}</p>
                        <p className="text-sm text-muted-foreground">{review.vendor_name}</p>
                      </div>
                    </div>

                    {/* Review Content */}
                    <div className="flex-1 space-y-3">
                      {/* User & Rating */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-accent/20 text-accent text-xs">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{review.user_name}</span>
                              {review.is_verified_purchase && (
                                <Badge variant="secondary" className="text-xs">
                                  Verified Purchase
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {review.user_email}
                            </span>
                          </div>
                        </div>

                        {/* Rating */}
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={cn(
                                'w-4 h-4',
                                star <= review.rating
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-muted-foreground/30'
                              )}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Title & Content */}
                      {review.title && (
                        <h4 className="font-semibold">{review.title}</h4>
                      )}
                      {review.content && (
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {review.content}
                        </p>
                      )}

                      {/* Images */}
                      {review.images && review.images.length > 0 && (
                        <div className="flex gap-2">
                          {review.images.map((image, index) => (
                            <img
                              key={index}
                              src={image}
                              alt={`Review image ${index + 1}`}
                              className="w-16 h-16 rounded-lg object-cover"
                            />
                          ))}
                        </div>
                      )}

                      {/* Timestamp */}
                      <p className="text-xs text-muted-foreground">
                        Submitted {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex lg:flex-col gap-2 lg:w-32">
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1 gap-2"
                        onClick={() => handleModerate(review.id, 'approve')}
                        disabled={moderateReview.isPending}
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1 gap-2"
                        onClick={() => handleModerate(review.id, 'reject')}
                        disabled={moderateReview.isPending}
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
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
            <p className="text-muted-foreground">
              All reviews have been moderated. Check back later!
            </p>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.action === 'approve' ? 'Approve Review' : 'Reject Review'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.action === 'approve'
                ? 'This review will become publicly visible on the product page.'
                : 'This review will be permanently deleted and the customer will not be notified.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmModeration}
              className={confirmAction?.action === 'reject' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {moderateReview.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {confirmAction?.action === 'approve' ? 'Approve' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
