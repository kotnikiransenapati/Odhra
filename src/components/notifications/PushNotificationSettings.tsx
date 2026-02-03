import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { 
  Bell, 
  BellOff, 
  BellRing, 
  Smartphone, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  TestTube
} from 'lucide-react';

export function PushNotificationSettings() {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    isSubscribing,
    subscribe,
    unsubscribe,
    requestPermission,
    sendTestNotification,
  } = usePushNotifications();

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="w-5 h-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Push notifications are not supported in this browser.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
            <AlertCircle className="w-5 h-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Try using a modern browser like Chrome, Firefox, or Edge for push notification support.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Push Notifications
            </CardTitle>
            <CardDescription>
              Get instant updates about orders, offers, and more
            </CardDescription>
          </div>
          <Badge
            variant={isSubscribed ? 'default' : 'secondary'}
            className="gap-1"
          >
            {isSubscribed ? (
              <>
                <CheckCircle className="w-3 h-3" />
                Enabled
              </>
            ) : (
              <>
                <BellOff className="w-3 h-3" />
                Disabled
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Permission Status */}
        {permission === 'denied' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 p-4 bg-destructive/10 text-destructive rounded-lg"
          >
            <AlertCircle className="w-5 h-5 mt-0.5" />
            <div>
              <p className="font-medium">Permission Blocked</p>
              <p className="text-sm opacity-80">
                You've blocked notifications for this site. Please enable them in your browser settings.
              </p>
            </div>
          </motion.div>
        )}

        {/* Main Toggle */}
        <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <BellRing className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Enable Push Notifications</p>
              <p className="text-sm text-muted-foreground">
                Receive alerts even when you're not on the site
              </p>
            </div>
          </div>
          {isLoading || isSubscribing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Switch
              checked={isSubscribed}
              onCheckedChange={handleToggle}
              disabled={permission === 'denied'}
            />
          )}
        </div>

        {/* Notification Types */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground">You'll receive notifications for:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { icon: '📦', label: 'Order updates' },
              { icon: '🚚', label: 'Shipping status' },
              { icon: '🔥', label: 'Flash sales' },
              { icon: '🎁', label: 'Special offers' },
              { icon: '💬', label: 'Support replies' },
              { icon: '⭐', label: 'Review reminders' },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Test Notification */}
        {isSubscribed && (
          <div className="pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={sendTestNotification}
              className="gap-2"
            >
              <TestTube className="w-4 h-4" />
              Send Test Notification
            </Button>
          </div>
        )}

        {/* Device Info */}
        <div className="pt-4 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Smartphone className="w-4 h-4" />
            <span>This device: {getDeviceName()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getDeviceName(): string {
  const ua = navigator.userAgent;
  
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android Device';
  if (/Mac/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows PC';
  if (/Linux/.test(ua)) return 'Linux';
  
  return 'This Browser';
}
