import { Button } from "@/components/ui/button";
import { Heart, HeartOff, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { haptic } from "@/lib/haptics";
import { useIsVendorFavorited, useToggleFavoriteVendor } from "@/hooks/useFavoriteVendors";
import { Link } from "react-router-dom";

interface Props {
  vendorId: string;
  size?: "sm" | "default";
  className?: string;
}

export function FollowVendorButton({ vendorId, size = "default", className }: Props) {
  const { user } = useAuth();
  const { isFav, loading, setIsFav } = useIsVendorFavorited(vendorId);
  const toggle = useToggleFavoriteVendor();

  if (!user) {
    return (
      <Button asChild size={size} variant="outline" className={className}>
        <Link to={`/auth?redirect=${encodeURIComponent(window.location.pathname)}`}>
          <Heart className="w-4 h-4 mr-1.5" /> Follow
        </Link>
      </Button>
    );
  }

  const pending = toggle.isPending;

  return (
    <Button
      size={size}
      variant={isFav ? "secondary" : "default"}
      className={className}
      disabled={loading || pending}
      onClick={() => {
        haptic(isFav ? "light" : "success");
        // optimistic
        setIsFav(!isFav);
        toggle.mutate(vendorId, {
          onError: () => setIsFav(isFav),
        });
      }}
      aria-pressed={isFav}
    >
      {pending ? (
        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
      ) : isFav ? (
        <HeartOff className="w-4 h-4 mr-1.5" />
      ) : (
        <Heart className="w-4 h-4 mr-1.5" />
      )}
      {isFav ? "Following" : "Follow"}
    </Button>
  );
}
