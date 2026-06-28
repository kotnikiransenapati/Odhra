import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useWholesaler } from "@/hooks/useWholesaler";
import { Loader2 } from "lucide-react";

interface Props {
  children: ReactNode;
  /** If true (default), unauthenticated users go to /auth. */
  requireAuth?: boolean;
  /** If true, the route requires an approved wholesaler account. */
  requireApproved?: boolean;
}

export function RequireWholesaler({
  children,
  requireAuth = true,
  requireApproved = true,
}: Props) {
  const { loading, userId, status, isApproved } = useWholesaler();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[50vh] grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (requireAuth && !userId) {
    return (
      <Navigate
        to={`/auth?redirect=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  if (requireApproved && !isApproved) {
    // Route them to the right onboarding stop.
    if (!status) return <Navigate to="/wholesale/apply" replace />;
    return <Navigate to="/wholesale/status" replace />;
  }

  return <>{children}</>;
}
