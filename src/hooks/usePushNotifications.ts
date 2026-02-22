import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

// Check if push notifications are supported
export function isPushSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}

// Get current permission status
export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

interface PushSubscriptionData {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: string;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribing, setIsSubscribing] = useState(false);

  // Check support on mount
  useEffect(() => {
    setIsSupported(isPushSupported());
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Fetch existing subscription
  const { data: subscription, isLoading } = useQuery({
    queryKey: ['push-subscription', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as PushSubscriptionData | null;
    },
    enabled: !!user && isSupported,
  });

  // Request permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      toast.error('Push notifications are not supported in this browser');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        toast.success('Notification permission granted');
        return true;
      } else if (result === 'denied') {
        toast.error('Notification permission denied. Please enable it in your browser settings.');
        return false;
      }
      return false;
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast.error('Failed to request notification permission');
      return false;
    }
  }, [isSupported]);

  // Subscribe to push notifications
  const subscribeMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not authenticated');
      if (!isSupported) throw new Error('Push notifications not supported');

      // Check permission
      if (Notification.permission !== 'granted') {
        const granted = await requestPermission();
        if (!granted) throw new Error('Permission denied');
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;
      
      // Subscribe to push - use a demo VAPID key
      const vapidKey = urlBase64ToUint8Array(
        'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'
      );
      
      const pushSubscription = await (registration as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey.buffer as ArrayBuffer
      });

      const keys = pushSubscription.toJSON().keys;
      if (!keys) throw new Error('Failed to get subscription keys');

      // Save to database
      const { data, error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: pushSubscription.endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          user_agent: navigator.userAgent,
        }, {
          onConflict: 'user_id,endpoint',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['push-subscription'] });
      toast.success('Push notifications enabled');
    },
    onError: (error) => {
      console.error('Subscribe error:', error);
      toast.error('Failed to enable push notifications');
    },
  });

  // Unsubscribe from push notifications
  const unsubscribeMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not authenticated');

      // Unsubscribe from push
      const registration = await navigator.serviceWorker.ready;
      const existingSub = await (registration as any).pushManager.getSubscription();
      if (existingSub) {
        await existingSub.unsubscribe();
      }

      // Delete from database
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['push-subscription'] });
      toast.success('Push notifications disabled');
    },
    onError: () => {
      toast.error('Failed to disable push notifications');
    },
  });

  // Send test notification
  const sendTestNotification = useCallback(() => {
    if (Notification.permission === 'granted') {
      new Notification('Test Notification', {
        body: 'Push notifications are working correctly!',
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: 'test-notification',
      });
    }
  }, []);

  return {
    isSupported,
    permission,
    isSubscribed: !!subscription,
    subscription,
    isLoading,
    isSubscribing: subscribeMutation.isPending,
    subscribe: subscribeMutation.mutateAsync,
    unsubscribe: unsubscribeMutation.mutateAsync,
    requestPermission,
    sendTestNotification,
  };
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Get device name from user agent
function getDeviceName(): string {
  const ua = navigator.userAgent;
  
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) {
    const match = ua.match(/Android.*?([A-Za-z0-9\s]+)\sBuild/);
    return match ? match[1].trim() : 'Android Device';
  }
  if (/Mac/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows PC';
  if (/Linux/.test(ua)) return 'Linux';
  
  return 'Unknown Device';
}

// Admin hook to send push notifications
export function useAdminPushNotifications() {
  const sendPushMutation = useMutation({
    mutationFn: async (params: {
      userId?: string;
      segment?: 'all' | 'customers' | 'vendors';
      title: string;
      body: string;
      url?: string;
      data?: Record<string, unknown>;
    }) => {
      // For now, we'll use the notification system
      if (params.userId) {
        await supabase.from('notifications').insert({
          user_id: params.userId,
          title: params.title,
          body: params.body,
          type: 'push',
          data: (params.data || null) as Json,
        });
      } else {
        // Get users by segment
        let userIds: string[] = [];
        
        if (params.segment === 'vendors') {
          const { data: vendorRoles } = await supabase
            .from('user_roles')
            .select('user_id')
            .eq('role', 'vendor');
          
          if (vendorRoles) {
            userIds = vendorRoles.map(v => v.user_id);
          }
        } else {
          const { data: profiles } = await supabase.from('profiles').select('id');
          if (profiles) {
            userIds = profiles.map(p => p.id);
          }
        }
        
        if (userIds.length > 0) {
          const notifications = userIds.map(userId => ({
            user_id: userId,
            title: params.title,
            body: params.body,
            type: 'push',
            data: (params.data || null) as Json,
          }));
          
          await supabase.from('notifications').insert(notifications);
        }
      }
      
      return { success: true };
    },
    onSuccess: () => {
      toast.success('Push notification sent');
    },
    onError: () => {
      toast.error('Failed to send push notification');
    },
  });

  return {
    sendPush: sendPushMutation.mutateAsync,
    isSending: sendPushMutation.isPending,
  };
}
