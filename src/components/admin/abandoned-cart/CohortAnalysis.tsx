import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PieChart, Users, Clock, DollarSign } from 'lucide-react';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';

interface Props {
  events: any[];
  formatPrice: (n: number) => string;
}

export function AbandonedCartCohortAnalysis({ events, formatPrice }: Props) {
  const { isEnabled } = useFeatureFlag('cart_cohort_analytics');
  if (!isEnabled) {
    return (
      <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
        Cohort analytics is disabled. Enable the <code>cart_cohort_analytics</code> feature flag to view this report.
      </CardContent></Card>
    );
  }
  // Segment cohorts
  const segments = ['new', 'returning', 'high_value', 'at_risk'];
  const segmentData = segments.map(seg => {
    const segEvents = events.filter((e: any) => (e as any).user_segment === seg);
    const total = segEvents.length;
    const recovered = segEvents.filter((e: any) => e.recovered).length;
    const totalValue = segEvents.reduce((s: number, e: any) => s + ((e as any).cart_value || 0), 0);
    const recoveredValue = segEvents.filter((e: any) => e.recovered)
      .reduce((s: number, e: any) => s + ((e as any).recovered_revenue || (e as any).cart_value || 0), 0);
    return {
      segment: seg,
      label: seg === 'high_value' ? '💎 VIP' : seg === 'at_risk' ? '⚠️ At Risk' : seg === 'new' ? '🆕 New' : '🔄 Returning',
      total,
      recovered,
      rate: total > 0 ? (recovered / total) * 100 : 0,
      totalValue,
      recoveredValue,
      avgCartValue: total > 0 ? totalValue / total : 0,
    };
  });

  // Cart value tiers
  const valueTiers = [
    { label: '< ₹500', min: 0, max: 500 },
    { label: '₹500-2K', min: 500, max: 2000 },
    { label: '₹2K-5K', min: 2000, max: 5000 },
    { label: '₹5K-10K', min: 5000, max: 10000 },
    { label: '₹10K+', min: 10000, max: Infinity },
  ];

  const tierData = valueTiers.map(tier => {
    const tierEvents = events.filter((e: any) => {
      const val = (e as any).cart_value || 0;
      return val >= tier.min && val < tier.max;
    });
    const total = tierEvents.length;
    const recovered = tierEvents.filter((e: any) => e.recovered).length;
    return {
      ...tier,
      total,
      recovered,
      rate: total > 0 ? (recovered / total) * 100 : 0,
    };
  });

  // Time-of-day analysis
  const hourBuckets = Array.from({ length: 6 }, (_, i) => {
    const startHour = i * 4;
    const endHour = startHour + 4;
    const bucketEvents = events.filter((e: any) => {
      const hour = new Date(e.created_at).getHours();
      return hour >= startHour && hour < endHour;
    });
    const total = bucketEvents.length;
    const recovered = bucketEvents.filter((e: any) => e.recovered).length;
    return {
      label: `${startHour.toString().padStart(2, '0')}:00 - ${endHour.toString().padStart(2, '0')}:00`,
      total,
      recovered,
      rate: total > 0 ? (recovered / total) * 100 : 0,
    };
  });

  const maxSegTotal = Math.max(...segmentData.map(s => s.total), 1);

  return (
    <div className="space-y-6">
      {/* Segment Cohorts */}
      <Card>
        <CardHeader><CardTitle className="text-lg gap-2 flex items-center"><Users className="w-5 h-5" />Recovery by User Segment</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {segmentData.map(seg => (
              <div key={seg.segment} className="p-4 rounded-xl bg-secondary space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{seg.label}</span>
                  <Badge variant={seg.rate >= 30 ? 'default' : 'outline'}>{seg.rate.toFixed(1)}%</Badge>
                </div>
                <Progress value={seg.rate} className="h-2" />
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Abandoned:</span> <span className="font-bold">{seg.total}</span></div>
                  <div><span className="text-muted-foreground">Recovered:</span> <span className="font-bold text-green-600">{seg.recovered}</span></div>
                  <div><span className="text-muted-foreground">Avg Cart:</span> <span className="font-bold">{formatPrice(seg.avgCartValue)}</span></div>
                  <div><span className="text-muted-foreground">Rev Saved:</span> <span className="font-bold text-green-600">{formatPrice(seg.recoveredValue)}</span></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cart Value Tiers */}
      <Card>
        <CardHeader><CardTitle className="text-lg gap-2 flex items-center"><DollarSign className="w-5 h-5" />Recovery by Cart Value Tier</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tierData.map(tier => (
              <div key={tier.label} className="flex items-center gap-4">
                <span className="text-sm font-medium w-24 text-right">{tier.label}</span>
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>{tier.total} abandoned</span>
                    <span>{tier.recovered} recovered ({tier.rate.toFixed(1)}%)</span>
                  </div>
                  <Progress value={tier.rate} className="h-2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Time of Day */}
      <Card>
        <CardHeader><CardTitle className="text-lg gap-2 flex items-center"><Clock className="w-5 h-5" />Abandonment by Time of Day</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {hourBuckets.map(bucket => (
              <div key={bucket.label} className="text-center p-3 rounded-lg bg-secondary">
                <p className="text-xs font-medium text-muted-foreground">{bucket.label}</p>
                <p className="text-lg font-bold mt-1">{bucket.total}</p>
                <p className="text-xs text-green-600 font-medium">{bucket.rate.toFixed(0)}% recovered</p>
                <Progress value={bucket.rate} className="h-1 mt-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
