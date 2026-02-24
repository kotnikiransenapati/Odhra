import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, Settings, Check, X, Shield, ChartBar, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useCookieConsent, CookiePreferences } from '@/hooks/useCookieConsent';

export function CookieConsentBanner() {
  const {
    showBanner,
    setShowBanner,
    acceptAll,
    rejectNonEssential,
    saveCustom,
    preferences,
  } = useCookieConsent();
  const [showSettings, setShowSettings] = useState(false);
  const [customPreferences, setCustomPreferences] = useState<CookiePreferences>(preferences);

  if (!showBanner) return null;

  const handleSaveCustom = () => {
    saveCustom(customPreferences);
    setShowSettings(false);
  };

  return (
    <>
      <AnimatePresence>
        {showBanner && !showSettings && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-[88px] lg:bottom-4 left-4 right-4 z-[60]"
          >
            <div className="max-w-2xl mx-auto">
              <div className="glass rounded-2xl border border-border/50 shadow-2xl p-4 relative">
                <button
                  onClick={rejectNonEssential}
                  className="absolute top-2 right-2 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  aria-label="Close cookie banner"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-3 mb-3 pr-6">
                  <Cookie className="w-5 h-5 text-accent shrink-0" />
                  <p className="text-sm text-muted-foreground leading-snug">
                    We use cookies to enhance your experience. 
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowSettings(true)}
                    className="text-xs"
                  >
                    <Settings className="w-3.5 h-3.5 mr-1" />
                    Settings
                  </Button>
                  <div className="flex-1" />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={rejectNonEssential}
                    className="text-xs"
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    onClick={acceptAll}
                    className="text-xs"
                  >
                    <Check className="w-3.5 h-3.5 mr-1" />
                    Accept All
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cookie className="w-5 h-5 text-primary" />
              Cookie Settings
            </DialogTitle>
            <DialogDescription>
              Manage your cookie preferences. You can enable or disable different types of cookies below.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Essential Cookies */}
            <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-muted/50 border">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <Label className="text-base font-medium">Essential Cookies</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Required for the website to function properly. Cannot be disabled.
                  </p>
                </div>
              </div>
              <Switch checked disabled className="data-[state=checked]:bg-primary" />
            </div>

            {/* Analytics Cookies */}
            <div className="flex items-start justify-between gap-4 p-4 rounded-xl border hover:bg-muted/30 transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
                  <ChartBar className="w-5 h-5 text-info" />
                </div>
                <div>
                  <Label htmlFor="analytics" className="text-base font-medium cursor-pointer">
                    Analytics Cookies
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Help us understand how visitors interact with our website to improve performance.
                  </p>
                </div>
              </div>
              <Switch
                id="analytics"
                checked={customPreferences.analytics}
                onCheckedChange={(checked) =>
                  setCustomPreferences(prev => ({ ...prev, analytics: checked }))
                }
              />
            </div>

            {/* Marketing Cookies */}
            <div className="flex items-start justify-between gap-4 p-4 rounded-xl border hover:bg-muted/30 transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                  <Megaphone className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <Label htmlFor="marketing" className="text-base font-medium cursor-pointer">
                    Marketing Cookies
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Used to deliver personalized advertisements and track marketing campaign effectiveness.
                  </p>
                </div>
              </div>
              <Switch
                id="marketing"
                checked={customPreferences.marketing}
                onCheckedChange={(checked) =>
                  setCustomPreferences(prev => ({ ...prev, marketing: checked }))
                }
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setShowSettings(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveCustom}
              className="flex-1 bg-gradient-to-r from-primary to-accent"
            >
              Save Preferences
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
