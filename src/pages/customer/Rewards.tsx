import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { haptic } from '@/lib/haptics';
import { Navbar } from '@/components/layout/Navbar';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { LoyaltyCard } from '@/components/loyalty/LoyaltyCard';
import { DailyCheckin } from '@/components/loyalty/DailyCheckin';
import { AchievementGrid } from '@/components/loyalty/AchievementBadge';
import { ReferralDashboard } from '@/components/referral/ReferralDashboard';
import { ChallengesCard } from '@/components/loyalty/ChallengesCard';
import { PointsRedemptionCard } from '@/components/loyalty/PointsRedemptionCard';
import { LeaderboardCard } from '@/components/loyalty/LeaderboardCard';
import { 
  useLoyaltyPoints, 
  useLoyaltyTransactions,
  useBadgeDefinitions,
  useUserAchievements,
  TIER_BENEFITS
} from '@/hooks/useLoyalty';
import { PageLoading } from '@/components/ui/LoadingSpinner';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Gift,
  Trophy,
  Users,
  History,
  Sparkles,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Star,
  Flame,
  Percent,
  Truck,
  Target,
  Medal,
} from 'lucide-react';

export default function CustomerRewards() {
  const { user } = useAuth();
  const { data: loyalty, isLoading: loyaltyLoading } = useLoyaltyPoints();
  const { data: transactions, isLoading: transactionsLoading } = useLoyaltyTransactions(50);
  const { data: badges } = useBadgeDefinitions();
  const { data: achievements } = useUserAchievements();

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center h-[60vh] px-4">
          <Trophy className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Login Required</h2>
          <p className="text-muted-foreground mb-6">Please login to view your rewards</p>
          <Button asChild>
            <Link to="/auth">Login / Sign Up</Link>
          </Button>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  if (loyaltyLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24">
          <PageLoading text="Loading rewards..." />
        </div>
        <BottomNavigation />
      </div>
    );
  }

  const tier = loyalty?.tier || 'bronze';
  const benefits = TIER_BENEFITS[tier];

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />

      <div className="pt-24 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Button variant="ghost" asChild className="mb-4">
              <Link to="/account" className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Back to Account
              </Link>
            </Button>
            <h1 className="text-display-sm md:text-display-md font-bold">Rewards Center</h1>
            <p className="text-muted-foreground mt-1">Earn points, unlock perks & exclusive rewards</p>
          </motion.div>

          {/* Loyalty Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <LoyaltyCard showActions={false} />
          </motion.div>

          {/* Tabs */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6">
              <TabsTrigger value="overview" className="gap-1.5">
                <Gift className="w-4 h-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="challenges" className="gap-1.5">
                <Target className="w-4 h-4" />
                <span className="hidden sm:inline">Challenges</span>
              </TabsTrigger>
              <TabsTrigger value="redeem" className="gap-1.5">
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">Redeem</span>
              </TabsTrigger>
              <TabsTrigger value="achievements" className="gap-1.5">
                <Trophy className="w-4 h-4" />
                <span className="hidden sm:inline">Badges</span>
              </TabsTrigger>
              <TabsTrigger value="referrals" className="gap-1.5">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Referrals</span>
              </TabsTrigger>
              <TabsTrigger value="leaderboard" className="gap-1.5">
                <Medal className="w-4 h-4" />
                <span className="hidden sm:inline">Ranks</span>
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Daily Checkin */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <DailyCheckin variant="card" />
              </motion.div>

              {/* Tier Benefits */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 text-card-foreground">
                      <Sparkles className="w-5 h-5 text-accent" />
                      Your {tier.charAt(0).toUpperCase() + tier.slice(1)} Benefits
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <TrendingUp className="w-5 h-5 text-accent" />
                        <div>
                          <p className="text-lg font-bold text-card-foreground">{benefits.pointsMultiplier}x</p>
                          <p className="text-xs text-muted-foreground">Points Multiplier</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <Truck className="w-5 h-5 text-accent" />
                        <div>
                          <p className="text-lg font-bold text-card-foreground">
                             {benefits.freeShippingThreshold === 0 ? 'Free' : `₹${benefits.freeShippingThreshold}+`}
                          </p>
                          <p className="text-xs text-muted-foreground">Free Shipping</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <Percent className="w-5 h-5 text-accent" />
                        <div>
                          <p className="text-lg font-bold text-card-foreground">{benefits.exclusiveDeals ? 'Yes' : 'No'}</p>
                          <p className="text-xs text-muted-foreground">Exclusive Deals</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <Gift className="w-5 h-5 text-accent" />
                        <div>
                          <p className="text-lg font-bold text-card-foreground">+{benefits.birthdayBonus}</p>
                          <p className="text-xs text-muted-foreground">Birthday Bonus</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* How to Earn */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="text-lg text-card-foreground">How to Earn Points</CardTitle>
                    <CardDescription>Multiple ways to grow your rewards</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      {[
                        { icon: ShoppingBag, action: 'Make a purchase', reward: '1 point per ₹10 spent', multiplier: true },
                        { icon: Star, action: 'Write a review', reward: '+20 points' },
                        { icon: Users, action: 'Refer a friend', reward: '+100 points' },
                        { icon: Flame, action: 'Daily check-in', reward: '+5-25 points (streak bonus)' },
                      ].map((item) => (
                        <div key={item.action} className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
                          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                            <item.icon className="w-5 h-5 text-accent" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-foreground">{item.action}</p>
                            <p className="text-sm text-muted-foreground">{item.reward}</p>
                          </div>
                          {item.multiplier && (
                            <span className="text-xs bg-accent/10 text-accent px-2 py-1 rounded-full">
                              {benefits.pointsMultiplier}x multiplier
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Challenges Tab */}
            <TabsContent value="challenges">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <ChallengesCard />
              </motion.div>
            </TabsContent>

            {/* Redeem Points Tab */}
            <TabsContent value="redeem">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <PointsRedemptionCard />
              </motion.div>
            </TabsContent>

            {/* Achievements Tab */}
            <TabsContent value="achievements">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-accent" />
                      Achievement Badges
                    </CardTitle>
                    <CardDescription>
                      Collect badges by completing challenges • {achievements?.length || 0}/{badges?.length || 0} unlocked
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {badges && achievements && (
                      <AchievementGrid achievements={achievements} allBadges={badges} />
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Referrals Tab */}
            <TabsContent value="referrals">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <ReferralDashboard />
              </motion.div>
            </TabsContent>

            {/* Leaderboard Tab */}
            <TabsContent value="leaderboard">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <LeaderboardCard />
              </motion.div>
            </TabsContent>

            {/* History Tab - Keep in dropdown on mobile, show as link */}
            <TabsContent value="history">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <History className="w-5 h-5 text-accent" />
                      Points History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {transactionsLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <PageLoading text="Loading history..." />
                      </div>
                    ) : transactions && transactions.length > 0 ? (
                      <div className="space-y-3">
                        {transactions.map((tx) => (
                          <div
                            key={tx.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                tx.points > 0 ? 'bg-success/10' : 'bg-destructive/10'
                              }`}>
                                {tx.points > 0 ? (
                                  <TrendingUp className="w-4 h-4 text-success" />
                                ) : (
                                  <TrendingDown className="w-4 h-4 text-destructive" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-sm">{tx.description || tx.source}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(tx.created_at), 'MMM d, yyyy • h:mm a')}
                                </p>
                              </div>
                            </div>
                            <span className={`font-bold ${tx.points > 0 ? 'text-success' : 'text-destructive'}`}>
                              {tx.points > 0 ? '+' : ''}{tx.points}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No transactions yet</p>
                        <p className="text-sm">Start earning points by making purchases!</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
}
