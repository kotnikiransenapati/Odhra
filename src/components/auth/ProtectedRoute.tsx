import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

type RequiredRole = 'user' | 'vendor' | 'admin' | 'cce';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: RequiredRole;
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  requiredRole,
  redirectTo = '/auth' 
}: ProtectedRouteProps) {
  const { user, isLoading, roles, isAdmin, isVendor } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size="lg" />
          <p className="text-muted-foreground animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Check role-based access
  if (requiredRole) {
    const hasAccess = (() => {
      switch (requiredRole) {
        case 'admin':
          return isAdmin;
        case 'vendor':
          return isVendor || isAdmin; // Admins can access vendor routes
        case 'user':
          return true; // All authenticated users have 'user' role
        default:
          return false;
      }
    })();

    if (!hasAccess) {
      // Redirect based on highest role
      if (isAdmin) {
        return <Navigate to="/admin" replace />;
      } else if (isVendor) {
        return <Navigate to="/vendor" replace />;
      } else {
        return <Navigate to="/" replace />;
      }
    }
  }

  return <>{children}</>;
}
