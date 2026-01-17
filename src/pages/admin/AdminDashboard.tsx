import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  Headphones,
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
import { cn } from '@/lib/utils';

// Define navigation structure
const navGroups = [
  {
    id: 'main',
    label: 'Main',
    items: [
      { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  {
    id: 'commerce',
    label: 'Commerce',
    items: [
      { id: 'orders', label: 'Orders', icon: ShoppingCart },
      { id: 'products', label: 'Products', icon: Package },
      { id: 'categories', label: 'Categories', icon: FolderTree },
    ],
  },
  {
    id: 'users',
    label: 'Users & Vendors',
    items: [
      { id: 'vendors', label: 'Vendors', icon: Store },
      { id: 'customers', label: 'Customers', icon: Users },
      { id: 'reviews', label: 'Reviews', icon: MessageSquare, badge: true },
      { id: 'payouts', label: 'Payouts', icon: Wallet },
      { id: 'support', label: 'Support Tickets', icon: Headphones },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    items: [
      { id: 'cms', label: 'Homepage CMS', icon: Palette },
      { id: 'promotions', label: 'Promotions', icon: Tags },
      { id: 'spinwheel', label: 'Spin Wheel', icon: Gift },
      { id: 'spinwheel-codes', label: 'Spin Codes', icon: RotateCcw },
      { id: 'email-campaigns', label: 'Email Campaigns', icon: Bell },
      { id: 'push-notifications', label: 'Push Notifications', icon: Bell },
    ],
  },
  {
    id: 'system',
    label: 'System',
    items: [
      { id: 'settings', label: 'Settings', icon: Settings },
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

  const NavItem = ({ item, isMobile = false }: { item: typeof navGroups[0]['items'][0], isMobile?: boolean }) => {
    const isActive = activeTab === item.id;
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
      {/* Search - disabled auto-focus to prevent keyboard issues */}
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
            inputMode="none"
          />
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-4">
          {navGroups.map((group) => {
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
      </ScrollArea>

      {/* Bottom section with Exit button */}
      <div className="p-4 border-t border-border space-y-3">
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
      case 'promotions':
        return <PromotionsManager />;
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
      case 'settings':
        return <SystemSettings />;
      default:
        return <EnhancedOverview />;
    }
  };

  // Calculate alerts count
  const alertsCount = (stats?.pendingVendors || 0) + (stats?.pendingPayouts || 0) + (stats?.lowStockProducts || 0);

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
                  {navGroups.flatMap(g => g.items).find(i => i.id === activeTab)?.label || 'Dashboard'}
                </h1>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  Manage your marketplace
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full animate-pulse" />
              </Button>
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
