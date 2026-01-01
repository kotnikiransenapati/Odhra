import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrderCard } from '@/components/orders/OrderCard';
import { useOrders } from '@/hooks/useOrders';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeft,
  Search,
  Package,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

const statusFilters = [
  { value: 'all', label: 'All Orders' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function Orders() {
  const { user } = useAuth();
  const { data: orders, isLoading } = useOrders();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Filter orders
  const filteredOrders = orders?.filter((order) => {
    const matchesSearch =
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.sub_orders.some((so) =>
        so.items.some((item) =>
          item.product_title.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );

    const matchesStatus =
      statusFilter === 'all' || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Redirect to login if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center h-[60vh] px-4">
          <ShieldCheck className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Login Required</h2>
          <p className="text-muted-foreground mb-6">
            Please login to view your orders
          </p>
          <Button asChild>
            <Link to="/auth">Login / Sign Up</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-24 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Button variant="ghost" asChild className="mb-4">
              <Link to="/account" className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Back to Account
              </Link>
            </Button>
            <h1 className="text-display-sm md:text-display-md font-bold">
              My Orders
            </h1>
            <p className="text-muted-foreground mt-2">
              Track, return, or buy things again
            </p>
          </motion.div>

          {/* Search and Filter */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6 space-y-4"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search orders by ID or product name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
              <TabsList className="w-full flex-wrap h-auto gap-1 bg-transparent p-0">
                {statusFilters.map((filter) => (
                  <TabsTrigger
                    key={filter.value}
                    value={filter.value}
                    className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
                  >
                    {filter.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </motion.div>

          {/* Orders List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
          ) : filteredOrders && filteredOrders.length > 0 ? (
            <div className="space-y-4">
              {filteredOrders.map((order, index) => (
                <OrderCard key={order.id} order={order} index={index} />
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                <Package className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">
                {searchQuery || statusFilter !== 'all'
                  ? 'No orders found'
                  : 'No orders yet'}
              </h2>
              <p className="text-muted-foreground mb-8">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your search or filter'
                  : "When you place orders, they'll appear here"}
              </p>
              <Button asChild>
                <Link to="/shop">Start Shopping</Link>
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
