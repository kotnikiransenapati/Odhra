import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Gift,
  Loader2,
  Search,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  RotateCcw,
  TrendingUp,
  Users,
  Percent,
  IndianRupee,
} from 'lucide-react';

interface SpinWheelEntry {
  id: string;
  user_id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  status: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
  order_id: string | null;
  profile?: {
    full_name: string | null;
    email: string;
  };
}

export function SpinWheelCodesManager() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch all spin wheel entries with user info
  const { data: entries, isLoading, refetch } = useQuery({
    queryKey: ['admin-spin-wheel-entries', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('spin_wheel_entries')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch user profiles for each entry
      const userIds = [...new Set((data || []).map(e => e.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]));

      return (data || []).map(entry => ({
        ...entry,
        profile: profileMap.get(entry.user_id)
      })) as SpinWheelEntry[];
    },
  });

  // Stats
  const stats = React.useMemo(() => {
    if (!entries) return { total: 0, active: 0, used: 0, expired: 0, totalDiscount: 0 };
    
    return {
      total: entries.length,
      active: entries.filter(e => e.status === 'active').length,
      used: entries.filter(e => e.status === 'used').length,
      expired: entries.filter(e => e.status === 'expired').length,
      totalDiscount: entries
        .filter(e => e.status === 'used')
        .reduce((sum, e) => sum + (e.discount_type === 'fixed' ? e.discount_value : 0), 0),
    };
  }, [entries]);

  // Expire codes mutation
  const expireCodesMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('expire_spin_wheel_codes');
      if (error) throw error;
      return data;
    },
    onSuccess: (count) => {
      toast.success(`Expired ${count} codes`);
      queryClient.invalidateQueries({ queryKey: ['admin-spin-wheel-entries'] });
    },
    onError: () => {
      toast.error('Failed to expire codes');
    }
  });

  // Filter entries by search
  const filteredEntries = React.useMemo(() => {
    if (!entries) return [];
    if (!searchQuery) return entries;
    
    const query = searchQuery.toLowerCase();
    return entries.filter(entry => 
      entry.code.toLowerCase().includes(query) ||
      entry.profile?.email?.toLowerCase().includes(query) ||
      entry.profile?.full_name?.toLowerCase().includes(query)
    );
  }, [entries, searchQuery]);

  const getStatusBadge = (status: string, expiresAt: string) => {
    const isExpired = new Date(expiresAt) < new Date();
    
    if (status === 'used') {
      return <Badge className="bg-success/10 text-success border-success/20"><CheckCircle className="w-3 h-3 mr-1" />Used</Badge>;
    }
    if (status === 'expired' || isExpired) {
      return <Badge variant="secondary" className="gap-1"><XCircle className="w-3 h-3" />Expired</Badge>;
    }
    return <Badge className="bg-accent/10 text-accent border-accent/20"><Clock className="w-3 h-3 mr-1" />Active</Badge>;
  };

  const formatDiscount = (type: string, value: number) => {
    if (type === 'percentage') {
      return `${value}%`;
    }
    return `₹${value}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Spin Wheel Codes</h2>
          <p className="text-muted-foreground">Track all generated, used, and expired spin wheel discount codes</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => expireCodesMutation.mutate()}
            disabled={expireCodesMutation.isPending}
            className="gap-2"
          >
            {expireCodesMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RotateCcw className="w-4 h-4" />
            )}
            Expire Old Codes
          </Button>
          <Button variant="outline" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="glass">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <Gift className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Codes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.used}</p>
                <p className="text-xs text-muted-foreground">Used</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <XCircle className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.expired}</p>
                <p className="text-xs text-muted-foreground">Expired</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <IndianRupee className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">₹{stats.totalDiscount.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Discounts Given</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="glass">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by code, email, or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="used">Used</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Codes Table */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5" />
            All Spin Wheel Codes
          </CardTitle>
          <CardDescription>
            Showing {filteredEntries.length} of {entries?.length || 0} codes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredEntries.length > 0 ? (
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
                    <TableHead>Used At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <code className="px-2 py-1 bg-secondary rounded text-sm font-mono">
                          {entry.code}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">
                            {entry.profile?.full_name || 'Unknown'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {entry.profile?.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {entry.discount_type === 'percentage' ? (
                            <Percent className="w-3 h-3 text-muted-foreground" />
                          ) : (
                            <IndianRupee className="w-3 h-3 text-muted-foreground" />
                          )}
                          <span className="font-medium">
                            {formatDiscount(entry.discount_type, entry.discount_value)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(entry.status, entry.expires_at)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(entry.created_at), 'MMM d, yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>
                          <p>{format(new Date(entry.expires_at), 'MMM d, yyyy HH:mm')}</p>
                          {new Date(entry.expires_at) > new Date() && entry.status === 'active' && (
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(entry.expires_at), { addSuffix: true })}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {entry.used_at ? format(new Date(entry.used_at), 'MMM d, yyyy HH:mm') : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <Gift className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No spin wheel codes found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
