import { Link } from "react-router-dom";
import { ThumbsUp, ThumbsDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useVoteReview, type VoteValue } from "@/hooks/useReviewVotes";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

interface Props {
  reviewId: string;
  productId: string;
  helpfulCount: number;
  myVote?: VoteValue;
}

export function ReviewHelpfulButtons({ reviewId, productId, helpfulCount, myVote }: Props) {
  const { user } = useAuth();
  const vote = useVoteReview(productId);

  const handle = (value: VoteValue) => {
    if (!user) return;
    haptic("selection");
    vote.mutate({ review_id: reviewId, vote: value, current: myVote });
  };

  if (!user) {
    return (
      <div className="flex items-center gap-3 pt-2 text-xs text-muted-foreground">
        <ThumbsUp className="w-4 h-4" aria-hidden />
        <span className="tabular-nums">{helpfulCount}</span>
        <Link
          to={`/auth?redirect=${encodeURIComponent(window.location.pathname)}`}
          className="underline hover:text-accent"
        >
          Sign in to vote
        </Link>
      </div>
    );
  }

  const busy = vote.isPending;
  return (
    <div className="flex items-center gap-2 pt-2">
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "gap-1.5 h-8",
          myVote === "up" && "text-accent bg-accent/10"
        )}
        onClick={() => handle("up")}
        disabled={busy}
        aria-pressed={myVote === "up"}
        aria-label="Mark this review helpful"
      >
        {busy && myVote !== "down" ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <ThumbsUp className="w-3.5 h-3.5" />
        )}
        Helpful
        <span className="tabular-nums text-xs">({helpfulCount})</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-8 w-8 p-0",
          myVote === "down" && "text-destructive bg-destructive/10"
        )}
        onClick={() => handle("down")}
        disabled={busy}
        aria-pressed={myVote === "down"}
        aria-label="Mark this review not helpful"
      >
        {busy && myVote === "down" ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <ThumbsDown className="w-3.5 h-3.5" />
        )}
      </Button>
    </div>
  );
}
