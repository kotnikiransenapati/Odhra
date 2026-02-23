import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Gauge, Eye, LayoutPanelTop, Clock, Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface VitalMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  count: number;
}

export function WebVitalsDashboard() {
  const { data: vitals, isLoading } = useQuery({
    queryKey: ['web-vitals-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('analytics_events')
        .select('properties, created_at')
        .eq('event_type', 'web_vital')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      // Aggregate vitals
      const metrics: Record<string, number[]> = {};
      (data || []).forEach(row => {
        const props = row.properties as Record<string, any>;
        if (props?.name && typeof props?.value === 'number') {
          if (!metrics[props.name]) metrics[props.name] = [];
          metrics[props.name].push(props.value);
        }
      });

      const thresholds: Record<string, { good: number; poor: number }> = {
        FCP: { good: 1800, poor: 3000 },
        LCP: { good: 2500, poor: 4000 },
        CLS: { good: 0.1, poor: 0.25 },
        TTFB: { good: 800, poor: 1800 },
      };

      return Object.entries(metrics).map(([name, values]): VitalMetric => {
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const threshold = thresholds[name] || { good: 1000, poor: 3000 };
        const rating = avg <= threshold.good ? 'good' : avg <= threshold.poor ? 'needs-improvement' : 'poor';
        return { name, value: Math.round(avg * 100) / 100, rating, count: values.length };
      });
    },
    staleTime: 60000,
  });

  const getVitalIcon = (name: string) => {
    switch (name) {
      case 'LCP': return Eye;
      case 'FCP': return LayoutPanelTop;
      case 'CLS': return Activity;
      case 'TTFB': return Clock;
      default: return Gauge;
    }
  };

  const getVitalLabel = (name: string) => {
    const labels: Record<string, string> = {
      FCP: 'First Contentful Paint',
      LCP: 'Largest Contentful Paint',
      CLS: 'Cumulative Layout Shift',
      TTFB: 'Time to First Byte',
    };
    return labels[name] || name;
  };

  const getRatingBadge = (rating: string) => {
    if (rating === 'good') return <Badge className="bg-success/10 text-success border-success/30 text-[10px]">Good</Badge>;
    if (rating === 'needs-improvement') return <Badge className="bg-warning/10 text-warning border-warning/30 text-[10px]">Needs Work</Badge>;
    return <Badge variant="destructive" className="text-[10px]">Poor</Badge>;
  };

  const formatValue = (name: string, value: number) => {
    if (name === 'CLS') return value.toFixed(3);
    return `${Math.round(value)}ms`;
  };

  if (isLoading) {
    return (
      <Card className="glass">
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Gauge className="w-4 h-4 text-accent" />
          Core Web Vitals
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {vitals && vitals.length > 0 ? (
          vitals.map(vital => {
            const Icon = getVitalIcon(vital.name);
            return (
              <div key={vital.name} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{vital.name}</p>
                    <p className="text-[10px] text-muted-foreground">{getVitalLabel(vital.name)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono font-medium">{formatValue(vital.name, vital.value)}</span>
                  {getRatingBadge(vital.rating)}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <Gauge className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No vitals data yet</p>
            <p className="text-xs">Data appears after real user visits</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
