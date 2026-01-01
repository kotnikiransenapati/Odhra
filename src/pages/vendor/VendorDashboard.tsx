import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useVendorImpersonation } from '@/contexts/VendorImpersonationContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Store, 
  Package, 
  ShoppingCart, 
  Wallet, 
  BarChart3, 
  Settings,
  Bell,
  ArrowLeft,
  Plus,
  TrendingUp,
  DollarSign,
  Eye,
  Clock,
  X,
  UserCog
} from 'lucide-react';

const stats = [
  { label: 'Total Sales', value: '₹2,45,000', change: '+18.5%', icon: DollarSign, positive: true },
  { label: 'Orders', value: '89', change: '+12', icon: ShoppingCart, positive: true },
  { label: 'Products', value: '34', change: '2 low stock', icon: Package, positive: false },
  { label: 'Page Views', value: '1,234', change: '+8%', icon: Eye, positive: true },
];

const recentOrders = [
  { id: 'ORD-1234', customer: 'John Doe', amount: '₹2,499', status: 'Processing', time: '2 min ago' },
  { id: 'ORD-1233', customer: 'Jane Smith', amount: '₹4,999', status: 'Shipped', time: '1 hour ago' },
  { id: 'ORD-1232', customer: 'Mike Johnson', amount: '₹1,299', status: 'Delivered', time: '3 hours ago' },
];

const quickActions = [
  { label: 'Add Product', icon: Plus, href: '/vendor/products/new', primary: true },
  { label: 'Inventory', icon: Package, href: '/vendor/products' },
  { label: 'Orders', icon: ShoppingCart, href: '/vendor/orders' },
  { label: 'Wallet', icon: Wallet, href: '/vendor/wallet' },
  { label: 'Analytics', icon: BarChart3, href: '/vendor/analytics' },
  { label: 'Settings', icon: Settings, href: '/vendor/settings' },
];

export default function VendorDashboard() {
  const { user } = useAuth();
  const { impersonatedVendor, isImpersonating, stopImpersonation } = useVendorImpersonation();

  const displayName = isImpersonating 
    ? impersonatedVendor?.brand_name 
    : user?.user_metadata?.full_name || 'Vendor';

  return (
    <div className="min-h-screen bg-background">
      {/* Impersonation Banner */}
      {isImpersonating && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-warning text-warning-foreground px-4 py-2 flex items-center justify-center gap-3"
        >
          <UserCog className="w-4 h-4" />
          <span className="text-sm font-medium">
            Viewing as: <strong>{impersonatedVendor?.brand_name}</strong>
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={stopImpersonation}
            className="h-7 gap-1 text-warning-foreground hover:bg-warning-foreground/10"
          >
            <X className="w-3 h-3" />
            Exit
          </Button>
        </motion.div>
      )}

      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to={isImpersonating ? "/admin" : "/"}><ArrowLeft className="w-5 h-5" /></Link>
            </Button>
            <div className="flex items-center gap-3">
              {isImpersonating && impersonatedVendor?.logo_url ? (
                <img
                  src={impersonatedVendor.logo_url}
                  alt={impersonatedVendor.brand_name}
                  className="w-10 h-10 rounded-xl object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Store className="w-5 h-5 text-accent" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-bold text-lg">Vendor Dashboard</h1>
                  {isImpersonating && (
                    <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 text-xs">
                      Admin View
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {isImpersonating ? impersonatedVendor?.user_email : 'Manage your store'}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full" />
            </Button>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{displayName}</p>
              <p className="text-xs text-muted-foreground">
                {isImpersonating ? impersonatedVendor?.user_email : user?.email}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h2 className="text-2xl font-bold mb-1">
              {isImpersonating 
                ? `Viewing: ${impersonatedVendor?.brand_name}` 
                : `Good morning, ${user?.user_metadata?.full_name?.split(' ')[0] || 'Seller'}!`}
            </h2>
            <p className="text-muted-foreground">
              {isImpersonating 
                ? 'Admin impersonation mode - viewing vendor dashboard'
                : "Here's how your store is performing."}
            </p>
          </div>
          <Button className="btn-press gap-2" asChild>
            <Link to="/vendor/products/new">
              <Plus className="w-4 h-4" /> Add Product
            </Link>
          </Button>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass rounded-2xl p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.positive ? 'bg-success/10' : 'bg-warning/10'}`}>
                  <stat.icon className={`w-5 h-5 ${stat.positive ? 'text-success' : 'text-warning'}`} />
                </div>
                <span className={`text-sm font-medium ${stat.positive ? 'text-success' : 'text-warning'}`}>
                  {stat.change}
                </span>
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Recent Orders */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2 glass rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-lg">Recent Orders</h3>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/vendor/orders">View All</Link>
              </Button>
            </div>
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 rounded-xl bg-secondary/50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                      <ShoppingCart className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="font-medium">{order.id}</p>
                      <p className="text-sm text-muted-foreground">{order.customer}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{order.amount}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {order.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass rounded-2xl p-6"
          >
            <h3 className="font-semibold text-lg mb-4">Quick Actions</h3>
            <div className="space-y-3">
              {quickActions.map((action) => (
                <Link
                  key={action.label}
                  to={action.href}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                    action.primary 
                      ? 'bg-accent text-accent-foreground hover:bg-accent/90' 
                      : 'bg-secondary/50 hover:bg-secondary'
                  }`}
                >
                  <action.icon className="w-5 h-5" />
                  <span className="font-medium">{action.label}</span>
                </Link>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Performance Placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8 glass rounded-2xl p-8 text-center"
        >
          <TrendingUp className="w-12 h-12 text-accent mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Sales Analytics</h3>
          <p className="text-muted-foreground max-w-md mx-auto mb-4">
            Track your sales trends, best-selling products, and customer insights with detailed analytics.
          </p>
          <Button variant="outline" className="btn-press">View Analytics</Button>
        </motion.div>
      </main>
    </div>
  );
}
