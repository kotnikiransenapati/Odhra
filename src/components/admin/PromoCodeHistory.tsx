import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Search, Loader2, RefreshCw, Tag, Gift, RotateCcw, CheckCircle, XCircle, Clock, 
  IndianRupee, Percent, TrendingUp, ShoppingBag, Users, Award,
} from 'lucide-react';

type CodeSource = 'promo' | 'spin' | 'reward';

export function PromoCodeHistory() {
  const [activeTab, setActiveTab] = useState<CodeSource>('promo');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch promotions usage data
  const { data: promos, isLoading: promosLoading, refetch: refetchPromos } = useQuery({
    queryKey: ['admin-promo-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch spin wheel entries
  const { data: spinEntries, isLoading: spinLoading, refetch: refetchSpin } = useQuery({
    queryKey: ['admin-spin-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('spin_wheel_entries')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const userIds = [...new Set((data || []).map(e => e.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p]));

      return (data || []).map(entry => ({
        ...entry,
        profile: profileMap.get(entry.user_id),
      }));
    },
  });

  // Fetch reward redemption entries (loyalty_transactions with type = 'redeem')
  const { data: rewardEntries, isLoading: rewardsLoading, refetch: refetchRewards } = useQuery({
    queryKey: ['admin-reward-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loyalty_transactions')
        .select('*')
        .eq('transaction_type', 'redeem')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const userIds = [...new Set((data || []).map(e => e.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p]));

      return (data || []).map(entry => ({
        ...entry,
        profile: profileMap.get(entry.user_id),
      }));
    },
  });

  // Stats
  const promoStats = useMemo(() => {
    if (!promos) return { total: 0, active: 0, totalUsage: 0, totalRevenue: 0 };
    const now = new Date();
    return {
      total: promos.length,
      active: promos.filter(p => p.is_active && (!p.ends_at || new Date(p.ends_at) > now)).length,
      totalUsage: promos.reduce((s, p) => s + (p.usage_count || 0), 0),
      totalRevenue: promos.reduce((s, p) => s + ((p.usage_count || 0) * (p.discount_type === 'fixed' ? p.discount_value : 0)), 0),
    };
  }, [promos]);

  const spinStats = useMemo(() => {
    if (!spinEntries) return { total: 0, active: 0, used: 0, expired: 0 };
    return {
      total: spinEntries.length,
      active: spinEntries.filter(e => e.status === 'active').length,
      used: spinEntries.filter(e => e.status === 'used').length,
      expired: spinEntries.filter(e => e.status === 'expired').length,
    };
  }, [spinEntries]);

  const rewardStats = useMemo(() => {
    if (!rewardEntries) return { total: 0, totalPoints: 0 };
    return {
      total: rewardEntries.length,
      totalPoints: rewardEntries.reduce((s, e) => s + Math.abs(e.points), 0),
    };
  }, [rewardEntries]);

  const isLoading = activeTab === 'promo' ? promosLoading : activeTab === 'spin' ? spinLoading : rewardsLoading;

  const handleRefresh = () => {
    if (activeTab === 'promo') refetchPromos();
    else if (activeTab === 'spin') refetchSpin();
    else refetchRewards();
  };

  const getPromoStatus = (promo: any) => {
    const now = new Date();
    if (!promo.is_active) return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" />Inactive</Badge>;
    if (promo.ends_at && new Date(promo.ends_at) < now) return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Expired</Badge>;
    if (promo.usage_limit && promo.usage_count >= promo.usage_limit) return <Badge className="bg-warning/10 text-warning border-warning/20"><CheckCircle className="w-3 h-3 mr-1" />Maxed</Badge>;
    return <Badge className="bg-success/10 text-success border-success/20"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
  };

  const filteredPromos = useMemo(() => {
    if (!promos) return [];
    let result = promos;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => p.code.toLowerCase().includes(q) || p.name.toLowerCase().includes(q));
    }
    if (statusFilter === 'active') result = result.filter(p => p.is_active);
    if (statusFilter === 'expired') result = result.filter(p => !p.is_active || (p.ends_at && new Date(p.ends_at) < new Date()));
    return result;
  }, [promos, searchQuery, statusFilter]);

  const filteredSpin = useMemo(() => {
    if (!spinEntries) return [];
    let result = spinEntries;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((e: any) => e.code?.toLowerCase().includes(q) || e.profile?.email?.toLowerCase().includes(q));
    }
    if (statusFilter !== 'all') result = result.filter((e: any) => e.status === statusFilter);
    return result;
  }, [spinEntries, searchQuery, statusFilter]);

  const filteredRewards = useMemo(() => {
    if (!rewardEntries) return [];
    if (!searchQuery) return rewardEntries;
    const q = searchQuery.toLowerCase();
    return rewardEntries.filter((e: any) => e.description?.toLowerCase().includes(q) || e.profile?.email?.toLowerCase().includes(q));
  }, [rewardEntries, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Code & Redemption History</h2>
          <p className="text-muted-foreground">Complete audit trail of all promo codes, spin wheel codes, and reward redemptions</p>
        </div>
        <Button variant="outline" onClick={handleRefresh} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <Tag className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{promoStats.total}</p>
                <p className="text-xs text-muted-foreground">Promo Codes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                <Gift className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{spinStats.total}</p>
                <p className="text-xs text-muted-foreground">Spin Codes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                <Award className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{rewardStats.total}</p>
                <p className="text-xs text-muted-foreground">Reward Redemptions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{promoStats.totalUsage + spinStats.used + rewardStats.total}</p>
                <p className="text-xs text-muted-foreground">Total Redemptions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as CodeSource); setSearchQuery(''); setStatusFilter('all'); }}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="promo" className="gap-2"><Tag className="w-4 h-4" />Promo Codes</TabsTrigger>
          <TabsTrigger value="spin" className="gap-2"><Gift className="w-4 h-4" />Spin Wheel</TabsTrigger>
          <TabsTrigger value="reward" className="gap-2"><Award className="w-4 h-4" />Rewards</TabsTrigger>
        </TabsList>

        {/* Search & Filter Bar */}
        <div className="flex gap-3 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search codes, emails..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          {activeTab !== 'reward' && (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                {activeTab === 'spin' && <SelectItem value="used">Used</SelectItem>}
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Promo Codes Tab */}
        <TabsContent value="promo">
          <Card>
            <CardHeader>
              <CardTitle>Promo Code Usage History</CardTitle>
              <CardDescription>Showing {filteredPromos.length} promo codes</CardDescription>
            </CardHeader>
            <CardContent>
              {promosLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>
              ) : filteredPromos.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground"><Tag className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>No promo codes found</p></div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Discount</TableHead>
                        <TableHead>Usage</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Per User</TableHead>
                        <TableHead>Starts</TableHead>
                        <TableHead>Expires</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPromos.map((promo) => (
                        <TableRow key={promo.id}>
                          <TableCell><code className="px-2 py-1 bg-secondary rounded text-sm font-mono">{promo.code}</code></TableCell>
                          <TableCell className="font-medium">{promo.name}</TableCell>
                          <TableCell>
                            <span className="flex items-center gap-1">
                              {promo.discount_type === 'percentage' ? <Percent className="w-3 h-3" /> : <IndianRupee className="w-3 h-3" />}
                              {promo.discount_type === 'percentage' ? `${promo.discount_value}%` : `₹${promo.discount_value}`}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold">{promo.usage_count || 0}</span>
                            {promo.usage_limit && <span className="text-muted-foreground">/{promo.usage_limit}</span>}
                          </TableCell>
                          <TableCell>{getPromoStatus(promo)}</TableCell>
                          <TableCell>{promo.per_user_limit || '∞'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{promo.starts_at ? format(new Date(promo.starts_at), 'MMM d, yyyy') : '-'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{promo.ends_at ? format(new Date(promo.ends_at), 'MMM d, yyyy') : 'Never'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Spin Wheel Tab */}
        <TabsContent value="spin">
          <Card>
            <CardHeader>
              <CardTitle>Spin Wheel Code History</CardTitle>
              <CardDescription>Active: {spinStats.active} · Used: {spinStats.used} · Expired: {spinStats.expired}</CardDescription>
            </CardHeader>
            <CardContent>
              {spinLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>
              ) : filteredSpin.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground"><Gift className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>No spin codes found</p></div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Discount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead>Used</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSpin.map((entry: any) => (
                        <TableRow key={entry.id}>
                          <TableCell><code className="px-2 py-1 bg-secondary rounded text-sm font-mono">{entry.code}</code></TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{entry.profile?.full_name || 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground">{entry.profile?.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {entry.discount_type === 'percentage' ? `${entry.discount_value}%` : `₹${entry.discount_value}`}
                          </TableCell>
                          <TableCell>
                            {entry.status === 'used' ? (
                              <Badge className="bg-success/10 text-success border-success/20"><CheckCircle className="w-3 h-3 mr-1" />Used</Badge>
                            ) : entry.status === 'expired' || new Date(entry.expires_at) < new Date() ? (
                              <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" />Expired</Badge>
                            ) : (
                              <Badge className="bg-accent/10 text-accent border-accent/20"><Clock className="w-3 h-3 mr-1" />Active</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{format(new Date(entry.created_at), 'MMM d, yyyy HH:mm')}</TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(entry.expires_at), 'MMM d, yyyy')}
                            {new Date(entry.expires_at) > new Date() && entry.status === 'active' && (
                              <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(entry.expires_at), { addSuffix: true })}</p>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{entry.used_at ? format(new Date(entry.used_at), 'MMM d, yyyy HH:mm') : '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rewards Tab */}
        <TabsContent value="reward">
          <Card>
            <CardHeader>
              <CardTitle>Reward Point Redemptions</CardTitle>
              <CardDescription>Total: {rewardStats.total} redemptions · {rewardStats.totalPoints} pts redeemed</CardDescription>
            </CardHeader>
            <CardContent>
              {rewardsLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>
              ) : filteredRewards.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground"><Award className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>No reward redemptions found</p></div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Points</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRewards.map((entry: any) => (
                        <TableRow key={entry.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{entry.profile?.full_name || 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground">{entry.profile?.email}</p>
                            </div>
                          </TableCell>
                          <TableCell><span className="font-bold text-destructive">{entry.points} pts</span></TableCell>
                          <TableCell className="text-sm">{entry.description || '-'}</TableCell>
                          <TableCell><Badge variant="outline">{entry.source}</Badge></TableCell>
                          <TableCell className="text-sm text-muted-foreground">{format(new Date(entry.created_at), 'MMM d, yyyy HH:mm')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
