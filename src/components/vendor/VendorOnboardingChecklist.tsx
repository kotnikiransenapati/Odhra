import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2, Circle, Package, CreditCard, Store, Settings, Upload, Star,
} from 'lucide-react';
import { toast } from 'sonner';

const ONBOARDING_STEPS = [
  { key: 'profile', label: 'Complete Store Profile', description: 'Add brand name, logo, and description', icon: Store },
  { key: 'bank', label: 'Add Bank Details', description: 'Set up payment information for payouts', icon: CreditCard },
  { key: 'product', label: 'Add First Product', description: 'List at least one product in your store', icon: Package },
  { key: 'shipping', label: 'Configure Shipping', description: 'Set shipping rates and zones', icon: Upload },
  { key: 'settings', label: 'Review Settings', description: 'Configure notification and store preferences', icon: Settings },
];

export function VendorOnboardingChecklist() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: vendor } = useQuery({
    queryKey: ['my-vendor-onboarding', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('vendors')
        .select('id, brand_name, logo_url')
        .eq('user_id', user?.id!)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const { data: progress } = useQuery({
    queryKey: ['vendor-onboarding-progress', vendor?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('vendor_onboarding_progress')
        .select('*')
        .eq('vendor_id', vendor?.id!)
        .single();
      return data;
    },
    enabled: !!vendor?.id,
  });

  const { data: productCount } = useQuery({
    queryKey: ['vendor-product-count', vendor?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('vendor_id', vendor?.id!);
      return count || 0;
    },
    enabled: !!vendor?.id,
  });

  const updateProgress = useMutation({
    mutationFn: async (stepKey: string) => {
      const currentSteps = (progress?.steps_completed as Record<string, boolean>) || {};
      const updated = { ...currentSteps, [stepKey]: true };
      const allDone = ONBOARDING_STEPS.every(s => updated[s.key]);

      const { error } = await supabase
        .from('vendor_onboarding_progress')
        .upsert({
          vendor_id: vendor?.id!,
          steps_completed: updated,
          completed_at: allDone ? new Date().toISOString() : null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-onboarding-progress'] });
      toast.success('Step completed!');
    },
  });

  // Auto-detect completed steps
  const stepsCompleted = (progress?.steps_completed as Record<string, boolean>) || {};
  const autoDetected: Record<string, boolean> = {
    profile: !!(vendor?.brand_name && vendor?.logo_url),
    bank: !!stepsCompleted['bank'],
    product: (productCount || 0) > 0,
    ...stepsCompleted,
  };

  const completedCount = ONBOARDING_STEPS.filter(s => autoDetected[s.key]).length;
  const progressPercent = (completedCount / ONBOARDING_STEPS.length) * 100;

  if (progress?.completed_at) return null; // Hide when all done

  return (
    <Card className="glass border-accent/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-accent" />
            Getting Started
          </CardTitle>
          <Badge variant="outline">{completedCount}/{ONBOARDING_STEPS.length}</Badge>
        </div>
        <Progress value={progressPercent} className="h-2 mt-2" />
      </CardHeader>
      <CardContent className="space-y-3">
        {ONBOARDING_STEPS.map(step => {
          const done = autoDetected[step.key];
          return (
            <div
              key={step.key}
              className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${done ? 'bg-success/5' : 'bg-muted/50'}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${done ? 'bg-success/10' : 'bg-muted'}`}>
                {done ? (
                  <CheckCircle2 className="w-5 h-5 text-success" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <p className={`font-medium text-sm ${done ? 'line-through text-muted-foreground' : ''}`}>
                  {step.label}
                </p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
              {!done && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateProgress.mutate(step.key)}
                >
                  Mark Done
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
