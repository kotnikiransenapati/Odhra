import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Users, 
  Store, 
  Package, 
  ShoppingCart, 
  BarChart3, 
  Settings,
  Bell,
  ArrowLeft,
  TrendingUp,
  DollarSign,
  UserCheck,
  AlertTriangle
} from 'lucide-react';

const stats = [
  { label: 'Total Revenue', value: '₹12,45,000', change: '+12.5%', icon: DollarSign, positive: true },
  { label: 'Total Orders', value: '1,234', change: '+8.2%', icon: ShoppingCart, positive: true },
  { label: 'Active Vendors', value: '156', change: '+5', icon: Store, positive: true },
  { label: 'Pending Approvals', value: '23', change: '3 urgent', icon: AlertTriangle, positive: false },
];

const quickActions = [
  { label: 'Manage Users', icon: Users, href: '/admin/users' },
  { label: 'Manage Vendors', icon: Store, href: '/admin/vendors' },
  { label: 'All Products', icon: Package, href: '/admin/products' },
  { label: 'Orders', icon: ShoppingCart, href: '/admin/orders' },
  { label: 'Analytics', icon: BarChart3, href: '/admin/analytics' },
  { label: 'Settings', icon: Settings, href: '/admin/settings' },
];

export default function AdminDashboard() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/"><ArrowLeft className="w-5 h-5" /></Link>
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <LayoutDashboard className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h1 className="font-bold text-lg">Admin Dashboard</h1>
                <p className="text-xs text-muted-foreground">Odhra Control Center</p>
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

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold mb-2">
            Welcome back, {user?.user_metadata?.full_name?.split(' ')[0] || 'Admin'}!
          </h2>
          <p className="text-muted-foreground">Here's what's happening with Odhra today.</p>
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

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {quickActions.map((action, i) => (
              <Link
                key={action.label}
                to={action.href}
                className="glass rounded-xl p-4 text-center hover:shadow-lg hover:bg-secondary/50 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-accent/20 transition-colors">
                  <action.icon className="w-6 h-6 text-accent" />
                </div>
                <p className="text-sm font-medium">{action.label}</p>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Placeholder for more content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 glass rounded-2xl p-8 text-center"
        >
          <TrendingUp className="w-12 h-12 text-accent mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Analytics & Reports</h3>
          <p className="text-muted-foreground max-w-md mx-auto mb-4">
            Full analytics dashboard with sales reports, vendor performance, and customer insights coming soon.
          </p>
          <Button variant="outline" className="btn-press">View Demo Analytics</Button>
        </motion.div>
      </main>
    </div>
  );
}
