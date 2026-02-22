import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import {
  Bell,
  BellOff,
  BellRing,
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
  ArrowLeft,
  Loader2,
  Filter,
  Volume2,
  VolumeX,
  Inbox,
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  useNotifications,
  Notification,
  getNotificationPermission,
  requestNotificationPermission,
  isPushSupported,
  usePushSubscription,
} from '@/hooks/useNotifications';
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

const typeColors: Record<string, { icon: string; bg: string }> = {
  order: { icon: 'text-blue-500', bg: 'bg-blue-500/10' },
  payment: { icon: 'text-green-500', bg: 'bg-green-500/10' },
  shipping: { icon: 'text-orange-500', bg: 'bg-orange-500/10' },
  promotion: { icon: 'text-purple-500', bg: 'bg-purple-500/10' },
  alert: { icon: 'text-red-500', bg: 'bg-red-500/10' },
  message: { icon: 'text-cyan-500', bg: 'bg-cyan-500/10' },
  general: { icon: 'text-gray-500', bg: 'bg-gray-500/10' },
};

function groupNotificationsByDate(notifications: Notification[]) {
  const groups: { [key: string]: Notification[] } = {};
  
  notifications.forEach((notification) => {
    const date = new Date(notification.created_at);
    let key: string;
    
    if (isToday(date)) {
      key = 'Today';
    } else if (isYesterday(date)) {
      key = 'Yesterday';
    } else {
      key = format(date, 'MMMM d, yyyy');
    }
    
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(notification);
  });
  
  return groups;
}

export default function Notifications() {
  const {
    notifications,
    isLoading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useNotifications();
  const { isSubscribed, subscribe, unsubscribe, isSubscribing } = usePushSubscription();
  const [activeTab, setActiveTab] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [permission, setPermission] = useState(getNotificationPermission());

  const handleEnableNotifications = async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result === 'granted') {
      // Subscribe to push
      try {
        await subscribe({ endpoint: '', p256dh: '', auth: '' }); // Simplified for demo
        toast.success('Push notifications enabled!');
      } catch {
        toast.error('Failed to enable push notifications');
      }
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'unread' && n.is_read) return false;
    if (typeFilter !== 'all' && n.type !== typeFilter) return false;
    return true;
  });

  const groupedNotifications = groupNotificationsByDate(filteredNotifications);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-24 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Button variant="ghost" asChild className="mb-4">
              <Link to="/account" className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Back to Account
              </Link>
            </Button>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-display-sm md:text-display-md font-bold flex items-center gap-3">
                  <Bell className="w-8 h-8 text-primary" />
                  Notifications
                  {unreadCount > 0 && (
                    <Badge variant="secondary">{unreadCount} unread</Badge>
                  )}
                </h1>
                <p className="text-muted-foreground mt-1">
                  Stay updated on your orders, promotions, and account activity
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => markAllAsRead()}
                  disabled={unreadCount === 0}
                  className="gap-2"
                >
                  <CheckCheck className="w-4 h-4" />
                  Mark all read
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={notifications.length === 0}
                      className="gap-2 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                      Clear all
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear all notifications?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete all your notifications. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => clearAll()}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Clear all
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </motion.div>

          {/* Push Notification Settings */}
          {isPushSupported() && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-6"
            >
              <Card className={permission === 'granted' ? 'border-success/30 bg-success/5' : 'border-primary/30 bg-primary/5'}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        permission === 'granted' ? 'bg-success/20' : 'bg-primary/20'
                      }`}>
                        {permission === 'granted' ? (
                          <BellRing className="w-6 h-6 text-success" />
                        ) : (
                          <BellOff className="w-6 h-6 text-primary" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold">
                          {permission === 'granted' ? 'Push Notifications Enabled' : 'Enable Push Notifications'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {permission === 'granted'
                            ? 'You\'ll receive real-time notifications even when not on the site'
                            : 'Get instant alerts about orders, deals, and important updates'}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={permission === 'granted'}
                      onCheckedChange={async (checked) => {
                        if (checked) {
                          await handleEnableNotifications();
                        } else {
                          await unsubscribe();
                        }
                      }}
                      disabled={isSubscribing || permission === 'denied'}
                    />
                  </div>
                  {permission === 'denied' && (
                    <p className="text-sm text-destructive mt-3">
                      Notifications are blocked. Please enable them in your browser settings.
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
                    <TabsList className="grid grid-cols-2 w-full sm:w-auto">
                      <TabsTrigger value="all" className="gap-2">
                        <Bell className="w-4 h-4" />
                        All
                      </TabsTrigger>
                      <TabsTrigger value="unread" className="gap-2">
                        <Badge variant="secondary" className="h-5 px-1.5">
                          {unreadCount}
                        </Badge>
                        Unread
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="order">Orders</SelectItem>
                      <SelectItem value="shipping">Shipping</SelectItem>
                      <SelectItem value="payment">Payments</SelectItem>
                      <SelectItem value="promotion">Promotions</SelectItem>
                      <SelectItem value="message">Messages</SelectItem>
                      <SelectItem value="alert">Alerts</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Notifications List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : filteredNotifications.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <div className="w-20 h-20 rounded-full bg-muted mx-auto flex items-center justify-center mb-6">
                    <Inbox className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    {activeTab === 'unread' ? 'All caught up!' : 'No notifications yet'}
                  </h3>
                  <p className="text-muted-foreground">
                    {activeTab === 'unread'
                      ? 'You\'ve read all your notifications'
                      : 'We\'ll notify you when something important happens'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedNotifications).map(([date, dateNotifications]) => (
                  <div key={date}>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3 px-1">
                      {date}
                    </h3>
                    <div className="space-y-2">
                      <AnimatePresence mode="popLayout">
                        {dateNotifications.map((notification) => {
                          const Icon = typeIcons[notification.type] || Bell;
                          const colors = typeColors[notification.type] || typeColors.general;

                          return (
                            <motion.div
                              key={notification.id}
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, x: -100 }}
                              layout
                            >
                              <Card
                                className={`cursor-pointer transition-all hover:shadow-md ${
                                  !notification.is_read ? 'border-primary/30 bg-primary/5' : ''
                                }`}
                                onClick={() => {
                                  if (!notification.is_read) {
                                    markAsRead(notification.id);
                                  }
                                }}
                              >
                                <CardContent className="p-4">
                                  <div className="flex gap-4">
                                    <div className={`w-12 h-12 rounded-full ${colors.bg} flex items-center justify-center shrink-0`}>
                                      <Icon className={`w-6 h-6 ${colors.icon}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 mb-1">
                                            <p className={`font-semibold ${!notification.is_read ? '' : 'text-muted-foreground'}`}>
                                              {notification.title}
                                            </p>
                                            {!notification.is_read && (
                                              <div className="w-2 h-2 rounded-full bg-primary" />
                                            )}
                                          </div>
                                          <p className="text-sm text-muted-foreground line-clamp-2">
                                            {notification.body}
                                          </p>
                                          <p className="text-xs text-muted-foreground mt-2">
                                            {format(new Date(notification.created_at), 'h:mm a')}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          {!notification.is_read && (
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-8 w-8"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                markAsRead(notification.id);
                                              }}
                                            >
                                              <Check className="w-4 h-4" />
                                            </Button>
                                          )}
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive hover:text-destructive"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              deleteNotification(notification.id);
                                            }}
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
