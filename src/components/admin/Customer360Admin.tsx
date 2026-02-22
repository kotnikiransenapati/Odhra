import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Customer360View } from './Customer360View';
import { Search, Users, Mail, ArrowRight, Crown } from 'lucide-react';
import { format } from 'date-fns';

export function Customer360Admin() {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: customers, isLoading } = useQuery({
    queryKey: ['admin-customers-360'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url, created_at')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;

      // Get loyalty data
      const userIds = data?.map(p => p.id) || [];
      const { data: loyalty } = await supabase
        .from('loyalty_points')
        .select('user_id, tier, lifetime_points')
        .in('user_id', userIds);

      const { data: orderCounts } = await supabase
        .from('orders')
        .select('customer_id')
        .in('customer_id', userIds);

      const orderMap: Record<string, number> = {};
      orderCounts?.forEach(o => {
        orderMap[o.customer_id] = (orderMap[o.customer_id] || 0) + 1;
      });

      const loyaltyMap: Record<string, any> = {};
      loyalty?.forEach(l => { loyaltyMap[l.user_id] = l; });

      return data?.map(p => ({
        ...p,
        loyalty: loyaltyMap[p.id],
        orderCount: orderMap[p.id] || 0,
      })) || [];
    },
  });

  const filtered = customers?.filter(c =>
    c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (selectedCustomerId) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setSelectedCustomerId(null)} className="gap-2">
          ← Back to Customers
        </Button>
        <Customer360View customerId={selectedCustomerId} onClose={() => setSelectedCustomerId(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Customer 360° View</h2>
        <p className="text-muted-foreground">Deep-dive into any customer's complete profile</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="grid gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered?.map(customer => (
            <Card
              key={customer.id}
              className="cursor-pointer hover:border-accent/50 transition-colors"
              onClick={() => setSelectedCustomerId(customer.id)}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                    {customer.avatar_url ? (
                      <img src={customer.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <Users className="w-5 h-5 text-accent" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold">{customer.full_name || 'Unnamed'}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {customer.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium">{customer.orderCount} orders</p>
                    {customer.loyalty?.tier && (
                      <Badge variant="outline" className="capitalize text-xs gap-1">
                        <Crown className="w-3 h-3" />
                        {customer.loyalty.tier}
                      </Badge>
                    )}
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered?.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No customers found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
