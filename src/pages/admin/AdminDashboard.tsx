import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { AdminOverview } from '@/components/admin/AdminOverview';
import { VendorManagement } from '@/components/admin/VendorManagement';
import { OrderManagement } from '@/components/admin/OrderManagement';
import { PayoutManagement } from '@/components/admin/PayoutManagement';
import { ReviewModeration } from '@/components/admin/ReviewModeration';
import { usePendingReviewsCount } from '@/hooks/useAdmin';
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
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';

const tabs = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'vendors', label: 'Vendors', icon: Store },
  { id: 'orders', label: 'Orders', icon: ShoppingCart },
  { id: 'reviews', label: 'Reviews', icon: MessageSquare },
  { id: 'payouts', label: 'Payouts', icon: Wallet },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: pendingReviewsCount } = usePendingReviewsCount();

  const Sidebar = ({ isMobile = false }) => (
    <div className={`${isMobile ? 'p-4' : 'p-6'} space-y-2`}>
      {tabs.map((tab) => (
        <Button
          key={tab.id}
          variant={activeTab === tab.id ? 'secondary' : 'ghost'}
          className={`w-full justify-start gap-3 ${activeTab === tab.id ? 'bg-accent/10 text-accent' : ''}`}
          onClick={() => {
            setActiveTab(tab.id);
            if (isMobile) setMobileMenuOpen(false);
          }}
        >
          <tab.icon className="w-5 h-5" />
          {tab.label}
          {tab.id === 'reviews' && pendingReviewsCount && pendingReviewsCount > 0 && (
            <Badge variant="destructive" className="ml-auto text-xs">
              {pendingReviewsCount}
            </Badge>
          )}
        </Button>
      ))}
      <div className="pt-4 border-t border-border mt-4">
        <Button variant="ghost" className="w-full justify-start gap-3" asChild>
          <Link to="/admin/settings">
            <Settings className="w-5 h-5" />
            Settings
          </Link>
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] p-0">
                <div className="p-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                      <LayoutDashboard className="w-5 h-5 text-accent" />
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
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <LayoutDashboard className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h1 className="font-bold text-lg">Admin Dashboard</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">Odhra Control Center</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
            </Button>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{user?.user_metadata?.full_name || 'Admin'}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-[260px] border-r border-border min-h-[calc(100vh-73px)] sticky top-[73px]">
          <Sidebar />
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-8">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'overview' && <AdminOverview />}
            {activeTab === 'vendors' && <VendorManagement />}
            {activeTab === 'orders' && <OrderManagement />}
            {activeTab === 'reviews' && <ReviewModeration />}
            {activeTab === 'payouts' && <PayoutManagement />}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
