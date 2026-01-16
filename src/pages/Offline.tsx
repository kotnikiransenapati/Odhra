import { WifiOff, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function Offline() {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
          <WifiOff className="w-10 h-10 text-muted-foreground" />
        </div>
        
        <h1 className="text-2xl font-bold mb-2">You're Offline</h1>
        
        <p className="text-muted-foreground mb-8">
          It looks like you've lost your internet connection. 
          Some features may be unavailable until you're back online.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button onClick={handleRetry} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
          
          <Button variant="outline" asChild>
            <Link to="/" className="gap-2">
              <Home className="w-4 h-4" />
              Go Home
            </Link>
          </Button>
        </div>
        
        <div className="mt-12 p-4 bg-muted rounded-lg">
          <h3 className="font-medium mb-2">Available Offline</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• View previously loaded products</li>
            <li>• Access your saved cart</li>
            <li>• Browse cached pages</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
