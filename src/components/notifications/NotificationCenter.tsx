import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Settings,
  Package,
  CreditCard,
  Truck,
  Gift,
  AlertCircle,
  MessageSquare,
  X,
  Loader2,
  BellOff,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  useNotifications,
  Notification,
  getNotificationPermission,
  requestNotificationPermission,
  isPushSupported,
} from '@/hooks/useNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const typeIcons: Record<string, React.ElementType> = {
  order: Package,
  payment: CreditCard,
  shipping: Truck,
  promotion: Gift,
  alert: AlertCircle,
  message: MessageSquare,
  general: Bell,
};

const typeColors: Record<string, string> = {
  order: 'text-info bg-info/10',
  payment: 'text-success bg-success/10',
  shipping: 'text-warning bg-warning/10',
  promotion: 'text-accent bg-accent/10',
  alert: 'text-destructive bg-destructive/10',
  message: 'text-info bg-info/10',
  general: 'text-muted-foreground bg-muted',
};

export function NotificationCenter() {
  const { user } = useAuth();
  const {
    notifications,
    isLoading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [permission, setPermission] = useState(getNotificationPermission());

  if (!user) return null;

  const handleEnableNotifications = async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result === 'granted') {
      toast.success('Notifications enabled!');
    } else if (result === 'denied') {
      toast.error('Notifications blocked. Please enable in browser settings.');
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    // Handle navigation based on notification type/data
    if (notification.data?.url) {
      window.location.href = notification.data.url as string;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        >
          <Bell className="w-5 h-5" aria-hidden="true" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1"
              >
                <Badge
                  variant="destructive"
                  className="h-5 min-w-5 px-1 text-xs flex items-center justify-center"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0" align="end">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} new
              </Badge>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Settings className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {permission !== 'granted' && isPushSupported() && (
                <>
                  <DropdownMenuItem onClick={handleEnableNotifications}>
                    <Volume2 className="w-4 h-4 mr-2" />
                    Enable Push Notifications
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem 
                onClick={() => markAllAsRead()}
                disabled={unreadCount === 0}
              >
                <CheckCheck className="w-4 h-4 mr-2" />
                Mark all as read
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => clearAll()}
                disabled={notifications.length === 0}
                className="text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear all
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Permission banner */}
        {permission !== 'granted' && isPushSupported() && (
          <div className="p-3 bg-primary/5 border-b flex items-center gap-3">
            <BellOff className="w-5 h-5 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">
                Enable notifications to never miss updates
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={handleEnableNotifications}>
              Enable
            </Button>
          </div>
        )}

        {/* Notifications list */}
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Bell className="w-8 h-8 text-muted-foreground" />
              </div>
              <h4 className="font-medium mb-1">No notifications yet</h4>
              <p className="text-sm text-muted-foreground">
                We'll notify you when something important happens
              </p>
            </div>
          ) : (
            <div className="divide-y">
              <AnimatePresence mode="popLayout">
                {notifications.map((notification) => {
                  const Icon = typeIcons[notification.type] || Bell;
                  const colorClass = typeColors[notification.type] || typeColors.general;

                  return (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      layout
                      className={`p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                        !notification.is_read ? 'bg-primary/5' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex gap-3">
                        <div className={`w-10 h-10 rounded-full ${colorClass} flex items-center justify-center shrink-0`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm font-medium line-clamp-1 ${!notification.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {notification.title}
                            </p>
                            <div className="flex items-center gap-1 shrink-0">
                              {!notification.is_read && (
                                <div className="w-2 h-2 rounded-full bg-primary" />
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNotification(notification.id);
                                }}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                            {notification.body}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-3 border-t bg-muted/30">
            <Button
              variant="ghost"
              className="w-full text-sm"
              onClick={() => {
                setIsOpen(false);
                window.location.href = '/account/notifications';
              }}
            >
              View all notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
