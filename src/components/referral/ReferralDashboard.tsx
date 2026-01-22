import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  useReferralCode, 
  useGenerateReferralCode, 
  useReferralStats,
  useMyReferrals,
  REFERRAL_CONFIG 
} from '@/hooks/useReferrals';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Users, 
  Gift, 
  Copy, 
  Share2, 
  CheckCircle,
  Clock,
  TrendingUp,
  Loader2,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

export function ReferralDashboard() {
  const { user } = useAuth();
  const { data: referralCode, isLoading: codeLoading } = useReferralCode();
  const { data: stats, isLoading: statsLoading } = useReferralStats();
  const { data: referrals } = useMyReferrals();
  const generateCode = useGenerateReferralCode();
  const [copied, setCopied] = useState(false);

  if (!user) return null;

  const referralLink = referralCode?.code 
    ? `${window.location.origin}/auth?ref=${referralCode.code}`
    : null;

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!referralLink) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Odhra!',
          text: `Use my referral code ${referralCode?.code} and get ${REFERRAL_CONFIG.referredReward} bonus points on signup!`,
          url: referralLink,
        });
      } catch (err) {
        // User cancelled share
      }
    } else {
      handleCopy(referralLink);
    }
  };

  const isLoading = codeLoading || statsLoading;

  return (
    <div className="space-y-6">
      {/* Referral Card */}
      <Card className="overflow-hidden bg-gradient-to-br from-accent to-accent/80 text-accent-foreground border-0">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Gift className="w-6 h-6" />
                Refer & Earn
              </h3>
              <p className="text-accent-foreground/80 text-sm mt-1">
                Invite friends and earn rewards together
              </p>
            </div>
            <Badge variant="secondary" className="bg-white/20 text-white">
              <Sparkles className="w-3 h-3 mr-1" />
              {REFERRAL_CONFIG.referrerReward} pts per referral
            </Badge>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : referralCode?.code ? (
            <>
              <div className="bg-white/10 rounded-xl p-4 mb-4">
                <p className="text-sm text-accent-foreground/70 mb-2">Your referral code</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-2xl font-mono font-bold tracking-wider">
                    {referralCode.code}
                  </code>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="bg-white/20 hover:bg-white/30 text-white border-0"
                    onClick={() => handleCopy(referralCode.code)}
                  >
                    {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <Button 
                className="w-full bg-white text-accent hover:bg-white/90 gap-2"
                onClick={handleShare}
              >
                <Share2 className="w-4 h-4" />
                Share with Friends
              </Button>
            </>
          ) : (
            <Button 
              className="w-full bg-white text-accent hover:bg-white/90 gap-2"
              onClick={() => generateCode.mutate()}
              disabled={generateCode.isPending}
            >
              {generateCode.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Gift className="w-4 h-4" />
                  Get Your Referral Code
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Referrals', value: stats.totalReferrals, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { label: 'Successful', value: stats.successfulReferrals, icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10' },
            { label: 'Pending', value: stats.pendingReferrals, icon: Clock, color: 'text-orange-500', bg: 'bg-orange-500/10' },
            { label: 'Points Earned', value: stats.totalEarnings, icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-500/10' },
          ].map((stat) => (
            <Card key={stat.label} className="glass">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* How it works */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-lg">How it works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: 1, title: 'Share your code', desc: 'Send your unique code to friends' },
              { step: 2, title: 'Friend signs up', desc: 'They create an account using your code' },
              { step: 3, title: 'Both earn rewards', desc: `You get ${REFERRAL_CONFIG.referrerReward} pts, they get ${REFERRAL_CONFIG.referredReward} pts!` },
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold shrink-0">
                  {item.step}
                </div>
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Referral History */}
      {referrals && referrals.length > 0 && (
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-lg">Your Referrals</CardTitle>
            <CardDescription>Track your referral progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {referrals.map((referral) => (
                <motion.div
                  key={referral.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      referral.status === 'completed' ? 'bg-green-500/10' : 'bg-orange-500/10'
                    }`}>
                      {referral.status === 'completed' ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <Clock className="w-4 h-4 text-orange-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">Referral #{referral.id.slice(0, 8)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(referral.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={referral.status === 'completed' ? 'default' : 'secondary'}>
                      {referral.status}
                    </Badge>
                    {referral.status === 'completed' && (
                      <p className="text-xs text-green-500 mt-1">+{referral.referrer_reward} pts</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
