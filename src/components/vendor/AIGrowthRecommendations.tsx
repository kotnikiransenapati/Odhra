import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Lightbulb, 
  TrendingUp, 
  Package, 
  DollarSign, 
  Target, 
  Star,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Sparkles,
  BarChart3,
  Users,
  Clock,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';

interface Recommendation {
  id: string;
  type: 'pricing' | 'inventory' | 'performance' | 'growth' | 'urgent';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  action?: {
    label: string;
    link: string;
  };
  metric?: {
    label: string;
    value: string;
    change?: number;
  };
}

export function AIGrowthRecommendations() {
  const { user } = useAuth();

  const { data: vendor } = useQuery({
    queryKey: ['vendor-for-recommendations', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('vendors')
        .select('*')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const { data: recommendations, isLoading } = useQuery({
    queryKey: ['vendor-ai-recommendations', vendor?.id],
    queryFn: async () => {
      if (!vendor) return [];

      // Fetch vendor data for analysis
      const [productsRes, ordersRes, reviewsRes] = await Promise.all([
        supabase
          .from('products')
          .select('id, title, price, compare_at_price, stock, sold_count, view_count, avg_rating, low_stock_threshold')
          .eq('vendor_id', vendor.id),
        supabase
          .from('sub_orders')
          .select('*, order_items(*)')
          .eq('vendor_id', vendor.id)
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
        supabase
          .from('reviews')
          .select('rating, created_at, product_id')
          .in('product_id', (await supabase.from('products').select('id').eq('vendor_id', vendor.id)).data?.map(p => p.id) || []),
      ]);

      const products = productsRes.data || [];
      const orders = ordersRes.data || [];
      const reviews = reviewsRes.data || [];

      const recs: Recommendation[] = [];

      // 1. Low stock alerts
      const lowStockProducts = products.filter(p => p.stock > 0 && p.stock <= (p.low_stock_threshold || 10));
      if (lowStockProducts.length > 0) {
        recs.push({
          id: 'low-stock',
          type: 'urgent',
          title: `${lowStockProducts.length} Products Running Low`,
          description: `Restock ${lowStockProducts.map(p => p.title).slice(0, 2).join(', ')} to avoid stockouts and lost sales.`,
          impact: 'high',
          action: { label: 'Manage Inventory', link: '/vendor/products' },
        });
      }

      // 2. Out of stock products
      const outOfStock = products.filter(p => p.stock === 0);
      if (outOfStock.length > 0) {
        recs.push({
          id: 'out-of-stock',
          type: 'urgent',
          title: `${outOfStock.length} Products Out of Stock`,
          description: `You're losing potential sales. Consider restocking popular items.`,
          impact: 'high',
          action: { label: 'Restock Now', link: '/vendor/products' },
        });
      }

      // 3. Price optimization suggestions
      const underperforming = products.filter(p => 
        (p.view_count || 0) > 100 && (p.sold_count || 0) === 0
      );
      if (underperforming.length > 0) {
        recs.push({
          id: 'price-optimize',
          type: 'pricing',
          title: 'Price Optimization Opportunity',
          description: `${underperforming.length} products have high views but no sales. Consider adjusting prices or adding promotions.`,
          impact: 'medium',
          metric: {
            label: 'Potential Revenue',
            value: `₹${(underperforming.reduce((sum, p) => sum + p.price, 0) * 0.1).toLocaleString()}`,
          },
        });
      }

      // 4. Products without compare_at_price (no sale price)
      const noSalePrice = products.filter(p => !p.compare_at_price && p.price > 500);
      if (noSalePrice.length > 3) {
        recs.push({
          id: 'add-sale-price',
          type: 'pricing',
          title: 'Add Sale Prices to Boost Conversions',
          description: `${noSalePrice.length} products don't have sale pricing. Adding strikethrough prices can increase perceived value.`,
          impact: 'medium',
          action: { label: 'Edit Products', link: '/vendor/products' },
        });
      }

      // 5. High-rated products promotion
      const highRated = products.filter(p => (p.avg_rating || 0) >= 4.5 && (p.sold_count || 0) > 5);
      if (highRated.length > 0) {
        recs.push({
          id: 'promote-top',
          type: 'growth',
          title: 'Promote Your Top Performers',
          description: `${highRated.length} products have excellent ratings. Feature them prominently to drive more sales.`,
          impact: 'medium',
          metric: {
            label: 'Avg Rating',
            value: (highRated.reduce((sum, p) => sum + (p.avg_rating || 0), 0) / highRated.length).toFixed(1),
          },
        });
      }

      // 6. Low review products
      const lowReviewProducts = products.filter(p => (p.sold_count || 0) > 10 && !reviews.find(r => r.product_id === p.id));
      if (lowReviewProducts.length > 0) {
        recs.push({
          id: 'get-reviews',
          type: 'performance',
          title: 'Request Customer Reviews',
          description: `${lowReviewProducts.length} products have sales but no reviews. Encourage customers to leave feedback.`,
          impact: 'low',
        });
      }

      // 7. Recent performance
      const totalRevenue = orders.reduce((sum, o) => sum + o.total_amount, 0);
      if (orders.length > 0) {
        recs.push({
          id: 'performance-summary',
          type: 'performance',
          title: 'Monthly Performance Summary',
          description: `You've earned ₹${totalRevenue.toLocaleString()} from ${orders.length} orders this month. Keep up the great work!`,
          impact: 'low',
          metric: {
            label: 'This Month',
            value: `₹${totalRevenue.toLocaleString()}`,
          },
          action: { label: 'View Analytics', link: '/vendor/analytics' },
        });
      }

      // 8. Add more products suggestion
      if (products.length < 10) {
        recs.push({
          id: 'add-products',
          type: 'growth',
          title: 'Expand Your Catalog',
          description: `You only have ${products.length} products. Stores with 15+ products get 40% more visibility.`,
          impact: 'medium',
          action: { label: 'Add Products', link: '/vendor/products/new' },
        });
      }

      // Sort by impact
      const impactOrder = { high: 0, medium: 1, low: 2 };
      return recs.sort((a, b) => impactOrder[a.impact] - impactOrder[b.impact]);
    },
    enabled: !!vendor?.id,
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'urgent': return AlertTriangle;
      case 'pricing': return DollarSign;
      case 'inventory': return Package;
      case 'performance': return BarChart3;
      case 'growth': return TrendingUp;
      default: return Lightbulb;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'urgent': return 'text-red-500 bg-red-500/10';
      case 'pricing': return 'text-green-500 bg-green-500/10';
      case 'inventory': return 'text-orange-500 bg-orange-500/10';
      case 'performance': return 'text-blue-500 bg-blue-500/10';
      case 'growth': return 'text-purple-500 bg-purple-500/10';
      default: return 'text-accent bg-accent/10';
    }
  };

  const getImpactBadge = (impact: string) => {
    switch (impact) {
      case 'high': return <Badge variant="destructive">High Impact</Badge>;
      case 'medium': return <Badge variant="default">Medium Impact</Badge>;
      case 'low': return <Badge variant="secondary">Low Impact</Badge>;
      default: return null;
    }
  };

  if (isLoading) {
    return (
      <Card className="glass">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-4" />
            <p className="text-muted-foreground">Analyzing your store data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return (
      <Card className="glass">
        <CardContent className="py-12 text-center">
          <Sparkles className="w-12 h-12 text-accent mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">You're Doing Great!</h3>
          <p className="text-muted-foreground">No recommendations at this time. Keep up the excellent work!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent" />
          AI Growth Recommendations
        </CardTitle>
        <CardDescription>
          Personalized suggestions to grow your store
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {recommendations.map((rec, i) => {
          const Icon = getTypeIcon(rec.type);
          const colorClasses = getTypeColor(rec.type);
          
          return (
            <motion.div
              key={rec.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl ${colorClasses} flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold">{rec.title}</h4>
                    {getImpactBadge(rec.impact)}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{rec.description}</p>
                  
                  <div className="flex items-center gap-4">
                    {rec.metric && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">{rec.metric.label}:</span>
                        <span className="font-semibold">{rec.metric.value}</span>
                      </div>
                    )}
                    
                    {rec.action && (
                      <Button variant="link" size="sm" className="p-0 h-auto" asChild>
                        <Link to={rec.action.link}>
                          {rec.action.label}
                          <ArrowRight className="w-3 h-3 ml-1" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}
