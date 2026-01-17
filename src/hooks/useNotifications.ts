import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useEffect } from 'react';
import type { Json } from '@/integrations/supabase/types';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: string;
}

// Check if push notifications are supported
export function isPushSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}

// Get current permission status
export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

// Request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    toast.error('Notifications are not supported in this browser');
    return 'denied';
  }
  
  const permission = await Notification.requestPermission();
  return permission;
}

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Set up real-time subscription for notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('user-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notification = payload.new as Notification;
          queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
          
          // Show browser notification if permission granted
          if (Notification.permission === 'granted') {
            new Notification(notification.title, {
              body: notification.body,
              icon: '/pwa-192x192.png',
              badge: '/pwa-192x192.png',
            });
          }
          
          // Show toast
          toast.info(notification.title, {
            description: notification.body,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!user,
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      toast.success('All notifications marked as read');
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      toast.success('All notifications cleared');
    },
  });

  return {
    notifications,
    isLoading,
    unreadCount,
    markAsRead: markAsReadMutation.mutateAsync,
    markAllAsRead: markAllAsReadMutation.mutateAsync,
    deleteNotification: deleteNotificationMutation.mutateAsync,
    clearAll: clearAllMutation.mutateAsync,
  };
}

export function usePushSubscription() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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
      return data as PushSubscription | null;
    },
    enabled: !!user,
  });

  const subscribeMutation = useMutation({
    mutationFn: async (sub: { endpoint: string; p256dh: string; auth: string }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: sub.endpoint,
          p256dh: sub.p256dh,
          auth: sub.auth,
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
      queryClient.invalidateQueries({ queryKey: ['push-subscription', user?.id] });
      toast.success('Push notifications enabled');
    },
    onError: () => {
      toast.error('Failed to enable push notifications');
    },
  });

  const unsubscribeMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['push-subscription', user?.id] });
      toast.success('Push notifications disabled');
    },
  });

  return {
    subscription,
    isLoading,
    isSubscribed: !!subscription,
    subscribe: subscribeMutation.mutateAsync,
    unsubscribe: unsubscribeMutation.mutateAsync,
    isSubscribing: subscribeMutation.isPending,
  };
}

// Admin hook to send notifications
export function useAdminNotifications() {
  const queryClient = useQueryClient();

  const sendNotificationMutation = useMutation({
    mutationFn: async (notification: {
      userId: string;
      title: string;
      body: string;
      type?: string;
      data?: Record<string, unknown>;
    }) => {
      const insertData = {
        user_id: notification.userId,
        title: notification.title,
        body: notification.body,
        type: notification.type || 'general',
        data: (notification.data || null) as Json,
      };

      const { error } = await supabase
        .from('notifications')
        .insert(insertData);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Notification sent');
    },
    onError: () => {
      toast.error('Failed to send notification');
    },
  });

  const sendBulkNotificationsMutation = useMutation({
    mutationFn: async (params: {
      userIds: string[];
      title: string;
      body: string;
      type?: string;
      data?: Record<string, unknown>;
    }) => {
      const notifications = params.userIds.map(userId => ({
        user_id: userId,
        title: params.title,
        body: params.body,
        type: params.type || 'general',
        data: (params.data || null) as Json,
      }));

      const { error } = await supabase
        .from('notifications')
        .insert(notifications);

      if (error) throw error;
      return notifications.length;
    },
    onSuccess: (count) => {
      toast.success(`Notifications sent to ${count} users`);
    },
    onError: () => {
      toast.error('Failed to send notifications');
    },
  });

  return {
    sendNotification: sendNotificationMutation.mutateAsync,
    sendBulkNotifications: sendBulkNotificationsMutation.mutateAsync,
    isSending: sendNotificationMutation.isPending || sendBulkNotificationsMutation.isPending,
  };
}
