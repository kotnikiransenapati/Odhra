import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Smartphone, Check, Zap, Bell, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';
import { usePopupSlot, POPUP_PRIORITY } from '@/lib/popupQueue';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function SmartInstallPrompt() {
  const { isEnabled } = useFeatureFlag('smart_install_prompt');
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [pageViews, setPageViews] = useState(0);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (!isEnabled) return;
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if dismissed recently
    const dismissedAt = localStorage.getItem('pwa_prompt_dismissed');
    if (dismissedAt) {
      const hoursSinceDismissed = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60);
      if (hoursSinceDismissed < 24) {
        setDismissed(true);
        return;
      }
    }

    // Track page views
    const views = parseInt(sessionStorage.getItem('page_views') || '0') + 1;
    sessionStorage.setItem('page_views', views.toString());
    setPageViews(views);

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show prompt after 3+ page views
      if (views >= 3) {
        setTimeout(() => setShowPrompt(true), 2000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installed
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowPrompt(false);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [isEnabled]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      
      setDeferredPrompt(null);
      setShowPrompt(false);
    } catch (error) {
      console.error('Install error:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem('pwa_prompt_dismissed', Date.now().toString());
  };

  // Wait in the global popup queue so we never overlap higher-priority popups.
  const canShow = usePopupSlot('install-prompt', POPUP_PRIORITY.INSTALL_PROMPT, showPrompt);

  if (!isEnabled || isInstalled || dismissed || !deferredPrompt) {
    return null;
  }

  const benefits = [
    { icon: Zap, text: 'Faster Experience' },
    { icon: Bell, text: 'Push Notifications' },
    { icon: Wifi, text: 'Works Offline' },
  ];

  return (
    <AnimatePresence>
      {canShow && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/50 backdrop-blur-sm z-50"
            onClick={handleDismiss}
          />

          {/* Prompt Card */}
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-[400px] z-50"
          >
            <Card className="glass border-accent/20 shadow-2xl overflow-hidden">
              {/* Gradient Header */}
              <div className="bg-gradient-to-r from-accent to-primary p-4 text-accent-foreground">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-accent-foreground/20 flex items-center justify-center">
                      <Smartphone className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold">Install Odhra App</h3>
                      <p className="text-sm text-accent-foreground/80">Shop faster, anytime</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDismiss}
                    className="text-accent-foreground hover:bg-accent-foreground/20"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              <CardContent className="p-4">
                {/* Benefits */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {benefits.map((benefit, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex flex-col items-center gap-1 p-2 rounded-lg bg-secondary/50"
                    >
                      <benefit.icon className="w-5 h-5 text-accent" />
                      <span className="text-[10px] text-center text-muted-foreground">
                        {benefit.text}
                      </span>
                    </motion.div>
                  ))}
                </div>

                {/* Install Button */}
                <Button
                  onClick={handleInstall}
                  className="w-full bg-gradient-to-r from-accent to-primary hover:opacity-90"
                  size="lg"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Install Now
                </Button>

                <p className="text-[10px] text-center text-muted-foreground mt-3">
                  No app store needed • Takes 2 seconds
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
