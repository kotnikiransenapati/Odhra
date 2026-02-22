import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  TrendingUp, TrendingDown, Star, Truck, RotateCcw, XCircle,
  Clock, Loader2, Award, AlertTriangle, RefreshCw, Calendar
} from 'lucide-react';
import { toast } from 'sonner';

function getScoreColor(score: number) {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-red-600';
}

function getScoreBadge(score: number) {
  if (score >= 90) return { label: 'Excellent', color: 'bg-green-500/10 text-green-600 border-green-500/20' };
  if (score >= 80) return { label: 'Good', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' };
  if (score >= 60) return { label: 'Average', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' };
  return { label: 'Poor', color: 'bg-red-500/10 text-red-600 border-red-500/20' };
}

export function VendorPerformanceDashboard() {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState('30');
  const { data: metrics = [], isLoading } = useQuery({
    queryKey: ['vendor-performance-metrics'],
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

  // Compute platform averages
  const avgScore = metrics.length > 0 ? metrics.reduce((s: number, m: any) => s + Number(m.score), 0) / metrics.length : 0;
  const avgDelivery = metrics.length > 0 ? metrics.reduce((s: number, m: any) => s + Number(m.on_time_delivery_rate), 0) / metrics.length : 0;
  const avgReturn = metrics.length > 0 ? metrics.reduce((s: number, m: any) => s + Number(m.return_rate), 0) / metrics.length : 0;

  // Recompute scores mutation
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Vendor Performance</h2>
          <p className="text-muted-foreground text-sm">Track delivery SLA, ratings, cancellations, and composite scores</p>
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
          <Button 
            variant="outline" 
            onClick={() => recomputeMutation.mutate()} 
            disabled={recomputeMutation.isPending}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${recomputeMutation.isPending ? 'animate-spin' : ''}`} />
            Recalculate
          </Button>
        </div>
      </div>

      {/* Platform Averages */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="glass">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center"><Award className="w-5 h-5 text-accent" /></div>
            <div><p className="text-xl font-bold">{avgScore.toFixed(1)}</p><p className="text-xs text-muted-foreground">Avg Score</p></div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center"><Truck className="w-5 h-5 text-green-500" /></div>
            <div><p className="text-xl font-bold">{avgDelivery.toFixed(1)}%</p><p className="text-xs text-muted-foreground">On-Time Delivery</p></div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center"><RotateCcw className="w-5 h-5 text-yellow-500" /></div>
            <div><p className="text-xl font-bold">{avgReturn.toFixed(1)}%</p><p className="text-xs text-muted-foreground">Avg Return Rate</p></div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center"><Star className="w-5 h-5 text-purple-500" /></div>
            <div><p className="text-xl font-bold">{vendors.length}</p><p className="text-xs text-muted-foreground">Total Vendors</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Vendor Scorecard Table */}
      <Card className="glass">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>On-Time %</TableHead>
                <TableHead>Cancel %</TableHead>
                <TableHead>Return %</TableHead>
                <TableHead>Avg Rating</TableHead>
                <TableHead>Grade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No performance data available yet. Metrics are generated monthly.</p>
                  </TableCell>
                </TableRow>
              ) : (
                metrics.map((m: any) => {
                  const vendor = vendors.find((v: any) => v.id === m.vendor_id);
                  const scoreBadge = getScoreBadge(Number(m.score));
                  return (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {vendor?.logo_url ? (
                            <img src={vendor.logo_url} className="w-8 h-8 rounded-lg object-cover" alt="" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-xs font-bold">{vendor?.brand_name?.[0] || '?'}</div>
                          )}
                          <span className="font-medium text-sm">{vendor?.brand_name || 'Unknown'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={`text-lg font-bold ${getScoreColor(Number(m.score))}`}>{Number(m.score).toFixed(0)}</span>
                          <Progress value={Number(m.score)} className="w-16 h-2" />
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{m.total_orders}</TableCell>
                      <TableCell className="font-medium">₹{Number(m.total_revenue).toLocaleString()}</TableCell>
                      <TableCell>
                        <span className={Number(m.on_time_delivery_rate) >= 90 ? 'text-green-600' : Number(m.on_time_delivery_rate) >= 70 ? 'text-yellow-600' : 'text-red-600'}>
                          {Number(m.on_time_delivery_rate).toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={Number(m.cancellation_rate) <= 2 ? 'text-green-600' : Number(m.cancellation_rate) <= 5 ? 'text-yellow-600' : 'text-red-600'}>
                          {Number(m.cancellation_rate).toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={Number(m.return_rate) <= 3 ? 'text-green-600' : Number(m.return_rate) <= 8 ? 'text-yellow-600' : 'text-red-600'}>
                          {Number(m.return_rate).toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                          <span className="text-sm font-medium">{Number(m.avg_rating).toFixed(1)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={scoreBadge.color}>{scoreBadge.label}</Badge>
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
