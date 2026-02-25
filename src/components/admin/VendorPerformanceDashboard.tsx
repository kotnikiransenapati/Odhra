import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  TrendingUp, TrendingDown, Minus, Star, Truck, RotateCcw, XCircle,
  Clock, Loader2, Award, AlertTriangle, RefreshCw, Calendar,
  Shield, Zap, Timer, Target, BarChart3
} from 'lucide-react';
import { toast } from 'sonner';

function getScoreColor(score: number) {
  if (score >= 80) return 'text-success';
  if (score >= 60) return 'text-warning';
  return 'text-destructive';
}

function getScoreBadge(score: number) {
  if (score >= 90) return { label: 'Excellent', color: 'bg-success/10 text-success border-success/20', icon: '🏆' };
  if (score >= 80) return { label: 'Good', color: 'bg-info/10 text-info border-info/20', icon: '✅' };
  if (score >= 60) return { label: 'Average', color: 'bg-warning/10 text-warning border-warning/20', icon: '⚡' };
  return { label: 'Poor', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: '⚠️' };
}

function TrendIndicator({ current, previous, suffix = '', invert = false }: { current: number; previous?: number; suffix?: string; invert?: boolean }) {
  if (previous === undefined || previous === null) return <span className="text-muted-foreground text-xs">—</span>;
  const diff = current - previous;
  const isPositive = invert ? diff < 0 : diff > 0;
  const isNeutral = Math.abs(diff) < 0.5;

  if (isNeutral) return <Minus className="w-3 h-3 text-muted-foreground" />;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isPositive ? 'text-success' : 'text-destructive'}`}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(diff).toFixed(1)}{suffix}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>Previous period: {previous.toFixed(1)}{suffix}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function VendorPerformanceDashboard() {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState('30');
  const [sortBy, setSortBy] = useState<'score' | 'revenue' | 'orders'>('score');

  const { data: metrics = [], isLoading } = useQuery({
    queryKey: ['vendor-performance-metrics', period],
    queryFn: async () => {
      const { data, error } = await (supabase.from('vendor_performance_metrics') as any)
        .select('*')
        .order('score', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['all-vendors-for-perf'],
    queryFn: async () => {
      const { data } = await supabase.from('vendors').select('id, brand_name, logo_url, is_active');
      return data || [];
    },
  });

  // Sorted metrics
  const sortedMetrics = useMemo(() => {
    const sorted = [...metrics];
    if (sortBy === 'revenue') sorted.sort((a: any, b: any) => Number(b.total_revenue) - Number(a.total_revenue));
    else if (sortBy === 'orders') sorted.sort((a: any, b: any) => Number(b.total_orders) - Number(a.total_orders));
    else sorted.sort((a: any, b: any) => Number(b.score) - Number(a.score));
    return sorted;
  }, [metrics, sortBy]);

  // Platform averages
  const avgScore = metrics.length > 0 ? metrics.reduce((s: number, m: any) => s + Number(m.score), 0) / metrics.length : 0;
  const avgDelivery = metrics.length > 0 ? metrics.reduce((s: number, m: any) => s + Number(m.on_time_delivery_rate), 0) / metrics.length : 0;
  const avgReturn = metrics.length > 0 ? metrics.reduce((s: number, m: any) => s + Number(m.return_rate), 0) / metrics.length : 0;
  const avgResponseTime = metrics.length > 0 ? metrics.reduce((s: number, m: any) => s + Number(m.response_time_hours || 0), 0) / metrics.length : 0;
  const avgSLA = metrics.length > 0 ? metrics.reduce((s: number, m: any) => s + Number(m.sla_compliance_rate || 0), 0) / metrics.length : 0;
  const totalRevenue = metrics.reduce((s: number, m: any) => s + Number(m.total_revenue), 0);

  // Grade distribution
  const gradeDistribution = useMemo(() => {
    const dist = { excellent: 0, good: 0, average: 0, poor: 0 };
    metrics.forEach((m: any) => {
      const s = Number(m.score);
      if (s >= 90) dist.excellent++;
      else if (s >= 80) dist.good++;
      else if (s >= 60) dist.average++;
      else dist.poor++;
    });
    return dist;
  }, [metrics]);

  const recomputeMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.rpc as any)('compute_vendor_performance', {
        p_period_start: new Date(Date.now() - Number(period) * 86400000).toISOString().split('T')[0],
        p_period_end: new Date().toISOString().split('T')[0],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-performance-metrics'] });
      toast.success('Vendor scores recalculated');
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Vendor Performance Scoreboard</h2>
          <p className="text-muted-foreground text-sm">Composite scoring with delivery SLA, response time, ratings & trend analysis</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="w-4 h-4 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => recomputeMutation.mutate()} disabled={recomputeMutation.isPending} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${recomputeMutation.isPending ? 'animate-spin' : ''}`} />
            Recalculate
          </Button>
        </div>
      </div>

      {/* KPI Cards — 6 metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Avg Score', value: avgScore.toFixed(1), icon: Award, color: 'text-accent', bg: 'bg-accent/10' },
          { label: 'On-Time Delivery', value: `${avgDelivery.toFixed(1)}%`, icon: Truck, color: 'text-success', bg: 'bg-success/10' },
          { label: 'Return Rate', value: `${avgReturn.toFixed(1)}%`, icon: RotateCcw, color: 'text-warning', bg: 'bg-warning/10' },
          { label: 'Avg Response', value: `${avgResponseTime.toFixed(1)}h`, icon: Timer, color: 'text-info', bg: 'bg-info/10' },
          { label: 'SLA Compliance', value: `${avgSLA.toFixed(1)}%`, icon: Shield, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Total Revenue', value: `₹${(totalRevenue / 1000).toFixed(0)}K`, icon: BarChart3, color: 'text-accent', bg: 'bg-accent/10' },
        ].map(kpi => (
          <Card key={kpi.label} className="glass">
            <CardContent className="p-3 flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-xl ${kpi.bg} flex items-center justify-center flex-shrink-0`}>
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold leading-tight truncate">{kpi.value}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Grade Distribution */}
      {metrics.length > 0 && (
        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center gap-6 flex-wrap">
              <p className="text-sm font-medium text-muted-foreground">Grade Distribution:</p>
              {[
                { label: 'Excellent', count: gradeDistribution.excellent, color: 'bg-success', emoji: '🏆' },
                { label: 'Good', count: gradeDistribution.good, color: 'bg-info', emoji: '✅' },
                { label: 'Average', count: gradeDistribution.average, color: 'bg-warning', emoji: '⚡' },
                { label: 'Poor', count: gradeDistribution.poor, color: 'bg-destructive', emoji: '⚠️' },
              ].map(g => (
                <div key={g.label} className="flex items-center gap-2">
                  <span>{g.emoji}</span>
                  <div className={`w-3 h-3 rounded-full ${g.color}`} />
                  <span className="text-sm">{g.label}: <strong>{g.count}</strong></span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sort Controls */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Sort by:</span>
        {(['score', 'revenue', 'orders'] as const).map(s => (
          <Button key={s} variant={sortBy === s ? 'default' : 'outline'} size="sm" onClick={() => setSortBy(s)} className="capitalize text-xs">
            {s}
          </Button>
        ))}
      </div>

      {/* Vendor Scorecard Table */}
      <Card className="glass">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">#</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>On-Time %</TableHead>
                <TableHead>Cancel %</TableHead>
                <TableHead>Return %</TableHead>
                <TableHead>Response Time</TableHead>
                <TableHead>SLA %</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Grade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedMetrics.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-12 text-muted-foreground">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No performance data. Click <strong>Recalculate</strong> to compute scores.</p>
                  </TableCell>
                </TableRow>
              ) : (
                sortedMetrics.map((m: any, idx: number) => {
                  const vendor = vendors.find((v: any) => v.id === m.vendor_id);
                  const scoreBadge = getScoreBadge(Number(m.score));
                  const rank = idx + 1;
                  const responseHours = Number(m.response_time_hours || 0);
                  const sla = Number(m.sla_compliance_rate || 0);

                  return (
                    <TableRow key={m.id} className={rank <= 3 ? 'bg-accent/[0.03]' : ''}>
                      <TableCell>
                        <span className={`text-sm font-bold ${rank === 1 ? 'text-amber-500' : rank === 2 ? 'text-gray-400' : rank === 3 ? 'text-orange-400' : 'text-muted-foreground'}`}>
                          {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : rank}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {vendor?.logo_url ? (
                            <img src={vendor.logo_url} className="w-8 h-8 rounded-lg object-cover" alt="" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-xs font-bold">
                              {vendor?.brand_name?.[0] || '?'}
                            </div>
                          )}
                          <div>
                            <span className="font-medium text-sm">{vendor?.brand_name || 'Unknown'}</span>
                            {!vendor?.is_active && <Badge variant="outline" className="ml-1 text-[9px]">Inactive</Badge>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={`text-lg font-bold ${getScoreColor(Number(m.score))}`}>
                            {Number(m.score).toFixed(0)}
                          </span>
                          <Progress value={Number(m.score)} className="w-14 h-2" />
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{m.total_orders}</TableCell>
                      <TableCell className="font-medium">₹{Number(m.total_revenue).toLocaleString()}</TableCell>
                      <TableCell>
                        <span className={Number(m.on_time_delivery_rate) >= 90 ? 'text-success' : Number(m.on_time_delivery_rate) >= 70 ? 'text-warning' : 'text-destructive'}>
                          {Number(m.on_time_delivery_rate).toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={Number(m.cancellation_rate) <= 2 ? 'text-success' : Number(m.cancellation_rate) <= 5 ? 'text-warning' : 'text-destructive'}>
                          {Number(m.cancellation_rate).toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={Number(m.return_rate) <= 3 ? 'text-success' : Number(m.return_rate) <= 8 ? 'text-warning' : 'text-destructive'}>
                          {Number(m.return_rate).toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Timer className="w-3 h-3 text-muted-foreground" />
                          <span className={responseHours <= 4 ? 'text-success' : responseHours <= 12 ? 'text-warning' : 'text-destructive'}>
                            {responseHours.toFixed(1)}h
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={sla >= 95 ? 'text-success' : sla >= 80 ? 'text-warning' : 'text-destructive'}>
                          {sla.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-accent fill-accent" />
                          <span className="text-sm font-medium">{Number(m.avg_rating).toFixed(1)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={scoreBadge.color}>
                          {scoreBadge.icon} {scoreBadge.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
