import React from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useEmailPreferences } from '@/hooks/useEmailPreferences';
import { NotificationDigestPreferences } from '@/components/account/NotificationDigestPreferences';
import { haptic } from '@/lib/haptics';
import {
  ArrowLeft,
  Mail,
  Package,
  Truck,
  Tag,
  Star,
  ShoppingCart,
  MessageSquare,
  Newspaper,
  Save,
  Loader2,
  BellOff,
} from 'lucide-react';

type PrefKey =
  | 'order_updates'
  | 'shipping_updates'
  | 'promotional_emails'
  | 'product_recommendations'
  | 'abandoned_cart_reminders'
  | 'review_reminders'
  | 'newsletter';

const preferenceItems: Array<{
  key: PrefKey;
  label: string;
  description: string;
  icon: React.ElementType;
  essential?: boolean;
}> = [
  { key: 'order_updates', label: 'Order Updates', description: 'Get notified when your order status changes', icon: Package, essential: true },
  { key: 'shipping_updates', label: 'Shipping Updates', description: 'Receive tracking updates and delivery notifications', icon: Truck, essential: true },
  { key: 'promotional_emails', label: 'Promotional Emails', description: 'Special offers, discounts, and flash sales', icon: Tag },
  { key: 'product_recommendations', label: 'Product Recommendations', description: 'Personalized product suggestions based on your interests', icon: Star },
  { key: 'abandoned_cart_reminders', label: 'Cart Reminders', description: 'Reminders about items left in your cart', icon: ShoppingCart },
  { key: 'review_reminders', label: 'Review Reminders', description: "Prompts to review products you've purchased", icon: MessageSquare },
  { key: 'newsletter', label: 'Newsletter', description: 'Weekly digest of new arrivals and marketplace updates', icon: Newspaper },
];

export default function EmailPreferences() {
  const { preferences, isLoading, updatePreferences, isUpdating } = useEmailPreferences();
  const [localPrefs, setLocalPrefs] = React.useState<Record<PrefKey, boolean>>({} as Record<PrefKey, boolean>);
  const [savedPrefs, setSavedPrefs] = React.useState<Record<PrefKey, boolean>>({} as Record<PrefKey, boolean>);

  React.useEffect(() => {
    if (preferences) {
      const prefs = {} as Record<PrefKey, boolean>;
      preferenceItems.forEach((item) => {
        prefs[item.key] = (preferences as any)[item.key] ?? true;
      });
      setLocalPrefs(prefs);
      setSavedPrefs(prefs);
    }
  }, [preferences]);

  const hasChanges = React.useMemo(
    () => preferenceItems.some((i) => localPrefs[i.key] !== savedPrefs[i.key]),
    [localPrefs, savedPrefs]
  );

  const enabledCount = React.useMemo(
    () => preferenceItems.filter((i) => localPrefs[i.key]).length,
    [localPrefs]
  );

  const handleToggle = (key: PrefKey, value: boolean) => {
    haptic('selection');
    setLocalPrefs((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    haptic('medium');
    await updatePreferences(localPrefs);
    setSavedPrefs(localPrefs);
  };

  const handleUnsubscribeAll = async () => {
    haptic('warning');
    const allOff = {} as Record<PrefKey, boolean>;
    preferenceItems.forEach((item) => {
      // Keep essential (transactional) emails on for legal/operational reasons
      allOff[item.key] = !!item.essential;
    });
    setLocalPrefs(allOff);
    await updatePreferences(allOff);
    setSavedPrefs(allOff);
  };

  const handleReset = () => {
    haptic('light');
    setLocalPrefs(savedPrefs);
  };

  return (
    <div className="min-h-dvh bg-background pb-20 lg:pb-0">
      <a
        href="#email-prefs-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-primary focus:text-primary-foreground focus:px-3 focus:py-2 focus:rounded-md"
      >
        Skip to main content
      </a>
      <Navbar />

      <main
        id="email-prefs-main"
        tabIndex={-1}
        className="pt-24 pb-16 px-4 outline-none"
        aria-labelledby="email-prefs-heading"
      >
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="mb-8"
          >
            <Button variant="ghost" asChild className="mb-4" onClick={() => haptic('light')}>
              <Link to="/settings" className="gap-2">
                <ArrowLeft className="w-4 h-4" aria-hidden /> Back to Settings
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                <Mail className="w-6 h-6 text-accent" aria-hidden />
              </div>
              <div className="min-w-0">
                <h1 id="email-prefs-heading" className="text-2xl font-bold">
                  Email Preferences
                </h1>
                <p className="text-muted-foreground" aria-live="polite">
                  {isLoading
                    ? 'Loading your preferences...'
                    : `${enabledCount} of ${preferenceItems.length} categories enabled`}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 400, damping: 30 }}
          >
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-lg">Notification Preferences</CardTitle>
                <CardDescription>
                  Choose which types of emails you'd like to receive. Order and shipping updates are essential and always sent.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4" aria-busy="true">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1" role="group" aria-labelledby="email-prefs-heading">
                    {preferenceItems.map((item, index) => {
                      const Icon = item.icon;
                      const checked = localPrefs[item.key] ?? true;
                      const switchId = `pref-${item.key}`;
                      const descId = `pref-${item.key}-desc`;
                      return (
                        <motion.div
                          key={item.key}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.04, type: 'spring', stiffness: 400, damping: 30 }}
                          className="flex items-center justify-between p-4 rounded-xl hover:bg-muted/50 transition-colors min-h-[64px]"
                        >
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                              <Icon className="w-5 h-5 text-muted-foreground" aria-hidden />
                            </div>
                            <div className="min-w-0">
                              <label htmlFor={switchId} className="font-medium flex items-center gap-2 cursor-pointer">
                                {item.label}
                                {item.essential && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                    Essential
                                  </Badge>
                                )}
                              </label>
                              <p id={descId} className="text-sm text-muted-foreground">
                                {item.description}
                              </p>
                            </div>
                          </div>
                          <Switch
                            id={switchId}
                            checked={checked}
                            disabled={item.essential}
                            aria-describedby={descId}
                            onCheckedChange={(c) => handleToggle(item.key, c)}
                            className="ml-3"
                          />
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 mt-8 pt-6 border-t">
                  <Button
                    onClick={handleSave}
                    disabled={!hasChanges || isUpdating}
                    className="flex-1 gap-2 min-h-11"
                  >
                    {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Save className="w-4 h-4" aria-hidden />}
                    Save Preferences
                  </Button>
                  <AnimatePresence>
                    {hasChanges && (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                        <Button variant="ghost" onClick={handleReset} disabled={isUpdating} className="min-h-11">
                          Reset
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        disabled={isUpdating}
                        onClick={() => haptic('light')}
                        className="text-destructive hover:text-destructive min-h-11 gap-2"
                      >
                        <BellOff className="w-4 h-4" aria-hidden /> Unsubscribe All
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Unsubscribe from marketing emails?</AlertDialogTitle>
                        <AlertDialogDescription>
                          You'll still receive essential order and shipping updates, but all promotional, newsletter and recommendation emails will be turned off.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleUnsubscribeAll}>
                          Unsubscribe
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-6"
          >
            <NotificationDigestPreferences />
          </motion.div>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}
