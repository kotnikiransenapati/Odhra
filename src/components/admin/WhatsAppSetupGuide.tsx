import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  CheckCircle, Circle, ExternalLink, Key, Phone, Settings, Shield,
  AlertTriangle, Copy, Smartphone, Globe, QrCode, ArrowRight, Loader2
} from 'lucide-react';

const SETUP_STEPS = [
  {
    id: 'meta_account',
    title: 'Create Meta Business Account',
    description: 'Sign up at business.facebook.com and verify your business identity.',
    link: 'https://business.facebook.com',
    linkLabel: 'Open Meta Business Suite',
  },
  {
    id: 'whatsapp_app',
    title: 'Create WhatsApp Business App',
    description: 'Go to developers.facebook.com → Create App → Business → Add WhatsApp product.',
    link: 'https://developers.facebook.com/apps',
    linkLabel: 'Open Meta Developers',
  },
  {
    id: 'phone_number',
    title: 'Register Business Phone Number',
    description: 'Add and verify a phone number in the WhatsApp Business API settings. This number will send automated messages.',
    link: 'https://developers.facebook.com/docs/whatsapp/cloud-api/get-started',
    linkLabel: 'Setup Guide',
  },
  {
    id: 'api_tokens',
    title: 'Generate API Credentials',
    description: 'Copy your Permanent Access Token and Phone Number ID from the WhatsApp API setup page.',
    link: 'https://developers.facebook.com/docs/whatsapp/business-management-api/get-started',
    linkLabel: 'API Documentation',
  },
  {
    id: 'configure',
    title: 'Configure in Platform',
    description: 'Enter your credentials below to enable automated WhatsApp messaging.',
  },
  {
    id: 'templates',
    title: 'Submit Message Templates',
    description: 'Create and submit message templates for approval in the Meta Business Manager. Only approved templates can be sent.',
    link: 'https://business.facebook.com/wa/manage/message-templates/',
    linkLabel: 'Manage Templates',
  },
];

export function WhatsAppSetupGuide() {
  const queryClient = useQueryClient();
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');

  const { data: settings } = useQuery({
    queryKey: ['whatsapp-admin-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['whatsapp_business_phone', 'whatsapp_phone_number_id', 'whatsapp_enabled', 'whatsapp_setup_complete']);
      if (error) throw error;
      const map: Record<string, string> = {};
      data?.forEach(s => { map[s.key] = typeof s.value === 'string' ? s.value.replace(/^"|"$/g, '') : String(s.value); });
      return map;
    },
  });

  const isConfigured = settings?.whatsapp_setup_complete === 'true';

  const saveConfig = useMutation({
    mutationFn: async () => {
      if (!businessPhone) throw new Error('Business phone is required');

      const upserts = [
        { key: 'whatsapp_business_phone', value: JSON.stringify(businessPhone) },
        { key: 'whatsapp_enabled', value: JSON.stringify('true') },
        { key: 'whatsapp_setup_complete', value: JSON.stringify('true') },
      ];

      if (phoneNumberId) {
        upserts.push({ key: 'whatsapp_phone_number_id', value: JSON.stringify(phoneNumberId) });
      }

      for (const item of upserts) {
        const { error } = await supabase
          .from('system_settings')
          .upsert(item, { onConflict: 'key' });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-admin-settings'] });
      toast.success('WhatsApp configuration saved!');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleStep = (stepId: string) => {
    setCompletedSteps(prev =>
      prev.includes(stepId) ? prev.filter(s => s !== stepId) : [...prev, stepId]
    );
  };

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      {isConfigured ? (
        <Alert className="bg-success/10 border-success/20">
          <CheckCircle className="h-4 w-4 text-success" />
          <AlertTitle className="text-success">WhatsApp Business API Connected</AlertTitle>
          <AlertDescription>
            Your WhatsApp Business API is configured and active. Phone: {settings?.whatsapp_business_phone}
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="bg-warning/10 border-warning/20">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertTitle>WhatsApp Business API Not Configured</AlertTitle>
          <AlertDescription>
            Follow the steps below to connect your Meta WhatsApp Business API for automated messaging.
          </AlertDescription>
        </Alert>
      )}

      {/* Setup Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Setup Checklist
          </CardTitle>
          <CardDescription>
            Complete these steps to enable automated WhatsApp notifications via Meta Cloud API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {SETUP_STEPS.map((step, index) => {
            const isComplete = completedSteps.includes(step.id) || (step.id === 'configure' && isConfigured);
            return (
              <div key={step.id}>
                <div
                  className="flex items-start gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => toggleStep(step.id)}
                >
                  <div className="mt-0.5">
                    {isComplete ? (
                      <CheckCircle className="w-5 h-5 text-success" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">Step {index + 1}</span>
                      <h4 className={`font-medium ${isComplete ? 'line-through text-muted-foreground' : ''}`}>
                        {step.title}
                      </h4>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                    {step.link && (
                      <a
                        href={step.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
                        onClick={e => e.stopPropagation()}
                      >
                        <ExternalLink className="w-3 h-3" />
                        {step.linkLabel}
                      </a>
                    )}
                  </div>
                </div>
                {index < SETUP_STEPS.length - 1 && <Separator />}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Configuration Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            API Configuration
          </CardTitle>
          <CardDescription>
            Enter your Meta WhatsApp Business API credentials. The Access Token should be stored as a backend secret.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Business Phone Number</Label>
              <Input
                value={businessPhone || settings?.whatsapp_business_phone || ''}
                onChange={e => setBusinessPhone(e.target.value)}
                placeholder="+919876543210"
              />
              <p className="text-xs text-muted-foreground">Include country code</p>
            </div>
            <div className="space-y-2">
              <Label>Phone Number ID (Meta)</Label>
              <Input
                value={phoneNumberId || settings?.whatsapp_phone_number_id || ''}
                onChange={e => setPhoneNumberId(e.target.value)}
                placeholder="1234567890"
              />
              <p className="text-xs text-muted-foreground">Found in WhatsApp API setup page</p>
            </div>
          </div>

          <Alert>
            <Shield className="h-4 w-4" />
            <AlertTitle>Access Token Security</AlertTitle>
            <AlertDescription>
              The WhatsApp Access Token (WHATSAPP_ACCESS_TOKEN) is stored as a secure backend secret and is never exposed to the frontend. Contact your platform admin to update it.
            </AlertDescription>
          </Alert>

          <Button onClick={() => saveConfig.mutate()} disabled={saveConfig.isPending || !businessPhone}>
            {saveConfig.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Configuration
          </Button>
        </CardContent>
      </Card>

      {/* QR Code & Device Linking Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Device Linking & QR Pairing
          </CardTitle>
          <CardDescription>
            How to link your WhatsApp Business to this platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-primary" />
                Cloud API (Recommended)
              </h4>
              <p className="text-sm text-muted-foreground">
                The Cloud API runs entirely in the cloud — no phone device needed.
                Messages are sent via Meta's servers using your registered business number.
              </p>
              <ul className="text-sm text-muted-foreground space-y-1.5">
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-success mt-0.5 shrink-0" /> No device required — fully cloud-based</li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-success mt-0.5 shrink-0" /> High throughput (80 messages/sec)</li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-success mt-0.5 shrink-0" /> Template messages with rich media</li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-success mt-0.5 shrink-0" /> Read receipts & delivery tracking</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                Web Link Chat (Fallback)
              </h4>
              <p className="text-sm text-muted-foreground">
                The storefront chat widget uses wa.me links, which open WhatsApp on the customer's device.
                No API setup is needed for this mode.
              </p>
              <ul className="text-sm text-muted-foreground space-y-1.5">
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-success mt-0.5 shrink-0" /> Works instantly — no API key needed</li>
                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-success mt-0.5 shrink-0" /> Customers initiate the conversation</li>
                <li className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" /> No automated template messages</li>
                <li className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" /> No delivery/read tracking</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
