import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useEmailPreferences } from '@/hooks/useEmailPreferences';
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
} from 'lucide-react';

const preferenceItems = [
  {
    key: 'order_updates',
    label: 'Order Updates',
    description: 'Get notified when your order status changes',
    icon: Package,
  },
  {
    key: 'shipping_updates',
    label: 'Shipping Updates',
    description: 'Receive tracking updates and delivery notifications',
    icon: Truck,
  },
  {
    key: 'promotional_emails',
    label: 'Promotional Emails',
    description: 'Special offers, discounts, and flash sales',
    icon: Tag,
  },
  {
    key: 'product_recommendations',
    label: 'Product Recommendations',
    description: 'Personalized product suggestions based on your interests',
    icon: Star,
  },
  {
    key: 'abandoned_cart_reminders',
    label: 'Cart Reminders',
    description: 'Reminders about items left in your cart',
    icon: ShoppingCart,
  },
  {
    key: 'review_reminders',
    label: 'Review Reminders',
    description: 'Prompts to review products you\'ve purchased',
    icon: MessageSquare,
  },
  {
    key: 'newsletter',
    label: 'Newsletter',
    description: 'Weekly digest of new arrivals and marketplace updates',
    icon: Newspaper,
  },
];

export default function EmailPreferences() {
  const { preferences, isLoading, updatePreferences, isUpdating } = useEmailPreferences();
  const [localPrefs, setLocalPrefs] = React.useState<Record<string, boolean>>({});
  const [hasChanges, setHasChanges] = React.useState(false);

  React.useEffect(() => {
    if (preferences) {
      const prefs: Record<string, boolean> = {};
      preferenceItems.forEach(item => {
        prefs[item.key] = (preferences as any)[item.key] ?? true;
      });
      setLocalPrefs(prefs);
    }
  }, [preferences]);

  const handleToggle = (key: string, value: boolean) => {
    setLocalPrefs(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    await updatePreferences(localPrefs);
    setHasChanges(false);
  };

  const handleUnsubscribeAll = async () => {
    const allOff: Record<string, boolean> = {};
    preferenceItems.forEach(item => {
      allOff[item.key] = false;
    });
    setLocalPrefs(allOff);
    await updatePreferences(allOff);
    setHasChanges(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Button variant="ghost" asChild className="mb-4">
              <Link to="/settings" className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Back to Settings
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <Mail className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Email Preferences</h1>
                <p className="text-muted-foreground">
                  Manage which emails you receive from us
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notification Preferences</CardTitle>
                <CardDescription>
                  Choose which types of emails you'd like to receive
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4].map(i => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {preferenceItems.map((item, index) => {
                      const Icon = item.icon;
                      return (
                        <motion.div
                          key={item.key}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center justify-between p-4 rounded-xl hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                              <Icon className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium">{item.label}</p>
                              <p className="text-sm text-muted-foreground">
                                {item.description}
                              </p>
                            </div>
                          </div>
                          <Switch
                            checked={localPrefs[item.key] ?? true}
                            onCheckedChange={(checked) => handleToggle(item.key, checked)}
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
                    className="flex-1 gap-2"
                  >
                    {isUpdating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save Preferences
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleUnsubscribeAll}
                    disabled={isUpdating}
                    className="text-destructive hover:text-destructive"
                  >
                    Unsubscribe from All
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
