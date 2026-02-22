import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { format, formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Users,
  Search,
  Eye,
  Mail,
  Phone,
  ShoppingCart,
  Loader2,
  Calendar,
  CreditCard,
  TrendingUp,
  Crown,
  UserPlus,
  Repeat,
  Target,
  MapPin,
} from 'lucide-react';

interface Customer {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  address_book: any;
  order_count: number;
  total_spent: number;
  last_order_date: string | null;
  avg_order_value: number;
}

export function EnhancedCustomerManagement() {
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [activeSegment, setActiveSegment] = useState('all');

  const { data: customers, isLoading } = useQuery({
    queryKey: ['admin-customers-enhanced'],
    queryFn: async (): Promise<Customer[]> => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const customersWithStats = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: orders } = await supabase
            .from('orders')
            .select('total_amount, created_at')
            .eq('customer_id', profile.id)
            .in('payment_status', ['paid', 'escrow'])
            .order('created_at', { ascending: false });

          const orderCount = orders?.length || 0;
          const totalSpent = orders?.reduce((sum, o) => sum + o.total_amount, 0) || 0;
          const lastOrderDate = orders?.[0]?.created_at || null;
          const avgOrderValue = orderCount > 0 ? totalSpent / orderCount : 0;

          return {
            ...profile,
            order_count: orderCount,
            total_spent: totalSpent,
            last_order_date: lastOrderDate,
            avg_order_value: avgOrderValue,
          };
        })
      );

      return customersWithStats;
    },
  });

  // Fetch customer orders for detail view
  const { data: customerOrders } = useQuery({
    queryKey: ['customer-orders', selectedCustomer?.id],
    queryFn: async () => {
      if (!selectedCustomer?.id) return [];
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', selectedCustomer.id)
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!selectedCustomer?.id,
  });

  const filteredCustomers = customers?.filter((customer) => {
    const matchesSearch =
      customer.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      customer.email.toLowerCase().includes(search.toLowerCase()) ||
      customer.phone?.includes(search);

    if (activeSegment === 'all') return matchesSearch;
    if (activeSegment === 'active') return matchesSearch && customer.order_count > 0;
    if (activeSegment === 'new') {
      const isNew = new Date(customer.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      return matchesSearch && isNew;
    }
    if (activeSegment === 'vip') return matchesSearch && customer.total_spent >= 50000;
    if (activeSegment === 'inactive') {
      if (!customer.last_order_date) return matchesSearch;
      const isInactive = new Date(customer.last_order_date) < new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      return matchesSearch && isInactive;
    }
    return matchesSearch;
  });

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate stats
  const stats = {
    total: customers?.length || 0,
    active: customers?.filter(c => c.order_count > 0).length || 0,
    newThisMonth: customers?.filter(c => new Date(c.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length || 0,
    vip: customers?.filter(c => c.total_spent >= 50000).length || 0,
    totalRevenue: customers?.reduce((sum, c) => sum + c.total_spent, 0) || 0,
    avgOrderValue: customers && customers.length > 0 
      ? customers.reduce((sum, c) => sum + c.avg_order_value, 0) / customers.filter(c => c.order_count > 0).length 
      : 0,
    repeatRate: customers && customers.length > 0
      ? (customers.filter(c => c.order_count > 1).length / customers.filter(c => c.order_count > 0).length) * 100
      : 0,
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
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {[
          { label: 'Total Customers', value: stats.total, icon: Users, color: 'text-info', bg: 'bg-info/10' },
          { label: 'Active Buyers', value: stats.active, icon: ShoppingCart, color: 'text-success', bg: 'bg-success/10' },
          { label: 'New (30d)', value: stats.newThisMonth, icon: UserPlus, color: 'text-accent', bg: 'bg-accent/10' },
          { label: 'VIP (₹50k+)', value: stats.vip, icon: Crown, color: 'text-warning', bg: 'bg-warning/10' },
          { label: 'Total Revenue', value: formatPrice(stats.totalRevenue), icon: CreditCard, color: 'text-success', bg: 'bg-success/10' },
          { label: 'Avg Order', value: formatPrice(stats.avgOrderValue || 0), icon: Target, color: 'text-warning', bg: 'bg-warning/10' },
          { label: 'Repeat Rate', value: `${(stats.repeatRate || 0).toFixed(1)}%`, icon: Repeat, color: 'text-info', bg: 'bg-info/10' },
        ].map((stat, i) => (
          <Card key={i} className="glass">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-lg font-bold truncate">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Segment Tabs & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <Tabs value={activeSegment} onValueChange={setActiveSegment}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="new">New</TabsTrigger>
            <TabsTrigger value="vip">VIP</TabsTrigger>
            <TabsTrigger value="inactive">Inactive</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full md:w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Customers Table */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Customers ({filteredCustomers?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Total Spent</TableHead>
                  <TableHead>Avg Order</TableHead>
                  <TableHead>Last Order</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers?.map((customer, index) => (
                  <motion.tr
                    key={customer.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="border-b border-border hover:bg-secondary/20 cursor-pointer"
                    onClick={() => setSelectedCustomer(customer)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center text-white font-bold">
                          {(customer.full_name || customer.email)[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{customer.full_name || 'Unnamed'}</p>
                            {customer.total_spent >= 50000 && (
                              <Crown className="w-4 h-4 text-warning" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate max-w-[150px]">{customer.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-3 h-3 text-muted-foreground" />
                          <span className="truncate max-w-[120px]">{customer.email}</span>
                        </div>
                        {customer.phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-3 h-3 text-muted-foreground" />
                            <span>{customer.phone}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={customer.order_count > 0 ? 'default' : 'secondary'}>
                        {customer.order_count} orders
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatPrice(customer.total_spent)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {customer.order_count > 0 ? formatPrice(customer.avg_order_value) : '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {customer.last_order_date 
                        ? formatDistanceToNow(new Date(customer.last_order_date), { addSuffix: true })
                        : 'Never'
                      }
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(customer.created_at), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCustomer(customer);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Customer Detail Dialog */}
      <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center text-white text-xl font-bold">
                {(selectedCustomer?.full_name || selectedCustomer?.email || '?')[0].toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span>{selectedCustomer?.full_name || 'Unnamed Customer'}</span>
                  {(selectedCustomer?.total_spent || 0) >= 50000 && (
                    <Badge className="bg-warning text-warning-foreground">VIP</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground font-normal">{selectedCustomer?.email}</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-150px)]">
            {selectedCustomer && (
              <div className="space-y-6 pr-4">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-secondary/50">
                    <p className="text-sm text-muted-foreground">Total Orders</p>
                    <p className="text-2xl font-bold">{selectedCustomer.order_count}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-secondary/50">
                    <p className="text-sm text-muted-foreground">Total Spent</p>
                    <p className="text-2xl font-bold">{formatPrice(selectedCustomer.total_spent)}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-secondary/50">
                    <p className="text-sm text-muted-foreground">Avg Order</p>
                    <p className="text-2xl font-bold">{formatPrice(selectedCustomer.avg_order_value)}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-secondary/50">
                    <p className="text-sm text-muted-foreground">Customer Since</p>
                    <p className="text-lg font-bold">{format(new Date(selectedCustomer.created_at), 'MMM yyyy')}</p>
                  </div>
                </div>

                {/* Contact Info */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 py-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                      <Mail className="w-5 h-5 text-muted-foreground" />
                      <span>{selectedCustomer.email}</span>
                    </div>
                    {selectedCustomer.phone && (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                        <Phone className="w-5 h-5 text-muted-foreground" />
                        <span>{selectedCustomer.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                      <Calendar className="w-5 h-5 text-muted-foreground" />
                      <span>Joined {format(new Date(selectedCustomer.created_at), 'MMMM dd, yyyy')}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Saved Addresses */}
                {selectedCustomer.address_book && Array.isArray(selectedCustomer.address_book) && selectedCustomer.address_book.length > 0 && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Saved Addresses ({selectedCustomer.address_book.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 py-3">
                      {selectedCustomer.address_book.slice(0, 3).map((addr: any, i: number) => (
                        <div key={i} className="p-3 rounded-lg bg-secondary/30 text-sm">
                          <p className="font-medium">{addr.name}</p>
                          <p className="text-muted-foreground">{addr.address}</p>
                          <p className="text-muted-foreground">{addr.city}, {addr.state} {addr.pincode}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Recent Orders */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4" />
                      Recent Orders
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-3">
                    {customerOrders && customerOrders.length > 0 ? (
                      <div className="space-y-3">
                        {customerOrders.map((order: any) => (
                          <div key={order.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                            <div>
                              <p className="font-medium font-mono text-sm">{order.order_number}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(order.created_at), 'MMM dd, yyyy')}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">{formatPrice(order.total_amount)}</p>
                              <Badge variant="secondary" className="text-xs">
                                {order.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-4">No orders yet</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedCustomer(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
