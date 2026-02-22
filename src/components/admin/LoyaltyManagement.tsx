import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crown,
  Trophy,
  Users,
  Star,
  Gift,
  TrendingUp,
  Edit3,
  Save,
  X,
  Plus,
  Trash2,
  Medal,
  Flame,
  Heart,
  ShoppingBag,
  MessageSquare,
  Wallet,
  Diamond,
  Zap,
  Award,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Icon mapping for badges
const iconMap: Record<string, React.ElementType> = {
  ShoppingBag,
  Heart,
  Crown,
  MessageSquare,
  Star,
  Users,
  Trophy,
  Wallet,
  Diamond,
  Flame,
  Zap,
  Gift,
  Medal,
  Award,
};

interface BadgeDefinition {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  category: string | null;
  criteria: unknown;
  points_reward: number | null;
  is_active: boolean | null;
  sort_order: number | null;
  created_at?: string | null;
}

interface ReferralLeaderboardEntry {
  user_id: string;
  code: string;
  total_referrals: number;
  successful_referrals: number;
  total_earnings: number;
  profile?: {
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

interface LoyaltyStats {
  totalMembers: number;
  activeMembers: number;
  totalPointsIssued: number;
  totalPointsRedeemed: number;
  tierDistribution: Record<string, number>;
}

export function LoyaltyManagement() {
  const queryClient = useQueryClient();
  const [editingBadge, setEditingBadge] = useState<BadgeDefinition | null>(null);
  const [showBadgeDialog, setShowBadgeDialog] = useState(false);
  const [newBadge, setNewBadge] = useState<Partial<BadgeDefinition>>({
    name: '',
    description: '',
    icon: 'Star',
    category: 'general',
    points_reward: 50,
    is_active: true,
    sort_order: 0,
  });

  // Fetch loyalty statistics
  const { data: stats } = useQuery<LoyaltyStats>({
    queryKey: ['loyalty-stats'],
    queryFn: async () => {
      // Get total members
      const { count: totalMembers } = await supabase
        .from('loyalty_points')
        .select('*', { count: 'exact', head: true });

      // Get active members (checked in within last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { count: activeMembers } = await supabase
        .from('loyalty_points')
        .select('*', { count: 'exact', head: true })
        .gte('last_checkin_at', thirtyDaysAgo.toISOString());

      // Get points stats
      const { data: earnedPoints } = await supabase
        .from('loyalty_transactions')
        .select('points')
        .eq('transaction_type', 'earn');

      const { data: redeemedPoints } = await supabase
        .from('loyalty_transactions')
        .select('points')
        .eq('transaction_type', 'redeem');

      const totalPointsIssued = earnedPoints?.reduce((acc, t) => acc + t.points, 0) || 0;
      const totalPointsRedeemed = Math.abs(redeemedPoints?.reduce((acc, t) => acc + t.points, 0) || 0);

      // Get tier distribution
      const { data: tierData } = await supabase
        .from('loyalty_points')
        .select('tier');

      const tierDistribution = tierData?.reduce((acc, t) => {
        const tier = t.tier || 'bronze';
        acc[tier] = (acc[tier] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      return {
        totalMembers: totalMembers || 0,
        activeMembers: activeMembers || 0,
        totalPointsIssued,
        totalPointsRedeemed,
        tierDistribution,
      };
    },
  });

  // Fetch badge definitions
  const { data: badgesData } = useQuery({
    queryKey: ['badge-definitions-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('badge_definitions')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data || [];
    },
  });
  const badges = (badgesData || []) as BadgeDefinition[];

  // Fetch referral leaderboard
  const { data: referralLeaderboard = [] } = useQuery<ReferralLeaderboardEntry[]>({
    queryKey: ['referral-leaderboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('referral_codes')
        .select('user_id, code, total_referrals, successful_referrals, total_earnings')
        .eq('is_active', true)
        .order('successful_referrals', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Fetch profiles for each user
      const userIds = data.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds);

      return data.map(entry => ({
        ...entry,
        profile: profiles?.find(p => p.id === entry.user_id),
      }));
    },
  });

  // Fetch top loyalty members
  const { data: topMembers = [] } = useQuery({
    queryKey: ['top-loyalty-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loyalty_points')
        .select('user_id, points, lifetime_points, tier, streak_days')
        .order('lifetime_points', { ascending: false })
        .limit(20);

      if (error) throw error;

      const userIds = data.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds);

      return data.map(entry => ({
        ...entry,
        profile: profiles?.find(p => p.id === entry.user_id),
      }));
    },
  });

  // Update badge mutation
  const updateBadge = useMutation({
    mutationFn: async (badge: Partial<BadgeDefinition> & { id: string }) => {
      const { error } = await supabase
        .from('badge_definitions')
        .update({
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
          category: badge.category,
          points_reward: badge.points_reward,
          is_active: badge.is_active,
          sort_order: badge.sort_order,
        })
        .eq('id', badge.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['badge-definitions-admin'] });
      toast.success('Badge updated successfully');
      setEditingBadge(null);
    },
    onError: () => {
      toast.error('Failed to update badge');
    },
  });

  // Create badge mutation
  const createBadge = useMutation({
    mutationFn: async (badge: Partial<BadgeDefinition>) => {
      const id = badge.name?.toLowerCase().replace(/\s+/g, '_') || `badge_${Date.now()}`;
      const { error } = await supabase
        .from('badge_definitions')
        .insert({
          id,
          name: badge.name || 'New Badge',
          description: badge.description,
          icon: badge.icon || 'Star',
          category: badge.category || 'general',
          points_reward: badge.points_reward || 50,
          is_active: badge.is_active ?? true,
          sort_order: badge.sort_order || badges.length,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['badge-definitions-admin'] });
      toast.success('Badge created successfully');
      setShowBadgeDialog(false);
      setNewBadge({
        name: '',
        description: '',
        icon: 'Star',
        category: 'general',
        points_reward: 50,
        is_active: true,
        sort_order: 0,
      });
    },
    onError: () => {
      toast.error('Failed to create badge');
    },
  });

  // Delete badge mutation
  const deleteBadge = useMutation({
    mutationFn: async (badgeId: string) => {
      const { error } = await supabase
        .from('badge_definitions')
        .delete()
        .eq('id', badgeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['badge-definitions-admin'] });
      toast.success('Badge deleted');
    },
    onError: () => {
      toast.error('Failed to delete badge');
    },
  });

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const tierColors: Record<string, string> = {
    bronze: 'bg-warning',
    silver: 'bg-muted-foreground',
    gold: 'bg-warning',
    platinum: 'bg-accent',
    diamond: 'bg-info',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Crown className="w-6 h-6 text-accent" />
            Loyalty & Rewards Management
          </h2>
          <p className="text-muted-foreground">
            Manage loyalty tiers, badges, and view referral analytics
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-accent/10">
                  <Users className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.totalMembers || 0}</p>
                  <p className="text-xs text-muted-foreground">Total Members</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-success/10">
                  <TrendingUp className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.activeMembers || 0}</p>
                  <p className="text-xs text-muted-foreground">Active (30d)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-warning/10">
                  <Star className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{(stats?.totalPointsIssued || 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Points Issued</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-accent/10">
                  <Gift className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{(stats?.totalPointsRedeemed || 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Points Redeemed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Tier Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Medal className="w-5 h-5" />
            Tier Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 flex-wrap">
            {['bronze', 'silver', 'gold', 'platinum', 'diamond'].map((tier) => (
              <div key={tier} className="flex items-center gap-2">
                <div className={cn('w-4 h-4 rounded-full', tierColors[tier])} />
                <span className="capitalize font-medium">{tier}</span>
                <Badge variant="secondary">{stats?.tierDistribution[tier] || 0}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="badges" className="space-y-6">
        <TabsList>
          <TabsTrigger value="badges" className="gap-2">
            <Award className="w-4 h-4" />
            Badge Definitions
          </TabsTrigger>
          <TabsTrigger value="referrals" className="gap-2">
            <Users className="w-4 h-4" />
            Referral Leaderboard
          </TabsTrigger>
          <TabsTrigger value="members" className="gap-2">
            <Trophy className="w-4 h-4" />
            Top Members
          </TabsTrigger>
        </TabsList>

        {/* Badges Tab */}
        <TabsContent value="badges">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Achievement Badges</CardTitle>
                <CardDescription>Configure badges that users can earn</CardDescription>
              </div>
              <Button onClick={() => setShowBadgeDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Badge
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {badges.map((badge) => {
                  const IconComponent = iconMap[badge.icon || 'Star'] || Star;
                  const isEditing = editingBadge?.id === badge.id;

                  return (
                    <motion.div
                      key={badge.id}
                      layout
                      className={cn(
                        'p-4 rounded-xl border transition-all',
                        badge.is_active ? 'bg-card' : 'bg-muted/50 opacity-60',
                        isEditing && 'ring-2 ring-accent'
                      )}
                    >
                      {isEditing ? (
                        <div className="space-y-3">
                          <Input
                            value={editingBadge.name}
                            onChange={(e) => setEditingBadge({ ...editingBadge, name: e.target.value })}
                            placeholder="Badge name"
                          />
                          <Textarea
                            value={editingBadge.description || ''}
                            onChange={(e) => setEditingBadge({ ...editingBadge, description: e.target.value })}
                            placeholder="Description"
                            rows={2}
                          />
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={editingBadge.points_reward || 0}
                              onChange={(e) => setEditingBadge({ ...editingBadge, points_reward: parseInt(e.target.value) })}
                              className="w-24"
                            />
                            <span className="text-sm text-muted-foreground">points</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={editingBadge.is_active ?? true}
                                onCheckedChange={(checked) => setEditingBadge({ ...editingBadge, is_active: checked })}
                              />
                              <Label>Active</Label>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingBadge(null)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => updateBadge.mutate(editingBadge)}
                                disabled={updateBadge.isPending}
                              >
                                <Save className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between mb-3">
                            <div className="p-2.5 rounded-xl bg-accent/10">
                              <IconComponent className="w-5 h-5 text-accent" />
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingBadge(badge)}
                              >
                                <Edit3 className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => deleteBadge.mutate(badge.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          <h4 className="font-semibold">{badge.name}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-2">{badge.description}</p>
                          <div className="flex items-center gap-2 mt-3">
                            <Badge variant="secondary">{badge.points_reward} pts</Badge>
                            <Badge variant="outline" className="capitalize">{badge.category}</Badge>
                          </div>
                        </>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Referrals Tab */}
        <TabsContent value="referrals">
          <Card>
            <CardHeader>
              <CardTitle>Referral Leaderboard</CardTitle>
              <CardDescription>Top referrers by successful referrals</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Successful</TableHead>
                    <TableHead className="text-right">Earnings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referralLeaderboard.map((entry, index) => (
                    <TableRow key={entry.user_id}>
                      <TableCell>
                        {index < 3 ? (
                          <div className={cn(
                             'w-8 h-8 rounded-full flex items-center justify-center font-bold text-primary-foreground',
                            index === 0 && 'bg-warning',
                            index === 1 && 'bg-muted-foreground',
                            index === 2 && 'bg-warning'
                          )}>
                            {index + 1}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">{index + 1}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                            {entry.profile?.avatar_url ? (
                              <img src={entry.profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                              <span className="font-semibold text-accent">
                                {(entry.profile?.full_name || entry.profile?.email || '?')[0].toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{entry.profile?.full_name || 'Anonymous'}</p>
                            <p className="text-xs text-muted-foreground">{entry.profile?.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="px-2 py-1 rounded bg-muted text-sm">{entry.code}</code>
                      </TableCell>
                      <TableCell className="text-right">{entry.total_referrals}</TableCell>
                      <TableCell className="text-right font-semibold text-success">
                        {entry.successful_referrals}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {entry.total_earnings} pts
                      </TableCell>
                    </TableRow>
                  ))}
                  {referralLeaderboard.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No referral data yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Members Tab */}
        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle>Top Loyalty Members</CardTitle>
              <CardDescription>Members with highest lifetime points</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead className="text-right">Current Points</TableHead>
                    <TableHead className="text-right">Lifetime Points</TableHead>
                    <TableHead className="text-right">Streak</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topMembers.map((member, index) => (
                    <TableRow key={member.user_id}>
                      <TableCell>
                        {index < 3 ? (
                          <div className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center font-bold text-primary-foreground',
                            index === 0 && 'bg-warning',
                            index === 1 && 'bg-muted-foreground',
                            index === 2 && 'bg-warning'
                          )}>
                            {index + 1}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">{index + 1}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                            {member.profile?.avatar_url ? (
                              <img src={member.profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                              <span className="font-semibold text-accent">
                                {(member.profile?.full_name || member.profile?.email || '?')[0].toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{member.profile?.full_name || 'Anonymous'}</p>
                            <p className="text-xs text-muted-foreground">{member.profile?.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(tierColors[member.tier || 'bronze'], 'text-primary-foreground capitalize')}>
                          {member.tier || 'bronze'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{member.points?.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-semibold text-accent">
                        {member.lifetime_points?.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {(member.streak_days || 0) > 0 && (
                          <Badge variant="secondary" className="gap-1">
                            <Flame className="w-3 h-3" />
                            {member.streak_days}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {topMembers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No loyalty members yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Badge Dialog */}
      <Dialog open={showBadgeDialog} onOpenChange={setShowBadgeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Badge</DialogTitle>
            <DialogDescription>Add a new achievement badge for users to earn</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Badge Name</Label>
              <Input
                value={newBadge.name}
                onChange={(e) => setNewBadge({ ...newBadge, name: e.target.value })}
                placeholder="e.g., Super Shopper"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newBadge.description || ''}
                onChange={(e) => setNewBadge({ ...newBadge, description: e.target.value })}
                placeholder="What does the user need to do to earn this?"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Icon</Label>
                <Select
                  value={newBadge.icon || 'Star'}
                  onValueChange={(v) => setNewBadge({ ...newBadge, icon: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(iconMap).map((icon) => (
                      <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={newBadge.category || 'general'}
                  onValueChange={(v) => setNewBadge({ ...newBadge, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="shopping">Shopping</SelectItem>
                    <SelectItem value="engagement">Engagement</SelectItem>
                    <SelectItem value="social">Social</SelectItem>
                    <SelectItem value="spending">Spending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Points Reward</Label>
              <Input
                type="number"
                value={newBadge.points_reward || 0}
                onChange={(e) => setNewBadge({ ...newBadge, points_reward: parseInt(e.target.value) })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBadgeDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createBadge.mutate(newBadge)}
              disabled={!newBadge.name || createBadge.isPending}
            >
              Create Badge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
