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
            className="fixed bottom-0 left-0 right-0 z-[100] p-4 md:p-6"
          >
            <div className="max-w-4xl mx-auto">
              <div className="glass rounded-2xl border border-border/50 shadow-2xl overflow-hidden">
                {/* Header bar */}
                <div className="bg-gradient-to-r from-primary/10 to-accent/10 px-6 py-3 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <Cookie className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-sm">Cookie Preferences</span>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                    {/* Content */}
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2">
                        We value your privacy 🔒
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        We use cookies to enhance your browsing experience, serve personalized 
                        content, and analyze our traffic. By clicking "Accept All", you consent 
                        to our use of cookies.
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                      <Button
                        variant="outline"
                        onClick={() => setShowSettings(true)}
                        className="gap-2"
                      >
                        <Settings className="w-4 h-4" />
                        Customize
                      </Button>
                      <Button
                        variant="outline"
                        onClick={rejectNonEssential}
                        className="gap-2"
                      >
                        <X className="w-4 h-4" />
                        Reject All
                      </Button>
                      <Button
                        onClick={acceptAll}
                        className="gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90"
                      >
                        <Check className="w-4 h-4" />
                        Accept All
                      </Button>
                    </div>
                  </div>
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
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                  <ChartBar className="w-5 h-5 text-blue-500" />
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
                <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                  <Megaphone className="w-5 h-5 text-orange-500" />
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
