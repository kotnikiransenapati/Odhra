import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, BellRing, Smartphone, Shield, Gift, X } from 'lucide-react';
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

/**
 * Persistent notification re-prompting strategy:
 * - First dismissal: re-prompt after 1 day
 * - Second dismissal: re-prompt after 3 days
 * - Third dismissal: re-prompt after 7 days
 * - Fourth+: re-prompt every 14 days
 * 
 * Also shows a subtle inline banner between dialog prompts
 * after 2+ page views per session.
 */

const STORAGE_KEY = 'notification_prompt_state';
const PROMPT_DELAY_MS = 5000; // 5s after page load
const MIN_PAGE_VIEWS_FOR_BANNER = 3;

interface PromptState {
  dismissCount: number;
  lastDismissedAt: number; // timestamp
  permanentlyDismissed: boolean;
}

function getPromptState(): PromptState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { dismissCount: 0, lastDismissedAt: 0, permanentlyDismissed: false };
}

function savePromptState(state: PromptState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function getCooldownMs(dismissCount: number): number {
  if (dismissCount <= 0) return 0;
  if (dismissCount === 1) return 1 * 24 * 60 * 60 * 1000;  // 1 day
  if (dismissCount === 2) return 3 * 24 * 60 * 60 * 1000;  // 3 days
  if (dismissCount === 3) return 7 * 24 * 60 * 60 * 1000;  // 7 days
  return 14 * 24 * 60 * 60 * 1000; // 14 days
}

function shouldShowPrompt(): boolean {
  if (!isPushSupported()) return false;
  
  const permission = getNotificationPermission();
  // Already granted or hard-denied by browser
  if (permission === 'granted' || permission === 'denied') return false;

  const state = getPromptState();
  if (state.permanentlyDismissed) return false;

  // First time ever - show it
  if (state.dismissCount === 0) return true;

  // Check cooldown
  const cooldown = getCooldownMs(state.dismissCount);
  const elapsed = Date.now() - state.lastDismissedAt;
  return elapsed >= cooldown;
}

// Track page views this session for the inline banner
const SESSION_VIEWS_KEY = 'notification_session_views';
function getSessionViews(): number {
  try {
    return parseInt(sessionStorage.getItem(SESSION_VIEWS_KEY) || '0', 10);
  } catch { return 0; }
}
function incrementSessionViews() {
  try {
    const views = getSessionViews() + 1;
    sessionStorage.setItem(SESSION_VIEWS_KEY, String(views));
    return views;
  } catch { return 1; }
}

export function NotificationPermissionPrompt() {
  const [showDialog, setShowDialog] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);

  useEffect(() => {
    if (!isPushSupported()) return;

    const currentPermission = getNotificationPermission();
    setPermission(currentPermission);
    if (currentPermission !== 'default') return;

    const views = incrementSessionViews();
    const state = getPromptState();

    if (shouldShowPrompt()) {
      // Show full dialog after delay
      const timer = setTimeout(() => {
        setShowDialog(true);
      }, PROMPT_DELAY_MS);
      return () => clearTimeout(timer);
    } else if (!state.permanentlyDismissed && views >= MIN_PAGE_VIEWS_FOR_BANNER) {
      // Show subtle inline banner if they've browsed enough this session
      setShowBanner(true);
    }
  }, []);

  const handleEnable = async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    setShowDialog(false);
    setShowBanner(false);

    if (result === 'granted') {
      // Clear dismiss state on success
      savePromptState({ dismissCount: 0, lastDismissedAt: 0, permanentlyDismissed: false });
      toast.success("Notifications enabled! You'll now receive updates.");
    } else if (result === 'denied') {
      savePromptState({ dismissCount: 99, lastDismissedAt: Date.now(), permanentlyDismissed: true });
      toast.error('Notifications blocked. You can enable them in your browser settings.');
    }
  };

  const handleDismiss = () => {
    const state = getPromptState();
    savePromptState({
      dismissCount: state.dismissCount + 1,
      lastDismissedAt: Date.now(),
      permanentlyDismissed: false,
    });
    setShowDialog(false);
  };

  const handlePermanentDismiss = () => {
    savePromptState({ dismissCount: 99, lastDismissedAt: Date.now(), permanentlyDismissed: true });
    setShowDialog(false);
    setShowBanner(false);
  };

  const handleBannerEnable = async () => {
    await handleEnable();
  };

  const handleBannerDismiss = () => {
    setShowBanner(false);
  };

  if (permission !== 'default') return null;

  return (
    <>
      {/* Subtle inline banner - shown between dialog re-prompts */}
      {showBanner && !showDialog && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground px-4 py-2.5 flex items-center justify-between gap-3 shadow-lg"
        >
          <div className="flex items-center gap-2 min-w-0">
            <BellRing className="w-4 h-4 shrink-0" />
            <p className="text-sm font-medium truncate">
              🔔 Enable notifications for exclusive deals & order updates
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleBannerEnable}
              className="h-7 text-xs"
            >
              Enable
            </Button>
            <button
              onClick={handleBannerDismiss}
              className="p-1 hover:bg-primary-foreground/10 rounded"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Full dialog prompt */}
      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) handleDismiss(); }}>
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
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Real-time Order Updates</p>
                  <p className="text-xs text-muted-foreground">Know when your order ships & arrives</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Gift className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="font-medium text-sm">Exclusive Offers</p>
                  <p className="text-xs text-muted-foreground">Be first to know about flash sales</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="font-medium text-sm">Security Alerts</p>
                  <p className="text-xs text-muted-foreground">Stay safe with account activity alerts</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
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
            {getPromptState().dismissCount >= 2 && (
              <button
                onClick={handlePermanentDismiss}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors text-center py-1"
              >
                Don't ask me again
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
