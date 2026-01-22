import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useVendorImpersonation } from '@/contexts/VendorImpersonationContext';
import { useVendorDashboard } from '@/hooks/useVendorDashboard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AIGrowthRecommendations } from '@/components/vendor/AIGrowthRecommendations';
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
  UserCog,
  Star,
  AlertTriangle,
  CheckCircle,
  Truck,
  MessageSquare,
  RefreshCw,
  Sparkles,
  Upload,
} from 'lucide-react';
import { format } from 'date-fns';

const quickActions = [
  { label: 'Add Product', icon: Plus, href: '/vendor/products/new', primary: true },
  { label: 'Bulk Upload', icon: Upload, href: '/vendor/products?tab=bulk' },
  { label: 'Inventory', icon: Package, href: '/vendor/products' },
  { label: 'Orders', icon: ShoppingCart, href: '/vendor/orders' },
  { label: 'Wallet', icon: Wallet, href: '/vendor/wallet' },
  { label: 'Analytics', icon: BarChart3, href: '/vendor/analytics' },
  { label: 'Settings', icon: Settings, href: '/vendor/settings' },
];

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-500',
    confirmed: 'bg-blue-500',
    processing: 'bg-purple-500',
    shipped: 'bg-indigo-500',
    delivered: 'bg-green-500',
    cancelled: 'bg-red-500',
  };
  return colors[status] || 'bg-gray-500';
};

export default function VendorDashboard() {
  const { user } = useAuth();
  const { impersonatedVendor, isImpersonating, stopImpersonation } = useVendorImpersonation();
  const { 
    stats, 
    recentOrders, 
    lowStockProducts, 
    recentReviews, 
    payoutInfo,
    isLoading,
    refetch 
  } = useVendorDashboard();

  const displayName = isImpersonating 
    ? impersonatedVendor?.brand_name 
    : user?.user_metadata?.full_name || 'Vendor';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

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
            <Button variant="ghost" size="icon" onClick={() => refetch()}>
              <RefreshCw className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              {(lowStockProducts?.length || 0) > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
              )}
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-success/10">
                <DollarSign className="w-5 h-5 text-success" />
              </div>
              <span className="text-sm font-medium text-success">This Month</span>
            </div>
            <p className="text-2xl font-bold">₹{stats?.totalSales?.toLocaleString() || 0}</p>
            <p className="text-sm text-muted-foreground">Total Sales</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-2xl p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-accent/10">
                <ShoppingCart className="w-5 h-5 text-accent" />
              </div>
              <Badge variant="outline">{stats?.pendingOrders || 0} pending</Badge>
            </div>
            <p className="text-2xl font-bold">{stats?.totalOrders || 0}</p>
            <p className="text-sm text-muted-foreground">Total Orders</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass rounded-2xl p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${(lowStockProducts?.length || 0) > 0 ? 'bg-warning/10' : 'bg-primary/10'}`}>
                <Package className={`w-5 h-5 ${(lowStockProducts?.length || 0) > 0 ? 'text-warning' : 'text-primary'}`} />
              </div>
              {(lowStockProducts?.length || 0) > 0 && (
                <Badge variant="outline" className="text-warning border-warning/50">
                  {lowStockProducts?.length} low stock
                </Badge>
              )}
            </div>
            <p className="text-2xl font-bold">{stats?.totalProducts || 0}</p>
            <p className="text-sm text-muted-foreground">Products</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass rounded-2xl p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-500/10">
                <Wallet className="w-5 h-5 text-green-500" />
              </div>
              <span className="text-xs text-muted-foreground">
                ₹{payoutInfo?.pending?.toLocaleString() || 0} pending
              </span>
            </div>
            <p className="text-2xl font-bold">₹{payoutInfo?.available?.toLocaleString() || 0}</p>
            <p className="text-sm text-muted-foreground">Available Balance</p>
          </motion.div>
        </div>

        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-5">
            <TabsTrigger value="orders" className="gap-2">
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline">Orders</span>
            </TabsTrigger>
            <TabsTrigger value="inventory" className="gap-2">
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">Inventory</span>
            </TabsTrigger>
            <TabsTrigger value="reviews" className="gap-2">
              <Star className="w-4 h-4" />
              <span className="hidden sm:inline">Reviews</span>
            </TabsTrigger>
            <TabsTrigger value="insights" className="gap-2">
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">AI Insights</span>
            </TabsTrigger>
            <TabsTrigger value="actions" className="gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Actions</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <div className="grid lg:grid-cols-3 gap-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="lg:col-span-2 glass rounded-2xl p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-lg">Recent Orders</h3>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/vendor/orders">View All</Link>
                  </Button>
                </div>
                
                {recentOrders && recentOrders.length > 0 ? (
                  <div className="space-y-4">
                    {recentOrders.map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-4 rounded-xl bg-secondary/50">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getStatusColor(order.status)}/10`}>
                            {order.status === 'delivered' ? (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : order.status === 'shipped' ? (
                              <Truck className="w-5 h-5 text-indigo-500" />
                            ) : (
                              <Clock className="w-5 h-5 text-yellow-500" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{order.sub_order_number}</p>
                            <p className="text-sm text-muted-foreground">
                              {order.order_items?.length || 0} item(s)
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">₹{order.total_amount?.toLocaleString()}</p>
                          <Badge variant="outline" className="text-xs capitalize">
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No orders yet</p>
                  </div>
                )}
              </motion.div>

              {/* Quick Actions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
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
          </TabsContent>

          <TabsContent value="inventory">
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  Low Stock Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {lowStockProducts && lowStockProducts.length > 0 ? (
                  <div className="space-y-4">
                    {lowStockProducts.map((product) => (
                      <div key={product.id} className="flex items-center justify-between p-4 rounded-xl bg-warning/5 border border-warning/20">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center overflow-hidden">
                            {product.primary_image ? (
                              <img src={product.primary_image} alt={product.title} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-6 h-6 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{product.title}</p>
                            <p className="text-sm text-muted-foreground">SKU: {product.sku || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="destructive" className="mb-1">
                            {product.stock} left
                          </Badge>
                          <p className="text-xs text-muted-foreground">
                            Threshold: {product.low_stock_threshold || 10}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-success opacity-50" />
                    <p>All products are well stocked!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews">
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  Recent Reviews
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentReviews && recentReviews.length > 0 ? (
                  <div className="space-y-4">
                    {recentReviews.map((review) => (
                      <div key={review.id} className="p-4 rounded-xl bg-secondary/50">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-4 h-4 ${star <= review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(review.created_at), 'MMM d, yyyy')}
                            </span>
                          </div>
                          {review.is_verified_purchase && (
                            <Badge variant="outline" className="text-xs text-success border-success/50">
                              Verified
                            </Badge>
                          )}
                        </div>
                        {review.title && (
                          <p className="font-medium mb-1">{review.title}</p>
                        )}
                        <p className="text-sm text-muted-foreground">{review.content}</p>
                        {!review.vendor_reply && (
                          <Button variant="ghost" size="sm" className="mt-2 gap-2">
                            <MessageSquare className="w-4 h-4" />
                            Reply
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No reviews yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insights">
            <AIGrowthRecommendations />
          </TabsContent>

          <TabsContent value="actions">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-2xl p-6"
            >
              <h3 className="font-semibold text-lg mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {quickActions.map((action) => (
                  <Link
                    key={action.label}
                    to={action.href}
                    className={`flex flex-col items-center gap-3 p-6 rounded-xl transition-all text-center ${
                      action.primary 
                        ? 'bg-accent text-accent-foreground hover:bg-accent/90' 
                        : 'bg-secondary/50 hover:bg-secondary'
                    }`}
                  >
                    <action.icon className="w-8 h-8" />
                    <span className="font-medium">{action.label}</span>
                  </Link>
                ))}
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>

        {/* Performance Chart Placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 glass rounded-2xl p-8 text-center"
        >
          <TrendingUp className="w-12 h-12 text-accent mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Sales Analytics</h3>
          <p className="text-muted-foreground max-w-md mx-auto mb-4">
            Track your sales trends, best-selling products, and customer insights with detailed analytics.
          </p>
          <Button variant="outline" className="btn-press" asChild>
            <Link to="/vendor/analytics">View Analytics</Link>
          </Button>
        </motion.div>
      </main>
    </div>
  );
}
