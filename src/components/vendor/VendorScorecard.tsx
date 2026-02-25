import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Award, Star, Truck, RotateCcw, XCircle, Timer, Shield,
  TrendingUp, TrendingDown, Loader2, Target, BarChart3,
} from 'lucide-react';

function getGrade(score: number) {
  if (score >= 90) return { label: 'Excellent', color: 'bg-success/10 text-success border-success/30', icon: '🏆', tip: 'Outstanding performance! Keep it up.' };
  if (score >= 80) return { label: 'Good', color: 'bg-info/10 text-info border-info/30', icon: '✅', tip: 'Great job! Small improvements can push you to Excellent.' };
  if (score >= 60) return { label: 'Average', color: 'bg-warning/10 text-warning border-warning/30', icon: '⚡', tip: 'Focus on on-time delivery and reducing returns.' };
  return { label: 'Needs Improvement', color: 'bg-destructive/10 text-destructive border-destructive/30', icon: '⚠️', tip: 'Urgent: address delivery delays and customer complaints.' };
}

interface MetricCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  benchmark?: string;
  status?: 'good' | 'warning' | 'poor';
}

function MetricCard({ label, value, icon: Icon, color, bg, benchmark, status }: MetricCardProps) {
  const statusColors = {
    good: 'border-success/30',
    warning: 'border-warning/30',
    poor: 'border-destructive/30',
  };
  return (
    <Card className={`border ${status ? statusColors[status] : 'border-border/40'}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="text-xl font-bold">{value}</p>
          </div>
        </div>
        {benchmark && (
          <p className="text-xs text-muted-foreground">
            Platform avg: <span className="font-medium">{benchmark}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function VendorScorecard() {
  const { user } = useAuth();

  const { data: vendor } = useQuery({
    queryKey: ['my-vendor-profile'],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from('vendors').select('id, brand_name').eq('user_id', user.id).single();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['my-vendor-performance', vendor?.id],
    queryFn: async () => {
      if (!vendor?.id) return null;
      const { data } = await (supabase.from('vendor_performance_metrics') as any)
        .select('*')
        .eq('vendor_id', vendor.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      return data;
    },
    enabled: !!vendor?.id,
  });

  // Platform averages for comparison
  const { data: platformAvg } = useQuery({
    queryKey: ['platform-avg-performance'],
    queryFn: async () => {
      const { data } = await (supabase.from('vendor_performance_metrics') as any).select('*');
      if (!data?.length) return null;
      const count = data.length;
      return {
        score: data.reduce((s: number, m: any) => s + Number(m.score), 0) / count,
        onTime: data.reduce((s: number, m: any) => s + Number(m.on_time_delivery_rate), 0) / count,
        cancel: data.reduce((s: number, m: any) => s + Number(m.cancellation_rate), 0) / count,
        returnRate: data.reduce((s: number, m: any) => s + Number(m.return_rate), 0) / count,
        response: data.reduce((s: number, m: any) => s + Number(m.response_time_hours || 0), 0) / count,
        sla: data.reduce((s: number, m: any) => s + Number(m.sla_compliance_rate || 0), 0) / count,
        rating: data.reduce((s: number, m: any) => s + Number(m.avg_rating), 0) / count,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!metrics) {
    return (
      <Card className="border-border/40">
        <CardContent className="py-12 text-center">
          <Target className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="font-medium text-muted-foreground">No performance data yet</p>
          <p className="text-xs text-muted-foreground mt-1">Your scorecard will appear after your first orders are fulfilled.</p>
        </CardContent>
      </Card>
    );
  }

  const score = Number(metrics.score || 0);
  const grade = getGrade(score);
  const onTime = Number(metrics.on_time_delivery_rate || 0);
  const cancelRate = Number(metrics.cancellation_rate || 0);
  const returnRate = Number(metrics.return_rate || 0);
  const responseTime = Number(metrics.response_time_hours || 0);
  const sla = Number(metrics.sla_compliance_rate || 0);
  const rating = Number(metrics.avg_rating || 0);
  const totalOrders = Number(metrics.total_orders || 0);
  const totalRevenue = Number(metrics.total_revenue || 0);

  return (
    <div className="space-y-6">
      {/* Hero Score Card */}
      <Card className={`border-2 ${grade.color} overflow-hidden`}>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-2xl bg-background/60 backdrop-blur-sm flex items-center justify-center border border-border/40">
                  <span className="text-4xl font-black">{score.toFixed(0)}</span>
                </div>
                <span className="absolute -top-2 -right-2 text-2xl">{grade.icon}</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold">{grade.label}</h3>
                <p className="text-sm text-muted-foreground mt-1">{grade.tip}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Progress value={score} className="w-32 h-2" />
                  <span className="text-xs text-muted-foreground">{score.toFixed(0)}/100</span>
                </div>
              </div>
            </div>
            <div className="sm:ml-auto flex gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold">{totalOrders}</p>
                <p className="text-xs text-muted-foreground">Orders</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">₹{(totalRevenue / 1000).toFixed(0)}K</p>
                <p className="text-xs text-muted-foreground">Revenue</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Star className="w-4 h-4 text-accent fill-accent" />
                  <span className="text-2xl font-bold">{rating.toFixed(1)}</span>
                </div>
                <p className="text-xs text-muted-foreground">Rating</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metric Breakdown Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          label="On-Time Delivery"
          value={`${onTime.toFixed(1)}%`}
          icon={Truck}
          color="text-success"
          bg="bg-success/10"
          benchmark={platformAvg ? `${platformAvg.onTime.toFixed(1)}%` : undefined}
          status={onTime >= 90 ? 'good' : onTime >= 70 ? 'warning' : 'poor'}
        />
        <MetricCard
          label="Cancellation Rate"
          value={`${cancelRate.toFixed(1)}%`}
          icon={XCircle}
          color="text-destructive"
          bg="bg-destructive/10"
          benchmark={platformAvg ? `${platformAvg.cancel.toFixed(1)}%` : undefined}
          status={cancelRate <= 2 ? 'good' : cancelRate <= 5 ? 'warning' : 'poor'}
        />
        <MetricCard
          label="Return Rate"
          value={`${returnRate.toFixed(1)}%`}
          icon={RotateCcw}
          color="text-warning"
          bg="bg-warning/10"
          benchmark={platformAvg ? `${platformAvg.returnRate.toFixed(1)}%` : undefined}
          status={returnRate <= 3 ? 'good' : returnRate <= 8 ? 'warning' : 'poor'}
        />
        <MetricCard
          label="Avg Response Time"
          value={`${responseTime.toFixed(1)}h`}
          icon={Timer}
          color="text-info"
          bg="bg-info/10"
          benchmark={platformAvg ? `${platformAvg.response.toFixed(1)}h` : undefined}
          status={responseTime <= 4 ? 'good' : responseTime <= 12 ? 'warning' : 'poor'}
        />
        <MetricCard
          label="SLA Compliance"
          value={`${sla.toFixed(1)}%`}
          icon={Shield}
          color="text-primary"
          bg="bg-primary/10"
          benchmark={platformAvg ? `${platformAvg.sla.toFixed(1)}%` : undefined}
          status={sla >= 95 ? 'good' : sla >= 80 ? 'warning' : 'poor'}
        />
        <MetricCard
          label="Customer Rating"
          value={rating.toFixed(1)}
          icon={Star}
          color="text-accent"
          bg="bg-accent/10"
          benchmark={platformAvg ? platformAvg.rating.toFixed(1) : undefined}
          status={rating >= 4.5 ? 'good' : rating >= 3.5 ? 'warning' : 'poor'}
        />
      </div>

      {/* Scoring Formula Breakdown */}
      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> How Your Score is Calculated
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { label: 'On-Time Delivery', weight: '30%', value: onTime, max: 100, icon: Truck },
              { label: 'Customer Rating', weight: '25%', value: (rating / 5) * 100, max: 100, icon: Star },
              { label: 'Low Cancellations', weight: '25%', value: Math.max(100 - cancelRate * 10, 0), max: 100, icon: XCircle },
              { label: 'Low Returns', weight: '20%', value: Math.max(100 - returnRate * 5, 0), max: 100, icon: RotateCcw },
            ].map(factor => (
              <div key={factor.label} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                  <factor.icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{factor.label}</span>
                    <span className="text-xs text-muted-foreground">Weight: {factor.weight}</span>
                  </div>
                  <Progress value={factor.value} className="h-2" />
                </div>
                <span className="text-sm font-bold w-12 text-right">{factor.value.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
