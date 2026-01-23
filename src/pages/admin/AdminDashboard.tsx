import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMyAdminPermissions } from '@/hooks/useAdminPermissions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { EnhancedOverview } from '@/components/admin/EnhancedOverview';
import { AdvancedAnalytics } from '@/components/admin/AdvancedAnalytics';
import { VendorManagement } from '@/components/admin/VendorManagement';
import { EnhancedOrderManagement } from '@/components/admin/EnhancedOrderManagement';
import { PayoutManagement } from '@/components/admin/PayoutManagement';
import { ReviewModeration } from '@/components/admin/ReviewModeration';
import { SystemSettings } from '@/components/admin/SystemSettings';
import { ProductCatalog } from '@/components/admin/ProductCatalog';
import { CategoryManager } from '@/components/admin/CategoryManager';
import { PromotionsManager } from '@/components/admin/PromotionsManager';
import { SpinWheelManager } from '@/components/admin/SpinWheelManager';
import { SpinWheelCodesManager } from '@/components/admin/SpinWheelCodesManager';
import { EnhancedCustomerManagement } from '@/components/admin/EnhancedCustomerManagement';
import { NotificationCenter } from '@/components/admin/NotificationCenter';
import { AdminNotificationManager } from '@/components/admin/AdminNotificationManager';
import { CMSManager } from '@/components/admin/CMSManager';
import { SupportTicketManager } from '@/components/admin/SupportTicketManager';
import { AuditLogViewer } from '@/components/admin/AuditLogViewer';
import { LoyaltyManagement } from '@/components/admin/LoyaltyManagement';
import { ReturnManagement } from '@/components/admin/ReturnManagement';
import { DisputeManagement } from '@/components/admin/DisputeManagement';
import { FeatureFlagsManager } from '@/components/admin/FeatureFlagsManager';
import { AdminManagement } from '@/components/admin/AdminManagement';
import { usePendingReviewsCount } from '@/hooks/useAdmin';
import { useAdvancedAnalytics } from '@/hooks/useAdminAnalytics';
import {
  LayoutDashboard,
  Store,
  ShoppingCart,
  Wallet,
  Bell,
  ArrowLeft,
  Settings,
  Menu,
  MessageSquare,
  Package,
  Tags,
  FolderTree,
  Gift,
  Users,
  BarChart3,
  Palette,
  Shield,
  Search,
  ChevronDown,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  Headphones,
  History,
  ToggleLeft,
  UserCog,
  Lock,
  TrendingUp,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// Permission mapping for each admin section
const SECTION_PERMISSIONS: Record<string, string[]> = {
  'overview': ['dashboard.view'],
  'analytics': ['analytics.view'],
  'orders': ['orders.view'],
  'products': ['products.view'],
  'categories': ['products.view'],
  'vendors': ['vendors.view'],
  'customers': ['customers.view'],
  'reviews': ['reviews.view'],
  'payouts': ['finance.view'],
  'returns': ['orders.view'],
  'disputes': ['disputes.view'],
  'support': ['support.view'],
  'cms': ['cms.edit'],
  'promotions': ['promotions.view'],
  'loyalty': ['promotions.view'],
  'spinwheel': ['promotions.edit'],
  'spinwheel-codes': ['promotions.edit'],
  'email-campaigns': ['notifications.send'],
  'push-notifications': ['notifications.send'],
  'admin-management': ['admins.manage'],
  'feature-flags': ['settings.edit'],
  'audit-logs': ['security.audit'],
  'settings': ['settings.view'],
};

// Navigation structure with permission requirements
interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: boolean;
  permissions?: string[];
}

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    id: 'main',
    label: 'Main',
    items: [
      { id: 'overview', label: 'Dashboard', icon: LayoutDashboard, permissions: ['dashboard.view'] },
      { id: 'analytics', label: 'Analytics', icon: BarChart3, permissions: ['analytics.view'] },
    ],
  },
  {
    id: 'commerce',
    label: 'Commerce',
    items: [
      { id: 'orders', label: 'Orders', icon: ShoppingCart, permissions: ['orders.view'] },
      { id: 'products', label: 'Products', icon: Package, permissions: ['products.view'] },
      { id: 'categories', label: 'Categories', icon: FolderTree, permissions: ['products.view'] },
    ],
  },
  {
    id: 'users',
    label: 'Users & Vendors',
    items: [
      { id: 'vendors', label: 'Vendors', icon: Store, permissions: ['vendors.view'] },
      { id: 'customers', label: 'Customers', icon: Users, permissions: ['customers.view'] },
      { id: 'reviews', label: 'Reviews', icon: MessageSquare, badge: true, permissions: ['reviews.view'] },
      { id: 'payouts', label: 'Payouts', icon: Wallet, permissions: ['finance.view'] },
      { id: 'returns', label: 'Returns', icon: RotateCcw, permissions: ['orders.view'] },
      { id: 'disputes', label: 'Disputes', icon: AlertTriangle, permissions: ['disputes.view'] },
      { id: 'support', label: 'Support Tickets', icon: Headphones, permissions: ['support.view'] },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    items: [
      { id: 'cms', label: 'Homepage CMS', icon: Palette, permissions: ['cms.edit'] },
      { id: 'promotions', label: 'Promotions', icon: Tags, permissions: ['promotions.view'] },
      { id: 'loyalty', label: 'Loyalty & Rewards', icon: Gift, permissions: ['promotions.view'] },
      { id: 'spinwheel', label: 'Spin Wheel', icon: Gift, permissions: ['promotions.edit'] },
      { id: 'spinwheel-codes', label: 'Spin Codes', icon: RotateCcw, permissions: ['promotions.edit'] },
      { id: 'email-campaigns', label: 'Email Campaigns', icon: Bell, permissions: ['notifications.send'] },
      { id: 'push-notifications', label: 'Push Notifications', icon: Bell, permissions: ['notifications.send'] },
    ],
  },
  {
    id: 'system',
    label: 'System',
    items: [
      { id: 'admin-management', label: 'Admin Team', icon: UserCog, permissions: ['admins.manage'] },
      { id: 'feature-flags', label: 'Features', icon: ToggleLeft, permissions: ['settings.edit'] },
      { id: 'audit-logs', label: 'Audit Logs', icon: History, permissions: ['security.audit'] },
      { id: 'settings', label: 'Settings', icon: Settings, permissions: ['settings.view'] },
    ],
  },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['main', 'commerce', 'users', 'marketing', 'system']);
  
  const { data: pendingReviewsCount } = usePendingReviewsCount();
  const { data: stats } = useAdvancedAnalytics('30d');
  const { data: myPermissions = [], isLoading: permissionsLoading } = useMyAdminPermissions();

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  // Check if user has permission for a section
  const hasPermission = (permissions?: string[]): boolean => {
    if (!permissions || permissions.length === 0) return true;
    // If permissions are still loading, show all (will validate on content render)
    if (permissionsLoading) return true;
    // Super admins with admin.* have all permissions
    if (myPermissions.includes('admin.*') || myPermissions.includes('*')) return true;
    // Check if user has any of the required permissions
    return permissions.some(p => myPermissions.includes(p));
  };

  // Filter navigation based on permissions
  const filteredNavGroups = useMemo(() => {
    return navGroups.map(group => ({
      ...group,
      items: group.items.filter(item => hasPermission(item.permissions)),
    })).filter(group => group.items.length > 0);
  }, [myPermissions, permissionsLoading]);

  // Check if current tab is accessible
  const canAccessCurrentTab = useMemo(() => {
    const sectionPerms = SECTION_PERMISSIONS[activeTab];
    return hasPermission(sectionPerms);
  }, [activeTab, myPermissions, permissionsLoading]);

  const NavItem = ({ item, isMobile = false }: { item: NavItem, isMobile?: boolean }) => {
    const isActive = activeTab === item.id;
    const hasAccess = hasPermission(item.permissions);
    
    if (!hasAccess) return null;
    
    return (
      <Button
        variant="ghost"
        className={cn(
          'w-full justify-start gap-3 h-10 px-3',
          isActive && 'bg-accent/10 text-accent border-l-2 border-accent rounded-l-none'
        )}
        onClick={() => {
          setActiveTab(item.id);
          if (isMobile) setMobileMenuOpen(false);
        }}
      >
        <item.icon className="w-4 h-4" />
        <span className="flex-1 text-left">{item.label}</span>
        {item.badge && pendingReviewsCount && pendingReviewsCount > 0 && (
          <Badge variant="destructive" className="text-[10px] h-5 px-1.5">
            {pendingReviewsCount}
          </Badge>
        )}
      </Button>
    );
  };

  const Sidebar = ({ isMobile = false }) => (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-secondary/50"
            autoComplete="off"
            autoFocus={false}
          />
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        {permissionsLoading ? (
          <div className="space-y-4 px-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredNavGroups.map((group) => {
              const filteredItems = group.items.filter(item =>
                item.label.toLowerCase().includes(searchQuery.toLowerCase())
              );
              if (filteredItems.length === 0 && searchQuery) return null;
              
              return (
                <Collapsible
                  key={group.id}
                  open={expandedGroups.includes(group.id)}
                  onOpenChange={() => toggleGroup(group.id)}
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
                    {group.label}
                    <ChevronDown className={cn(
                      'w-3 h-3 transition-transform',
                      expandedGroups.includes(group.id) && 'rotate-180'
                    )} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1 mt-1">
                    {(searchQuery ? filteredItems : group.items).map((item) => (
                      <NavItem key={item.id} item={item} isMobile={isMobile} />
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Bottom section */}
      <div className="p-4 border-t border-border space-y-3">
        {/* Permission indicator */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 text-xs text-muted-foreground">
                <Lock className="w-3 h-3" />
                <span>{myPermissions.length} permissions</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[300px]">
              <p className="font-medium mb-1">Your Permissions:</p>
              <p className="text-xs text-muted-foreground">
                {myPermissions.slice(0, 5).join(', ')}
                {myPermissions.length > 5 && ` +${myPermissions.length - 5} more`}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Button variant="outline" asChild className="w-full gap-2">
          <Link to="/">
            <ArrowLeft className="w-4 h-4" />
            Exit Admin Panel
          </Link>
        </Button>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-accent/10 to-primary/5">
          <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.user_metadata?.full_name || 'Admin'}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    // Check permission before rendering content
    if (!canAccessCurrentTab && !permissionsLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
            <Lock className="w-10 h-10 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground max-w-md mb-6">
            You don't have permission to access this section. Contact the admin owner to request access.
          </p>
          <Button onClick={() => setActiveTab('overview')}>
            Go to Dashboard
          </Button>
        </div>
      );
    }

    switch (activeTab) {
      case 'overview':
        return <EnhancedOverview />;
      case 'analytics':
        return <AdvancedAnalytics />;
      case 'vendors':
        return <VendorManagement />;
      case 'customers':
        return <EnhancedCustomerManagement />;
      case 'orders':
        return <EnhancedOrderManagement />;
      case 'products':
        return <ProductCatalog />;
      case 'categories':
        return <CategoryManager />;
      case 'reviews':
        return <ReviewModeration />;
      case 'payouts':
        return <PayoutManagement />;
      case 'support':
        return <SupportTicketManager />;
      case 'returns':
        return <ReturnManagement />;
      case 'disputes':
        return <DisputeManagement />;
      case 'promotions':
        return <PromotionsManager />;
      case 'loyalty':
        return <LoyaltyManagement />;
      case 'spinwheel':
        return <SpinWheelManager />;
      case 'spinwheel-codes':
        return <SpinWheelCodesManager />;
      case 'email-campaigns':
        return <NotificationCenter />;
      case 'push-notifications':
        return <AdminNotificationManager />;
      case 'cms':
        return <CMSManager />;
      case 'audit-logs':
        return <AuditLogViewer />;
      case 'feature-flags':
        return <FeatureFlagsManager />;
      case 'admin-management':
        return <AdminManagement />;
      case 'settings':
        return <SystemSettings />;
      default:
        return <EnhancedOverview />;
    }
  };

  // Calculate alerts count
  const alertsCount = (stats?.pendingVendors || 0) + (stats?.pendingPayouts || 0) + (stats?.lowStockProducts || 0) + (pendingReviewsCount || 0);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-[280px] border-r border-border bg-card/50 backdrop-blur-sm fixed left-0 top-0 bottom-0 z-40">
        {/* Logo */}
        <div className="p-4 border-b border-border">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center shadow-lg shadow-accent/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Odhra Admin</h1>
              <p className="text-xs text-muted-foreground">Control Center</p>
            </div>
          </Link>
        </div>
        <Sidebar />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-[280px]">
        {/* Header */}
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
          <div className="px-4 lg:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Mobile Menu */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] p-0">
                  <div className="p-4 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center">
                        <Shield className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h1 className="font-bold">Admin</h1>
                        <p className="text-xs text-muted-foreground">Control Center</p>
                      </div>
                    </div>
                  </div>
                  <Sidebar isMobile />
                </SheetContent>
              </Sheet>

              <Button variant="ghost" size="icon" asChild className="hidden sm:flex">
                <Link to="/">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
              </Button>

              {/* Page Title */}
              <div>
                <h1 className="font-bold text-lg capitalize">
                  {filteredNavGroups.flatMap(g => g.items).find(i => i.id === activeTab)?.label || 'Dashboard'}
                </h1>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  Manage your marketplace
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="w-5 h-5" />
                    {alertsCount > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full animate-pulse" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Admin Notifications</span>
                    {alertsCount > 0 && (
                      <Badge variant="destructive" className="text-xs">{alertsCount}</Badge>
                    )}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {hasPermission(['vendors.view']) && (stats?.pendingVendors || 0) > 0 && (
                    <DropdownMenuItem onClick={() => setSearchParams({ tab: 'vendors' })} className="cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center">
                          <Store className="w-4 h-4 text-yellow-500" />
                        </div>
                        <div>
                          <p className="font-medium">{stats?.pendingVendors} Pending Vendors</p>
                          <p className="text-xs text-muted-foreground">Awaiting approval</p>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  )}
                  {hasPermission(['finance.view']) && (stats?.pendingPayouts || 0) > 0 && (
                    <DropdownMenuItem onClick={() => setSearchParams({ tab: 'payouts' })} className="cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center">
                          <Wallet className="w-4 h-4 text-orange-500" />
                        </div>
                        <div>
                          <p className="font-medium">{stats?.pendingPayouts} Pending Payouts</p>
                          <p className="text-xs text-muted-foreground">Require processing</p>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  )}
                  {hasPermission(['products.view']) && (stats?.lowStockProducts || 0) > 0 && (
                    <DropdownMenuItem onClick={() => setSearchParams({ tab: 'products' })} className="cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        </div>
                        <div>
                          <p className="font-medium">{stats?.lowStockProducts} Low Stock Items</p>
                          <p className="text-xs text-muted-foreground">Need restocking</p>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  )}
                  {hasPermission(['reviews.view']) && pendingReviewsCount && pendingReviewsCount > 0 && (
                    <DropdownMenuItem onClick={() => setSearchParams({ tab: 'reviews' })} className="cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center">
                          <MessageSquare className="w-4 h-4 text-purple-500" />
                        </div>
                        <div>
                          <p className="font-medium">{pendingReviewsCount} Pending Reviews</p>
                          <p className="text-xs text-muted-foreground">Awaiting moderation</p>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  )}
                  {alertsCount === 0 && (
                    <div className="py-6 text-center text-muted-foreground">
                      <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No pending actions</p>
                    </div>
                  )}
                  <DropdownMenuSeparator />
                  {hasPermission(['notifications.send']) && (
                    <DropdownMenuItem onClick={() => setSearchParams({ tab: 'push-notifications' })} className="cursor-pointer justify-center text-accent">
                      Send Push Notification
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="hidden sm:flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium">{user?.user_metadata?.full_name || 'Admin'}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center text-white font-bold">
                  {(user?.user_metadata?.full_name || user?.email || 'A')[0].toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-4 lg:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
