import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { MessageCircle, Phone, Bell, ShoppingCart, Truck, RotateCcw, Megaphone, CheckCircle, Shield } from 'lucide-react';
import { useWhatsAppPreferences, useUpdateWhatsAppPreferences, useOptOutWhatsApp } from '@/hooks/useWhatsAppPreferences';

export const WhatsAppSettings = () => {
  const { data: preferences, isLoading } = useWhatsAppPreferences();
  const updatePrefs = useUpdateWhatsAppPreferences();
  const optOut = useOptOutWhatsApp();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const isOptedIn = preferences && !preferences.opted_out_at;

  const handleToggle = (key: string, value: boolean) => {
    updatePrefs.mutate({
      phone_number: preferences?.phone_number || phoneNumber,
      [key]: value,
    });
  };

  const handleOptIn = () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      toast.error('Please enter a valid phone number with country code');
      return;
    }
    updatePrefs.mutate({
      phone_number: phoneNumber,
      order_notifications: true,
      shipping_notifications: true,
      return_notifications: true,
      promotional_messages: false,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">Loading WhatsApp settings...</CardContent>
      </Card>
    );
  }

  if (!preferences || preferences.opted_out_at) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-500" />
            WhatsApp Notifications
          </CardTitle>
          <CardDescription>Get real-time order updates, shipping alerts, and exclusive offers on WhatsApp</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <ShoppingCart className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Order Updates</p>
                <p className="text-xs text-muted-foreground">Confirmation & status changes</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Truck className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Shipping Alerts</p>
                <p className="text-xs text-muted-foreground">Real-time tracking updates</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Megaphone className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Exclusive Offers</p>
                <p className="text-xs text-muted-foreground">Deals & flash sale alerts</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Your WhatsApp Number</Label>
            <div className="flex gap-2">
              <Input
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                placeholder="+91 98765 43210"
                className="flex-1"
              />
              <Button onClick={handleOptIn} disabled={updatePrefs.isPending}>
                {updatePrefs.isPending ? 'Subscribing...' : 'Subscribe'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Shield className="w-3 h-3" /> Your number is secure and only used for notifications
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
              <MessageCircle className="w-5 h-5 text-green-500" />
              WhatsApp Notifications
              <Badge variant="default" className="bg-green-500 text-xs">Active</Badge>
            </CardTitle>
            <CardDescription className="flex items-center gap-1 mt-1">
              <Phone className="w-3 h-3" /> {preferences.phone_number}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-3">
              <ShoppingCart className="w-4 h-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Order Notifications</p>
                <p className="text-xs text-muted-foreground">Confirmation, status updates, cancellations</p>
              </div>
            </div>
            <Switch
              checked={preferences.order_notifications}
              onCheckedChange={v => handleToggle('order_notifications', v)}
            />
          </div>
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-3">
              <Truck className="w-4 h-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Shipping & Delivery</p>
                <p className="text-xs text-muted-foreground">Dispatch, tracking, delivery confirmations</p>
              </div>
            </div>
            <Switch
              checked={preferences.shipping_notifications}
              onCheckedChange={v => handleToggle('shipping_notifications', v)}
            />
          </div>
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-3">
              <RotateCcw className="w-4 h-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Returns & Refunds</p>
                <p className="text-xs text-muted-foreground">Return status, refund processed</p>
              </div>
            </div>
            <Switch
              checked={preferences.return_notifications}
              onCheckedChange={v => handleToggle('return_notifications', v)}
            />
          </div>
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-3">
              <Megaphone className="w-4 h-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Promotional Messages</p>
                <p className="text-xs text-muted-foreground">Flash sales, exclusive offers, new arrivals</p>
              </div>
            </div>
            <Switch
              checked={preferences.promotional_messages}
              onCheckedChange={v => handleToggle('promotional_messages', v)}
            />
          </div>
        </div>

        <Separator />

        <div className="flex justify-between items-center">
          <p className="text-xs text-muted-foreground">
            Subscribed {new Date(preferences.opted_in_at).toLocaleDateString()}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive text-xs"
            onClick={() => {
              if (confirm('Are you sure you want to unsubscribe from all WhatsApp notifications?')) {
                optOut.mutate();
              }
            }}
          >
            Unsubscribe from all
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
