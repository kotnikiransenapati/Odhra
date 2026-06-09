import React from 'react';
import { motion } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import { haptic } from '@/lib/haptics';
import { useAuth } from '@/contexts/AuthContext';
import { useVendorImpersonation } from '@/contexts/VendorImpersonationContext';
import { useVendorDashboard } from '@/hooks/useVendorDashboard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AIGrowthRecommendations } from '@/components/vendor/AIGrowthRecommendations';
import { VendorSupportPanel } from '@/components/vendor/VendorSupportPanel';
import { VendorOnboardingChecklist } from '@/components/vendor/VendorOnboardingChecklist';
import { VendorNotificationCenter } from '@/components/vendor/VendorNotificationCenter';
import { VendorScorecard } from '@/components/vendor/VendorScorecard';
import { VendorInsightsPulse } from '@/components/vendor/VendorInsightsPulse';
import { VendorBulkOrderActions } from '@/components/vendor/VendorBulkOrderActions';
import { 
  Store, Package, ShoppingCart, Wallet, BarChart3, Settings,
  Bell, ArrowLeft, Plus, TrendingUp, DollarSign, Eye, Clock, X,
  UserCog, Star, AlertTriangle, CheckCircle, Truck, MessageSquare,
  RefreshCw, Sparkles, Upload, ArrowUpRight, ChevronRight, Award,
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
    pending: 'bg-warning/10 text-warning',
    confirmed: 'bg-info/10 text-info',
    processing: 'bg-accent/10 text-accent',
    shipped: 'bg-primary/10 text-primary',
    delivered: 'bg-success/10 text-success',
    cancelled: 'bg-destructive/10 text-destructive',
  };
  return colors[status] || 'bg-muted text-muted-foreground';
};

const getStatusIcon = (status: string) => {
  if (status === 'delivered') return <CheckCircle className="w-4 h-4" />;
  if (status === 'shipped') return <Truck className="w-4 h-4" />;
  if (status === 'cancelled') return <X className="w-4 h-4" />;
  return <Clock className="w-4 h-4" />;
};

export default function VendorDashboard() {
  const { user } = useAuth();
  const { impersonatedVendor, isImpersonating, stopImpersonation } = useVendorImpersonation();
  const { stats, recentOrders, lowStockProducts, recentReviews, payoutInfo, isLoading, refetch } = useVendorDashboard();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'orders';
  const handleTabChange = (v: string) => {
    haptic('light');
    const next = new URLSearchParams(searchParams);
    if (v === 'orders') next.delete('tab'); else next.set('tab', v);
    setSearchParams(next, { replace: true });
  };
  const handleRefresh = () => { haptic('light'); refetch(); };

  const displayName = isImpersonating 
    ? impersonatedVendor?.brand_name 
    : user?.user_metadata?.full_name || 'Vendor';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6 lg:p-10">
        <div className="max-w-7xl mx-auto space-y-8">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-36 rounded-2xl" />)}
          </div>
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <a href="#vendor-main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-accent focus:text-accent-foreground focus:shadow-lg">Skip to main content</a>
      {/* Impersonation Banner */}
      {isImpersonating && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-warning text-warning-foreground px-4 py-2.5 flex items-center justify-center gap-3"
        >
          <UserCog className="w-4 h-4" />
          <span className="text-sm font-medium">
            Viewing as: <strong>{impersonatedVendor?.brand_name}</strong>
          </span>
          <Button variant="ghost" size="sm" onClick={stopImpersonation} className="h-7 gap-1 text-warning-foreground hover:bg-warning-foreground/10">
            <X className="w-3 h-3" /> Exit
          </Button>
        </motion.div>
      )}

      {/* Header — Bold editorial style */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="rounded-xl min-h-11 min-w-11" asChild>
              <Link to={isImpersonating ? "/admin" : "/"} aria-label="Back to home"><ArrowLeft className="w-5 h-5" /></Link>
            </Button>
            <div className="flex items-center gap-3">
              {isImpersonating && impersonatedVendor?.logo_url ? (
                <img src={impersonatedVendor.logo_url} alt={impersonatedVendor.brand_name} className="w-10 h-10 rounded-xl object-cover border border-border/50" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20 flex items-center justify-center">
                  <Store className="w-5 h-5 text-accent" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-bold text-lg tracking-tight">Seller Hub</h1>
                  {isImpersonating && (
                    <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 text-xs">Admin View</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{isImpersonating ? impersonatedVendor?.user_email : 'Manage your store'}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="rounded-xl min-h-11 min-w-11" onClick={handleRefresh} aria-label="Refresh dashboard data">
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="relative rounded-xl min-h-11 min-w-11"
              aria-label={`Notifications${(lowStockProducts?.length || 0) > 0 ? ` (${lowStockProducts!.length} low-stock alerts)` : ''}`}
              onClick={() => { haptic('light'); handleTabChange('notifications'); }}
            >
              <Bell className="w-4 h-4" />
              {(lowStockProducts?.length || 0) > 0 && (
                <span aria-hidden="true" className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
              )}
            </Button>
            <div className="text-right hidden sm:block ml-2">
              <p className="text-sm font-semibold">{displayName}</p>
              <p className="text-xs text-muted-foreground">{isImpersonating ? impersonatedVendor?.user_email : user?.email}</p>
            </div>
          </div>
        </div>
      </header>

      <main id="vendor-main" tabIndex={-1} className="max-w-7xl mx-auto px-4 lg:px-8 py-8 focus:outline-none" aria-labelledby="vendor-dashboard-heading">
        {/* Welcome — Editorial hero section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-accent uppercase tracking-widest mb-1">
                {isImpersonating ? 'Admin View' : greeting}
              </p>
              <h2 id="vendor-dashboard-heading" className="text-3xl lg:text-4xl font-bold tracking-tight mb-2">
                {isImpersonating ? impersonatedVendor?.brand_name : user?.user_metadata?.full_name?.split(' ')[0] || 'Seller'}
              </h2>
              <p className="text-muted-foreground text-sm">
                {isImpersonating ? 'Admin impersonation mode' : "Here's your store performance at a glance."}
              </p>
            </div>
            <Button className="gap-2 shadow-md" asChild>
              <Link to="/vendor/products/new">
                <Plus className="w-4 h-4" /> Add Product
              </Link>
            </Button>
          </div>
        </motion.div>

        {/* Stats Grid — Bold card design */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10" role="list" aria-label="Store performance summary">
          {[
            { label: 'Total Sales', value: `₹${stats?.totalSales?.toLocaleString() || 0}`, sub: 'This Month', icon: DollarSign, color: 'from-success/15 to-success/5 border-success/20', iconColor: 'text-success', href: '/vendor/analytics' },
            { label: 'Total Orders', value: stats?.totalOrders || 0, sub: `${stats?.pendingOrders || 0} pending`, icon: ShoppingCart, color: 'from-accent/15 to-accent/5 border-accent/20', iconColor: 'text-accent', href: '/vendor/orders' },
            { label: 'Products', value: stats?.totalProducts || 0, sub: lowStockProducts?.length ? `${lowStockProducts.length} low stock` : 'All stocked', icon: Package, color: lowStockProducts?.length ? 'from-warning/15 to-warning/5 border-warning/20' : 'from-primary/10 to-primary/5 border-primary/15', iconColor: lowStockProducts?.length ? 'text-warning' : 'text-primary', href: '/vendor/products' },
            { label: 'Balance', value: `₹${payoutInfo?.available?.toLocaleString() || 0}`, sub: `₹${payoutInfo?.pending?.toLocaleString() || 0} pending`, icon: Wallet, color: 'from-info/15 to-info/5 border-info/20', iconColor: 'text-info', href: '/vendor/wallet' },
          ].map((stat, i) => (
            <Link key={stat.label} to={stat.href} role="listitem" aria-label={`${stat.label}: ${stat.value}. ${stat.sub}`}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${stat.color} p-5 lg:p-6 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl bg-background/60 backdrop-blur-sm flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
                </div>
                <span className="text-xs text-muted-foreground font-medium">{stat.sub}</span>
              </div>
              <p className="text-2xl lg:text-3xl font-bold tracking-tight">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">{stat.label}</p>
            </motion.div>
            </Link>
          ))}
        </div>

        {/* Tabs — Cleaner layout */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="h-auto p-1 bg-secondary/50 rounded-xl flex flex-wrap gap-1 w-full max-w-4xl">
            {[
              { value: 'orders', icon: ShoppingCart, label: 'Orders' },
              { value: 'pulse', icon: Sparkles, label: 'Pulse' },
              { value: 'bulk', icon: Truck, label: 'Bulk Ship' },
              { value: 'scorecard', icon: Award, label: 'Scorecard' },
              { value: 'inventory', icon: Package, label: 'Inventory' },
              { value: 'notifications', icon: Bell, label: 'Notifications' },
              { value: 'reviews', icon: Star, label: 'Reviews' },
              { value: 'insights', icon: Sparkles, label: 'AI Insights' },
              { value: 'support', icon: MessageSquare, label: 'Support' },
              { value: 'onboarding', icon: CheckCircle, label: 'Setup' },
              { value: 'actions', icon: Settings, label: 'Actions' },
            ].map(tab => (
              <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-3 py-2 text-xs sm:text-sm">
                <tab.icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <div className="grid lg:grid-cols-5 gap-6">
              <div className="lg:col-span-3">
                <Card className="border-border/40">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Recent Orders</CardTitle>
                      <Button variant="ghost" size="sm" className="gap-1 text-xs" asChild>
                        <Link to="/vendor/orders">View All <ChevronRight className="w-3 h-3" /></Link>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {recentOrders && recentOrders.length > 0 ? (
                      <div className="space-y-3">
                        {recentOrders.map((order) => (
                          <Link key={order.id} to="/vendor/orders" className="flex items-center justify-between p-3.5 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors group">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${getStatusColor(order.status)}`}>
                                {getStatusIcon(order.status)}
                              </div>
                              <div>
                                <p className="font-semibold text-sm">{order.sub_order_number}</p>
                                <p className="text-xs text-muted-foreground">{order.order_items?.length || 0} item(s)</p>
                              </div>
                            </div>
                            <div className="text-right flex items-center gap-3">
                              <div>
                                <p className="font-bold text-sm">₹{order.total_amount?.toLocaleString()}</p>
                                <Badge variant="outline" className="text-[10px] capitalize">{order.status}</Badge>
                              </div>
                              <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-16 text-muted-foreground">
                        <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">No orders yet</p>
                        <p className="text-xs mt-1">Orders will appear here once customers purchase your products.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions — Sidebar */}
              <div className="lg:col-span-2">
                <Card className="border-border/40">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {quickActions.map((action) => (
                        <Link
                          key={action.label}
                          to={action.href}
                          className={`flex items-center gap-3 p-3 rounded-xl transition-all group ${
                            action.primary 
                              ? 'bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm' 
                              : 'hover:bg-secondary/60'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${action.primary ? 'bg-accent-foreground/10' : 'bg-secondary'}`}>
                            <action.icon className="w-4 h-4" />
                          </div>
                          <span className="font-medium text-sm flex-1">{action.label}</span>
                          <ChevronRight className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ${action.primary ? '' : 'text-muted-foreground'}`} />
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Scorecard Tab */}
          <TabsContent value="scorecard">
            <VendorScorecard />
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <VendorNotificationCenter />
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory">
            <Card className="border-border/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertTriangle className="w-5 h-5 text-warning" /> Low Stock Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {lowStockProducts && lowStockProducts.length > 0 ? (
                  <div className="space-y-3">
                    {lowStockProducts.map((product) => (
                      <Link key={product.id} to={`/vendor/products/${product.id}/edit`} className="flex items-center justify-between p-4 rounded-xl bg-warning/5 border border-warning/15 hover:bg-warning/10 transition-colors group">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center overflow-hidden group-hover:ring-2 ring-accent/30 transition-all">
                            {product.primary_image ? (
                              <img src={product.primary_image} alt={product.title} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-6 h-6 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-sm group-hover:text-accent transition-colors">{product.title}</p>
                            <p className="text-xs text-muted-foreground">SKU: {product.sku || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <div>
                            <Badge variant="destructive" className="mb-1">{product.stock} left</Badge>
                            <p className="text-xs text-muted-foreground">Threshold: {product.low_stock_threshold || 10}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 text-muted-foreground">
                    <CheckCircle className="w-10 h-10 mx-auto mb-3 text-success opacity-40" />
                    <p className="font-medium">All products are well stocked!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews">
            <Card className="border-border/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Star className="w-5 h-5 text-accent" /> Recent Reviews
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentReviews && recentReviews.length > 0 ? (
                  <div className="space-y-4">
                    {recentReviews.map((review) => (
                      <div key={review.id} className="p-4 rounded-xl bg-secondary/30">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star key={star} className={`w-3.5 h-3.5 ${star <= review.rating ? 'text-accent fill-accent' : 'text-muted-foreground/30'}`} />
                              ))}
                            </div>
                            <span className="text-xs text-muted-foreground">{format(new Date(review.created_at), 'MMM d, yyyy')}</span>
                          </div>
                          {review.is_verified_purchase && (
                            <Badge variant="outline" className="text-[10px] text-success border-success/30">Verified</Badge>
                          )}
                        </div>
                        {review.title && <p className="font-semibold text-sm mb-1">{review.title}</p>}
                        <p className="text-sm text-muted-foreground leading-relaxed">{review.content}</p>
                        {!review.vendor_reply && (
                          <Button variant="ghost" size="sm" className="mt-2 gap-1.5 text-xs h-7">
                            <MessageSquare className="w-3 h-3" /> Reply
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 text-muted-foreground">
                    <Star className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No reviews yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insights"><AIGrowthRecommendations /></TabsContent>
          <TabsContent value="support"><VendorSupportPanel /></TabsContent>
          <TabsContent value="onboarding"><VendorOnboardingChecklist /></TabsContent>

          {/* Actions Tab */}
          <TabsContent value="actions">
            <Card className="border-border/40">
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {quickActions.map((action) => (
                    <Link
                      key={action.label}
                      to={action.href}
                      className={`flex flex-col items-center gap-3 p-5 rounded-xl transition-all text-center group hover:-translate-y-0.5 ${
                        action.primary 
                          ? 'bg-accent text-accent-foreground shadow-md hover:shadow-lg' 
                          : 'bg-secondary/40 hover:bg-secondary/60 border border-border/30'
                      }`}
                    >
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${action.primary ? 'bg-accent-foreground/10' : 'bg-background'}`}>
                        <action.icon className="w-5 h-5" />
                      </div>
                      <span className="font-medium text-sm">{action.label}</span>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Performance CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-10 relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-primary/5 to-accent/5 p-8 lg:p-10 text-center"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3" />
          <TrendingUp className="w-10 h-10 text-accent mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2 tracking-tight">Sales Analytics</h3>
          <p className="text-muted-foreground max-w-md mx-auto mb-6 text-sm">
            Track sales trends, best-sellers, and customer insights with detailed analytics.
          </p>
          <Button variant="outline" className="gap-2" asChild>
            <Link to="/vendor/analytics">
              View Analytics <ArrowUpRight className="w-4 h-4" />
            </Link>
          </Button>
        </motion.div>
      </main>
    </div>
  );
}