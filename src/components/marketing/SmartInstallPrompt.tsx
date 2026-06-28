import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Smartphone, Zap, Bell, Wifi, Share, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';
import { usePopupSlot, POPUP_PRIORITY } from '@/lib/popupQueue';
import { detectInstallPlatform, isStandaloneDisplay, logInstallEvent } from '@/lib/pwa/install';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'pwa_prompt_dismissed';
const DISMISS_HOURS = 24;
const MIN_PAGE_VIEWS = 3;

export function SmartInstallPrompt() {
  const { isEnabled } = useFeatureFlag('smart_install_prompt');
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform] = useState(() => (typeof window !== 'undefined' ? detectInstallPlatform() : 'unsupported' as const));

  useEffect(() => {
    if (!isEnabled) return;
    if (isStandaloneDisplay()) {
      setIsInstalled(true);
      return;
    }

    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const hours = (Date.now() - parseInt(dismissedAt)) / 3_600_000;
      if (hours < DISMISS_HOURS) {
        setDismissed(true);
        return;
      }
    }

    const views = parseInt(sessionStorage.getItem('page_views') || '0') + 1;
    sessionStorage.setItem('page_views', views.toString());

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (views >= MIN_PAGE_VIEWS) {
        setTimeout(() => {
          setShowPrompt(true);
          logInstallEvent('prompt_shown', { source: 'beforeinstallprompt' });
        }, 2000);
      }
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      logInstallEvent('installed');
    };
    window.addEventListener('appinstalled', handleInstalled);

    // iOS Safari never fires beforeinstallprompt — show our custom A2HS card.
    if (platform === 'ios-safari' && views >= MIN_PAGE_VIEWS) {
      setTimeout(() => {
        setShowPrompt(true);
        logInstallEvent('ios_instructions_shown');
      }, 2500);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, [isEnabled, platform]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      logInstallEvent(outcome === 'accepted' ? 'prompt_accepted' : 'prompt_dismissed');
      if (outcome === 'accepted') setIsInstalled(true);
      setDeferredPrompt(null);
      setShowPrompt(false);
    } catch (error) {
      console.error('Install error:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    logInstallEvent('prompt_dismissed', { reason: 'user_close' });
  };

  const canShow = usePopupSlot('install-prompt', POPUP_PRIORITY.INSTALL_PROMPT, showPrompt);

  const isIos = platform === 'ios-safari';
  if (!isEnabled || isInstalled || dismissed) return null;
  if (!isIos && !deferredPrompt) return null;

  const benefits = [
    { icon: Zap, text: 'Faster' },
    { icon: Bell, text: 'Alerts' },
    { icon: Wifi, text: 'Offline' },
  ];

  return (
    <AnimatePresence>
      {canShow && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/50 backdrop-blur-sm z-50"
            onClick={handleDismiss}
          />
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-[400px] z-50"
          >
            <Card className="glass border-accent/20 shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-accent to-primary p-4 text-accent-foreground">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-accent-foreground/20 flex items-center justify-center">
                      <Smartphone className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold">Install Odhra App</h3>
                      <p className="text-sm text-accent-foreground/80">
                        {isIos ? 'Add to your Home Screen' : 'Shop faster, anytime'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDismiss}
                    aria-label="Dismiss install prompt"
                    className="text-accent-foreground hover:bg-accent-foreground/20"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              <CardContent className="p-4">
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

                {isIos ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/40">
                      <span className="font-semibold w-5">1.</span>
                      <span className="flex-1">Tap the Share icon</span>
                      <Share className="w-4 h-4 text-accent" />
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/40">
                      <span className="font-semibold w-5">2.</span>
                      <span className="flex-1">Choose “Add to Home Screen”</span>
                      <Plus className="w-4 h-4 text-accent" />
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/40">
                      <span className="font-semibold w-5">3.</span>
                      <span className="flex-1">Tap “Add” in the top right</span>
                    </div>
                    <Button variant="outline" onClick={handleDismiss} className="w-full mt-2">
                      Got it
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={handleInstall}
                    className="w-full bg-gradient-to-r from-accent to-primary hover:opacity-90"
                    size="lg"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Install Now
                  </Button>
                )}

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
