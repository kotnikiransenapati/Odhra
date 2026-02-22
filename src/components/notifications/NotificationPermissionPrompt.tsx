import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, BellRing, Smartphone, Shield, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  getNotificationPermission,
  requestNotificationPermission,
  isPushSupported,
} from '@/hooks/useNotifications';
import { toast } from 'sonner';

const SESSION_PROMPT_KEY = 'notification_prompt_shown_this_session';
const PROMPT_DELAY = 3000;

export function NotificationPermissionPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);

  useEffect(() => {
    if (!isPushSupported()) return;

    const currentPermission = getNotificationPermission();
    setPermission(currentPermission);

    // Don't show if already granted or denied
    if (currentPermission !== 'default') return;

    // Only dismiss for this session (sessionStorage clears on tab close)
    const shownThisSession = sessionStorage.getItem(SESSION_PROMPT_KEY);
    if (shownThisSession) return;

    const timer = setTimeout(() => {
      setShowPrompt(true);
      sessionStorage.setItem(SESSION_PROMPT_KEY, '1');
    }, PROMPT_DELAY);

    return () => clearTimeout(timer);
  }, []);

  const handleEnable = async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    setShowPrompt(false);

    if (result === 'granted') {
      toast.success('Notifications enabled! You\'ll now receive updates.');
    } else if (result === 'denied') {
      toast.error('Notifications blocked. You can enable them in your browser settings.');
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (permission !== 'default') return null;

  return (
    <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="mx-auto mb-4"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <BellRing className="w-10 h-10 text-primary" />
              </motion.div>
            </div>
          </motion.div>
          <DialogTitle className="text-xl">Stay in the loop! 🔔</DialogTitle>
          <DialogDescription className="text-base">
            Get instant notifications about orders, exclusive deals, and important updates.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid gap-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="font-medium text-sm">Real-time Order Updates</p>
                <p className="text-xs text-muted-foreground">Know when your order ships & arrives</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Gift className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="font-medium text-sm">Exclusive Offers</p>
                <p className="text-xs text-muted-foreground">Be first to know about flash sales</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="font-medium text-sm">Security Alerts</p>
                <p className="text-xs text-muted-foreground">Stay safe with account activity alerts</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleDismiss}
            className="flex-1"
          >
            Maybe Later
          </Button>
          <Button
            onClick={handleEnable}
            className="flex-1 gap-2 bg-gradient-to-r from-primary to-accent"
          >
            <Bell className="w-4 h-4" />
            Enable Notifications
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
