import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Smartphone, Monitor, CheckCircle2, Wifi, Bell, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const features = [
    {
      icon: Wifi,
      title: 'Works Offline',
      description: 'Browse products and access your account even without internet',
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Instant loading with cached content for a native-like experience',
    },
    {
      icon: Bell,
      title: 'Push Notifications',
      description: 'Stay updated on orders, deals, and exclusive offers',
    },
    {
      icon: Smartphone,
      title: 'Home Screen Access',
      description: 'Quick access from your home screen like any other app',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-primary/10 via-background to-accent/10 py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-2 mb-6">
            <Download className="w-4 h-4" />
            <span className="text-sm font-medium">Install Odhra App</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Get the Full <span className="text-primary">Odhra</span> Experience
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Install our app for a faster, offline-capable shopping experience. 
            No app store needed – install directly from your browser.
          </p>

          {isInstalled ? (
            <div className="inline-flex items-center gap-2 bg-green-500/10 text-green-600 rounded-full px-6 py-3">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">App Already Installed!</span>
            </div>
          ) : deferredPrompt ? (
            <Button size="lg" onClick={handleInstall} className="gap-2">
              <Download className="w-5 h-5" />
              Install Odhra App
            </Button>
          ) : isIOS ? (
            <Card className="max-w-md mx-auto">
              <CardHeader>
                <CardTitle className="text-lg">Install on iOS</CardTitle>
                <CardDescription>
                  Follow these steps to install Odhra on your iPhone or iPad
                </CardDescription>
              </CardHeader>
              <CardContent className="text-left space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">1</div>
                  <p className="text-sm">Tap the <strong>Share</strong> button in Safari</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">2</div>
                  <p className="text-sm">Scroll down and tap <strong>"Add to Home Screen"</strong></p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">3</div>
                  <p className="text-sm">Tap <strong>"Add"</strong> to confirm</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" variant="outline" asChild>
                <Link to="/shop">Continue in Browser</Link>
              </Button>
              <p className="text-sm text-muted-foreground">
                Install option will appear when available
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Features Grid */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center mb-12">Why Install the App?</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="text-center">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Device Preview */}
      <div className="bg-muted/50 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-8">Available on All Devices</h2>
          
          <div className="flex items-center justify-center gap-8 flex-wrap">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Smartphone className="w-8 h-8" />
              <span>Mobile</span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <Monitor className="w-8 h-8" />
              <span>Desktop</span>
            </div>
          </div>
          
          <p className="mt-8 text-muted-foreground max-w-lg mx-auto">
            The Odhra app works seamlessly across all your devices. 
            Your cart, wishlist, and account sync automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
