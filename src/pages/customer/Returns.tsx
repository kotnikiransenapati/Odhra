import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useReturns } from '@/hooks/useReturns';
import { useAuth } from '@/contexts/AuthContext';
import { PageLoading } from '@/components/ui/LoadingSpinner';
import {
  ArrowLeft,
  RotateCcw,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  Search,
} from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'Pending Review', color: 'bg-warning/10 text-warning', icon: Clock },
  approved: { label: 'Approved', color: 'bg-success/10 text-success', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-destructive/10 text-destructive', icon: XCircle },
  pickup_scheduled: { label: 'Pickup Scheduled', color: 'bg-info/10 text-info', icon: Truck },
  picked_up: { label: 'Picked Up', color: 'bg-info/10 text-info', icon: Truck },
  received: { label: 'Received', color: 'bg-accent/10 text-accent', icon: Package },
  inspected: { label: 'Inspected', color: 'bg-accent/10 text-accent', icon: Search },
  refunded: { label: 'Refunded', color: 'bg-success/10 text-success', icon: CheckCircle },
  closed: { label: 'Closed', color: 'bg-muted text-muted-foreground', icon: XCircle },
};

export default function Returns() {
  const { user } = useAuth();
  const { data: returns, isLoading } = useReturns();

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center h-[60vh] px-4">
          <RotateCcw className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Login Required</h2>
          <Button asChild><Link to="/auth">Login / Sign Up</Link></Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24"><PageLoading text="Loading returns..." /></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-4">
        <div className="max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <Button variant="ghost" asChild className="mb-4">
              <Link to="/account" className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Back to Account
              </Link>
            </Button>
            <h1 className="text-display-sm font-bold">My Returns</h1>
            <p className="text-muted-foreground mt-1">Track your return and refund requests</p>
          </motion.div>

          {returns && returns.length > 0 ? (
            <div className="space-y-4">
              {returns.map((ret: any, i: number) => {
                const config = statusConfig[ret.status] || statusConfig.pending;
                const Icon = config.icon;
                return (
                  <motion.div
                    key={ret.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className="glass">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <p className="font-semibold">{ret.return_number}</p>
                            <p className="text-sm text-muted-foreground">
                              Created {format(new Date(ret.created_at), 'MMM dd, yyyy')}
                            </p>
                          </div>
                          <Badge className={config.color}>
                            <Icon className="w-3 h-3 mr-1" />
                            {config.label}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Reason: {ret.return_reason?.replace(/_/g, ' ')}
                          </span>
                          {ret.refund_amount && (
                            <span className="font-bold text-accent">{formatPrice(ret.refund_amount)}</span>
                          )}
                        </div>

                        {ret.rejected_reason && (
                          <div className="mt-3 p-3 rounded-lg bg-destructive/10 text-sm text-destructive">
                            Rejected: {ret.rejected_reason}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                <RotateCcw className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">No returns yet</h2>
              <p className="text-muted-foreground mb-8">You haven't made any return requests</p>
              <Button asChild><Link to="/orders">View Orders</Link></Button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
